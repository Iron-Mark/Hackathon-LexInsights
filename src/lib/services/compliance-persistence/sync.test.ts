import { describe, expect, it } from 'vitest'

import type { ComplianceReportRepository } from './repository'
import type {
  ComplianceReportRecord,
  NewComplianceReport,
  NewReportFinding,
  NewReportVersion,
  ReportFindingRecord,
  ReportVersionRecord,
  UpdateComplianceReportPatch,
} from './types'
import {
  performHydration,
  performVersionDelete,
  performVersionSync,
  type ComplianceSyncState,
  type VersionSyncInput,
} from './sync'
import type { FindingSeed } from './findings-extractor'

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

function fakeState(initialReportId: string | null = null): ComplianceSyncState & {
  reportId: string | null
  versionMap: Map<string, string>
} {
  const versionMap = new Map<string, string>()
  const state = {
    reportId: initialReportId,
    versionMap,
    getServerReportId: () => state.reportId,
    setServerReportId: (reportId: string | null) => {
      state.reportId = reportId
    },
    getServerVersionId: (clientVersionId: string) => versionMap.get(clientVersionId),
    linkServerVersion: (clientVersionId: string, serverVersionId: string) => {
      versionMap.set(clientVersionId, serverVersionId)
    },
    unlinkServerVersion: (clientVersionId: string) => {
      versionMap.delete(clientVersionId)
    },
  }
  return state
}

interface FakeRepo extends ComplianceReportRepository {
  reports: ComplianceReportRecord[]
  versions: ReportVersionRecord[]
  findings: NewReportFinding[]
  calls: string[]
  failOn: Set<string>
}

function fakeRepo(): FakeRepo {
  let idCounter = 0
  const nextId = (prefix: string) => `${prefix}-${++idCounter}`

  const repo: FakeRepo = {
    reports: [],
    versions: [],
    findings: [],
    calls: [],
    failOn: new Set(),

    async createReport(input: NewComplianceReport) {
      repo.calls.push('createReport')
      if (repo.failOn.has('createReport')) throw new Error('createReport failed')
      const record: ComplianceReportRecord = {
        id: nextId('report'),
        userId: input.userId,
        chatId: input.chatId ?? null,
        documentId: input.documentId ?? null,
        title: input.title,
        content: input.content,
        complianceScore: input.complianceScore ?? null,
        metadata: input.metadata ?? {},
        createdAt: '2026-07-28T00:00:00Z',
        updatedAt: '2026-07-28T00:00:00Z',
      }
      repo.reports.push(record)
      return record
    },

    async getReport(reportId: string) {
      repo.calls.push('getReport')
      return repo.reports.find((report) => report.id === reportId) ?? null
    },

    async listReports(userId: string) {
      repo.calls.push('listReports')
      if (repo.failOn.has('listReports')) throw new Error('listReports failed')
      return repo.reports.filter((report) => report.userId === userId).reverse()
    },

    async updateReport(reportId: string, patch: UpdateComplianceReportPatch) {
      repo.calls.push('updateReport')
      if (repo.failOn.has('updateReport')) throw new Error('updateReport failed')
      const report = repo.reports.find((entry) => entry.id === reportId)
      if (!report) throw new Error('missing report')
      if (patch.title !== undefined) report.title = patch.title
      if (patch.content !== undefined) report.content = patch.content
      if (patch.complianceScore !== undefined) report.complianceScore = patch.complianceScore
      if (patch.metadata !== undefined) report.metadata = patch.metadata
      return report
    },

    async deleteReport(reportId: string) {
      repo.calls.push('deleteReport')
      repo.reports = repo.reports.filter((report) => report.id !== reportId)
    },

    async deleteAllReports(userId: string) {
      repo.calls.push('deleteAllReports')
      if (repo.failOn.has('deleteAllReports')) throw new Error('deleteAllReports failed')
      const ownedIds = new Set(repo.reports.filter((report) => report.userId === userId).map((report) => report.id))
      repo.reports = repo.reports.filter((report) => !ownedIds.has(report.id))
      repo.versions = repo.versions.filter((version) => !ownedIds.has(version.reportId))
    },

    async appendVersion(input: NewReportVersion) {
      repo.calls.push('appendVersion')
      if (repo.failOn.has('appendVersion')) throw new Error('appendVersion failed')
      const duplicate = repo.versions.some(
        (version) =>
          version.reportId === input.reportId && version.versionNumber === input.versionNumber
      )
      if (duplicate) throw new Error('duplicate version_number')
      const record: ReportVersionRecord = {
        id: nextId('version'),
        reportId: input.reportId,
        userId: input.userId,
        versionNumber: input.versionNumber,
        label: input.label,
        content: input.content,
        changeNote: input.changeNote ?? null,
        createdAt: '2026-07-28T00:00:00Z',
      }
      repo.versions.push(record)
      return record
    },

    async listVersions(reportId: string) {
      repo.calls.push('listVersions')
      if (repo.failOn.has('listVersions')) throw new Error('listVersions failed')
      return repo.versions
        .filter((version) => version.reportId === reportId)
        .sort((a, b) => b.versionNumber - a.versionNumber)
    },

    async deleteVersion(versionId: string) {
      repo.calls.push('deleteVersion')
      if (repo.failOn.has('deleteVersion')) throw new Error('deleteVersion failed')
      repo.versions = repo.versions.filter((version) => version.id !== versionId)
    },

    async replaceFindings(reportId: string, findings: NewReportFinding[]) {
      repo.calls.push('replaceFindings')
      if (repo.failOn.has('replaceFindings')) throw new Error('replaceFindings failed')
      repo.findings = findings
      return findings.map((finding, index) => ({
        id: nextId('finding'),
        reportId,
        userId: finding.userId,
        severity: finding.severity,
        title: finding.title,
        detail: finding.detail ?? null,
        authorityCitation: finding.authorityCitation ?? null,
        authoritySourceUrl: finding.authoritySourceUrl ?? null,
        checklistItem: finding.checklistItem ?? null,
        isChecklist: finding.isChecklist ?? false,
        isChecked: finding.isChecked ?? false,
        position: finding.position ?? index,
        createdAt: '2026-07-28T00:00:00Z',
        updatedAt: '2026-07-28T00:00:00Z',
      })) satisfies ReportFindingRecord[]
    },

    async listFindings() {
      repo.calls.push('listFindings')
      return []
    },

    async setFindingChecked() {
      repo.calls.push('setFindingChecked')
    },
  }

  return repo
}

