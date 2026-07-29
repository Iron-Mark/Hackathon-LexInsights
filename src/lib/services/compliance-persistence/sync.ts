/**
 * Dual-write sync orchestration for compliance reports (PRD P0-1).
 *
 * Pure core: every function takes the repository and a small state-access
 * seam, so the logic is unit-testable with fakes and free of React/store
 * imports. The browser binding that wires these to the zustand stores lives in
 * src/lib/store/compliance-server-sync.ts.
 *
 * Model mapping: the client store keeps one report lineage (an append-only
 * ComplianceVersion[] array). Server-side that lineage is one
 * compliance_reports row (kept at the latest saved content) plus one
 * report_versions row per saved version and normalized report_findings rows
 * for the latest analysis. IndexedDB remains the local source of truth; a
 * failed server write never blocks the local save.
 */

import type { ComplianceReportRepository } from './repository'
import type { ComplianceReportRecord, NewReportFinding, ReportVersionRecord } from './types'
import type { FindingSeed } from './findings-extractor'

/**
 * Client-side linkage state between the local version store and the server
 * rows: which server report the current lineage maps to, and which server
 * version row each client version id maps to.
 */
export interface ComplianceSyncState {
  getServerReportId(): string | null
  setServerReportId(reportId: string | null): void
  getServerVersionId(clientVersionId: string): string | undefined
  linkServerVersion(clientVersionId: string, serverVersionId: string): void
  unlinkServerVersion(clientVersionId: string): void
}

export interface VersionSyncInput {
  userId: string
  clientVersionId: string
  content: string
  label: string
  title: string
  chatId: string | null
  documentId: string | null
  complianceScore: number | null
  metadata: Record<string, unknown>
  /** Normalized findings for the saved content; null skips the findings pass. */
  findingSeeds: FindingSeed[] | null
}

export interface VersionSyncResult {
  ok: boolean
  reportId?: string
  versionId?: string
  error?: unknown
}

function toNewFindings(
  seeds: FindingSeed[],
  reportId: string,
  userId: string
): NewReportFinding[] {
  return seeds.map((seed) => ({
    reportId,
    userId,
    severity: seed.severity,
    title: seed.title,
    detail: seed.detail,
    authorityCitation: seed.authorityCitation,
    authoritySourceUrl: seed.authoritySourceUrl,
    checklistItem: seed.checklistItem,
    isChecklist: seed.isChecklist,
    isChecked: seed.isChecked,
    position: seed.position,
  }))
}

function nextVersionNumber(versions: ReportVersionRecord[]): number {
  return versions.reduce((max, version) => Math.max(max, version.versionNumber), 0) + 1
}

/** Clamp to the DB CHECK (0-100 integer) so a stray score can't abort a sync. */
function clampScore(score: number | null): number | null {
  if (score === null || !Number.isFinite(score)) return null
  return Math.max(0, Math.min(100, Math.round(score)))
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && /duplicate|unique/i.test(error.message)
}

/**
 * Mirror a locally saved version to the server: create the report row on the
 * first synced version, keep it at the latest content afterwards, append an
 * immutable version row, and replace the normalized findings when seeds are
 * provided. Never throws — a failure is reported in the result and the local
 * save stands.
 */
export async function performVersionSync(
  repository: ComplianceReportRepository,
  state: ComplianceSyncState,
  input: VersionSyncInput
): Promise<VersionSyncResult> {
  try {
    const complianceScore = clampScore(input.complianceScore)
    let reportId = state.getServerReportId()
    let versionNumber: number

    // The linked server row can vanish out from under us (deleted from
    // another device, or a cascade). Recover by dropping the stale linkage
    // and recreating instead of failing every future save.
    if (reportId && !(await repository.getReport(reportId))) {
      state.setServerReportId(null)
      reportId = null
    }

    if (!reportId) {
      const report = await repository.createReport({
        userId: input.userId,
        chatId: input.chatId,
        documentId: input.documentId,
        title: input.title,
        content: input.content,
        complianceScore,
        metadata: input.metadata,
      })
      reportId = report.id
      state.setServerReportId(reportId)
      versionNumber = 1
    } else {
      await repository.updateReport(reportId, {
        content: input.content,
        complianceScore,
        metadata: input.metadata,
      })
      // Server-derived numbering keeps UNIQUE(report_id, version_number)
      // safe across tabs and devices.
      versionNumber = nextVersionNumber(await repository.listVersions(reportId))
    }

    let version: ReportVersionRecord
    try {
      version = await repository.appendVersion({
        reportId,
        userId: input.userId,
        versionNumber,
        label: input.label,
        content: input.content,
        changeNote: null,
      })
    } catch (error) {
      // A concurrent tab/device can win the same version_number; re-derive
      // once from the server and retry before giving up.
      if (!isUniqueViolation(error)) throw error
      version = await repository.appendVersion({
        reportId,
        userId: input.userId,
        versionNumber: nextVersionNumber(await repository.listVersions(reportId)),
        label: input.label,
        content: input.content,
        changeNote: null,
      })
    }
    state.linkServerVersion(input.clientVersionId, version.id)

    if (input.findingSeeds) {
      await repository.replaceFindings(
        reportId,
        toNewFindings(input.findingSeeds, reportId, input.userId)
      )
    }

    return { ok: true, reportId, versionId: version.id }
  } catch (error) {
    return { ok: false, error }
  }
}

/**
 * Mirror a local version deletion. A version that never synced (no server id
 * in the linkage map) is a successful no-op.
 */
export async function performVersionDelete(
  repository: ComplianceReportRepository,
  state: ComplianceSyncState,
  clientVersionId: string
): Promise<VersionSyncResult> {
  const serverVersionId = state.getServerVersionId(clientVersionId)
  if (!serverVersionId) {
    return { ok: true }
  }

  try {
    await repository.deleteVersion(serverVersionId)
    state.unlinkServerVersion(clientVersionId)
    return { ok: true, versionId: serverVersionId }
  } catch (error) {
    return { ok: false, error }
  }
}

export interface HydrationResult {
  report: ComplianceReportRecord
  /** Oldest-first, ready to seed the client store in save order. */
  versions: ReportVersionRecord[]
}

/**
 * Load the user's most recent server report and its version history so a
 * report survives clearing browser storage (PRD P0-1 acceptance). Returns null
 * when the server has no reports. The caller decides whether to seed the
 * client store (it should only do so when the local store is empty, so local
 * work is never overwritten).
 */
export async function performHydration(
  repository: ComplianceReportRepository,
  userId: string
): Promise<HydrationResult | null> {
  const reports = await repository.listReports(userId)
  const latest = reports[0]
  if (!latest) {
    return null
  }

  const versions = await repository.listVersions(latest.id)
  return {
    report: latest,
    versions: [...versions].sort((a, b) => a.versionNumber - b.versionNumber),
  }
}