const SEED: FindingSeed = {
  severity: 'red',
  title: 'No breach notification',
  detail: 'Missing NPC 72-hour notification.',
  authorityCitation: 'RA 10173',
  authoritySourceUrl: null,
  checklistItem: null,
  isChecklist: false,
  isChecked: false,
  position: 0,
}

function syncInput(overrides: Partial<VersionSyncInput> = {}): VersionSyncInput {
  return {
    userId: 'user_123',
    clientVersionId: 'version-1',
    content: '# Report v1',
    label: 'Initial Report',
    title: 'policy.pdf',
    chatId: null,
    documentId: null,
    complianceScore: 74,
    metadata: { fileName: 'policy.pdf' },
    findingSeeds: [SEED],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// performVersionSync
// ---------------------------------------------------------------------------

describe('performVersionSync', () => {
  it('creates the report, appends version 1, and persists findings on first sync', async () => {
    const repo = fakeRepo()
    const state = fakeState()

    const result = await performVersionSync(repo, state, syncInput())

    expect(result.ok).toBe(true)
    expect(state.reportId).toBe(result.reportId)
    expect(repo.reports).toHaveLength(1)
    expect(repo.reports[0].userId).toBe('user_123')
    expect(repo.reports[0].complianceScore).toBe(74)
    expect(repo.versions).toHaveLength(1)
    expect(repo.versions[0].versionNumber).toBe(1)
    expect(repo.versions[0].label).toBe('Initial Report')
    expect(state.versionMap.get('version-1')).toBe(repo.versions[0].id)
    expect(repo.findings).toHaveLength(1)
    expect(repo.findings[0].reportId).toBe(result.reportId)
    expect(repo.findings[0].userId).toBe('user_123')
    expect(repo.findings[0].severity).toBe('red')
  })

  it('updates the existing report and appends the next server-derived version number', async () => {
    const repo = fakeRepo()
    const state = fakeState()

    await performVersionSync(repo, state, syncInput())
    const second = await performVersionSync(
      repo,
      state,
      syncInput({
        clientVersionId: 'version-2',
        content: '# Report v2',
        label: 'Version 2',
        complianceScore: 80,
        findingSeeds: null,
      })
    )

    expect(second.ok).toBe(true)
    expect(repo.reports).toHaveLength(1)
    expect(repo.reports[0].content).toBe('# Report v2')
    expect(repo.reports[0].complianceScore).toBe(80)
    expect(repo.versions.map((version) => version.versionNumber).sort()).toEqual([1, 2])
    // findingSeeds: null skips the findings pass entirely.
    expect(repo.calls.filter((call) => call === 'replaceFindings')).toHaveLength(1)
  })

  it('derives the version number from the server, not the local count', async () => {
    const repo = fakeRepo()
    const state = fakeState()

    await performVersionSync(repo, state, syncInput())
    // Another tab appended version 2 for the same report.
    await repo.appendVersion({
      reportId: state.reportId!,
      userId: 'user_123',
      versionNumber: 2,
      label: 'Other tab',
      content: '# other',
    })

    const result = await performVersionSync(
      repo,
      state,
      syncInput({ clientVersionId: 'version-3', label: 'Version 3', findingSeeds: null })
    )

    expect(result.ok).toBe(true)
    expect(repo.versions.map((version) => version.versionNumber).sort()).toEqual([1, 2, 3])
  })

  it('reports failure without throwing when the repository errors', async () => {
    const repo = fakeRepo()
    repo.failOn.add('createReport')
    const state = fakeState()

    const result = await performVersionSync(repo, state, syncInput())

    expect(result.ok).toBe(false)
    expect(result.error).toBeInstanceOf(Error)
    expect(state.reportId).toBeNull()
    expect(state.versionMap.size).toBe(0)
  })

  it('recovers from a stale serverReportId by recreating the report', async () => {
    const repo = fakeRepo()
    const state = fakeState()
    await performVersionSync(repo, state, syncInput())

    // The server row vanishes out from under the client (e.g. deleted from
    // another device); the stored linkage is now stale.
    await repo.deleteReport(state.reportId!)
    repo.versions = []

    const result = await performVersionSync(
      repo,
      state,
      syncInput({ clientVersionId: 'version-2', label: 'Version 2', findingSeeds: null })
    )

    expect(result.ok).toBe(true)
    expect(result.reportId).not.toBeNull()
    expect(state.reportId).toBe(result.reportId)
    expect(repo.reports).toHaveLength(1)
    expect(repo.versions).toHaveLength(1)
    expect(repo.versions[0].versionNumber).toBe(1)
  })

  it('clamps out-of-range compliance scores to the DB CHECK range', async () => {
    const repo = fakeRepo()
    const state = fakeState()

    const result = await performVersionSync(repo, state, syncInput({ complianceScore: 250 }))

    expect(result.ok).toBe(true)
    expect(repo.reports[0].complianceScore).toBe(100)
  })

  it('retries once with a re-derived number on a version_number collision', async () => {
    const repo = fakeRepo()
    const state = fakeState()
    await performVersionSync(repo, state, syncInput())

    // Another tab claimed version 2 after this client derived its number:
    // simulate by pre-inserting version 2 while keeping the derived number
    // stale via a listVersions snapshot taken before the insert.
    const originalListVersions = repo.listVersions.bind(repo)
    let listCalls = 0
    repo.listVersions = async (reportId: string) => {
      listCalls += 1
      const versions = await originalListVersions(reportId)
      if (listCalls === 1) {
        // First derivation happens before the other tab's insert lands.
        await repo.appendVersion({
          reportId,
          userId: 'user_123',
          versionNumber: 2,
          label: 'Other tab',
          content: '# other',
        })
      }
      return versions
    }

    const result = await performVersionSync(
      repo,
      state,
      syncInput({ clientVersionId: 'version-3', label: 'Version 3', findingSeeds: null })
    )

    expect(result.ok).toBe(true)
    expect(repo.versions.map((version) => version.versionNumber).sort()).toEqual([1, 2, 3])
  })
})

// ---------------------------------------------------------------------------
// performVersionDelete
// ---------------------------------------------------------------------------

describe('performVersionDelete', () => {
  it('deletes the linked server version and unlinks it', async () => {
    const repo = fakeRepo()
    const state = fakeState()
    await performVersionSync(repo, state, syncInput())
    const serverVersionId = state.versionMap.get('version-1')!

    const result = await performVersionDelete(repo, state, 'version-1')

    expect(result.ok).toBe(true)
    expect(result.versionId).toBe(serverVersionId)
    expect(repo.versions).toHaveLength(0)
    expect(state.versionMap.has('version-1')).toBe(false)
  })

  it('is a successful no-op for a version that never synced', async () => {
    const repo = fakeRepo()
    const state = fakeState()

    const result = await performVersionDelete(repo, state, 'version-unsynced')

    expect(result.ok).toBe(true)
    expect(repo.calls).not.toContain('deleteVersion')
  })

  it('keeps the link and reports failure when the delete errors', async () => {
    const repo = fakeRepo()
    const state = fakeState()
    await performVersionSync(repo, state, syncInput())
    repo.failOn.add('deleteVersion')

    const result = await performVersionDelete(repo, state, 'version-1')

    expect(result.ok).toBe(false)
    expect(state.versionMap.has('version-1')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// performHydration
// ---------------------------------------------------------------------------

describe('performHydration', () => {
  it('returns the latest report with versions sorted oldest-first', async () => {
    const repo = fakeRepo()
    const state = fakeState()
    await performVersionSync(repo, state, syncInput())
    await performVersionSync(
      repo,
      state,
      syncInput({ clientVersionId: 'version-2', label: 'Version 2', findingSeeds: null })
    )

    const hydration = await performHydration(repo, 'user_123')

    expect(hydration).not.toBeNull()
    expect(hydration!.report.id).toBe(state.reportId)
    expect(hydration!.versions.map((version) => version.versionNumber)).toEqual([1, 2])
  })

  it('returns null when the user has no reports', async () => {
    const repo = fakeRepo()
    expect(await performHydration(repo, 'user_123')).toBeNull()
  })
})
