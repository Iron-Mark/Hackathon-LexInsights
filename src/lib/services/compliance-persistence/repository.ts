/**
 * Compliance report repository contract + row mappers (PRD P0-1).
 *
 * The interface below is the seam the app calls to persist compliance reports
 * server-side alongside the IndexedDB store
 * (src/lib/store/compliance-store.ts). The row types and mapper functions are
 * pure. This module deliberately has no value imports (types only) so that
 * scripts/check-compliance-persistence-self-test.mjs can transpile and load it
 * standalone; the environment-aware factory that returns the live
 * SupabaseComplianceReportRepository lives in ./factory.
 */

import type {
  ComplianceReportRecord,
  FindingSeverity,
  NewComplianceReport,
  NewReportFinding,
  NewReportVersion,
  ReportFindingRecord,
  ReportVersionRecord,
  UpdateComplianceReportPatch,
} from './types'

// ---------------------------------------------------------------------------
// Database row shapes (snake_case, as returned by Supabase / Postgres)
// ---------------------------------------------------------------------------

export interface ComplianceReportRow {
  id: string
  user_id: string
  chat_id: string | null
  document_id: string | null
  title: string
  content: string
  compliance_score: number | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface ReportVersionRow {
  id: string
  report_id: string
  user_id: string
  version_number: number
  label: string
  content: string
  change_note: string | null
  created_at: string
}

export interface ReportFindingRow {
  id: string
  report_id: string
  user_id: string
  severity: string
  title: string
  detail: string | null
  authority_citation: string | null
  authority_source_url: string | null
  checklist_item: string | null
  is_checklist: boolean
  is_checked: boolean
  position: number
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Pure mappers: DB row -> domain record. Safe to unit-test with no database.
// ---------------------------------------------------------------------------

const FINDING_SEVERITIES: readonly FindingSeverity[] = ['green', 'amber', 'red']

export function isFindingSeverity(value: string): value is FindingSeverity {
  return (FINDING_SEVERITIES as readonly string[]).includes(value)
}

export function mapReportRow(row: ComplianceReportRow): ComplianceReportRecord {
  return {
    id: row.id,
    userId: row.user_id,
    chatId: row.chat_id,
    documentId: row.document_id,
    title: row.title,
    content: row.content,
    complianceScore: row.compliance_score,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapVersionRow(row: ReportVersionRow): ReportVersionRecord {
  return {
    id: row.id,
    reportId: row.report_id,
    userId: row.user_id,
    versionNumber: row.version_number,
    label: row.label,
    content: row.content,
    changeNote: row.change_note,
    createdAt: row.created_at,
  }
}

export function mapFindingRow(row: ReportFindingRow): ReportFindingRecord {
  return {
    id: row.id,
    reportId: row.report_id,
    userId: row.user_id,
    severity: isFindingSeverity(row.severity) ? row.severity : 'amber',
    title: row.title,
    detail: row.detail,
    authorityCitation: row.authority_citation,
    authoritySourceUrl: row.authority_source_url,
    checklistItem: row.checklist_item,
    isChecklist: row.is_checklist,
    isChecked: row.is_checked,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ---------------------------------------------------------------------------
// Repository contract
// ---------------------------------------------------------------------------

export interface ComplianceReportRepository {
  createReport(input: NewComplianceReport): Promise<ComplianceReportRecord>
  getReport(reportId: string): Promise<ComplianceReportRecord | null>
  listReports(userId: string): Promise<ComplianceReportRecord[]>
  updateReport(reportId: string, patch: UpdateComplianceReportPatch): Promise<ComplianceReportRecord>
  deleteReport(reportId: string): Promise<void>
  /**
   * Delete every report the user owns (versions/findings cascade via FK).
   * Backs the user-initiated "delete cloud report data" control — the PRD §11
   * retention answer is user-controlled deletion, not a time-based purge.
   */
  deleteAllReports(userId: string): Promise<void>

  appendVersion(input: NewReportVersion): Promise<ReportVersionRecord>
  listVersions(reportId: string): Promise<ReportVersionRecord[]>
  deleteVersion(versionId: string): Promise<void>

  replaceFindings(reportId: string, findings: NewReportFinding[]): Promise<ReportFindingRecord[]>
  listFindings(reportId: string): Promise<ReportFindingRecord[]>
  setFindingChecked(findingId: string, isChecked: boolean): Promise<void>
}

/** Thrown by the stub repository until the Supabase implementation is wired. */
export class CompliancePersistenceNotWiredError extends Error {
  constructor(method: string) {
    super(
      `ComplianceReportRepository.${method}() is not wired to Supabase yet. ` +
        `See PRD P0-1 (docs/PRD.md) and database/migrations/0001_compliance_report_persistence.sql.`
    )
    this.name = 'CompliancePersistenceNotWiredError'
  }
}

/**
 * Placeholder repository. Every method throws so that wiring this into the app
 * before the Supabase implementation exists fails loudly instead of silently
 * dropping data. Replace via createComplianceReportRepository() when ready.
 */
export class UnwiredComplianceReportRepository implements ComplianceReportRepository {
  createReport(): Promise<ComplianceReportRecord> {
    throw new CompliancePersistenceNotWiredError('createReport')
  }
  getReport(): Promise<ComplianceReportRecord | null> {
    throw new CompliancePersistenceNotWiredError('getReport')
  }
  listReports(): Promise<ComplianceReportRecord[]> {
    throw new CompliancePersistenceNotWiredError('listReports')
  }
  updateReport(): Promise<ComplianceReportRecord> {
    throw new CompliancePersistenceNotWiredError('updateReport')
  }
  deleteReport(): Promise<void> {
    throw new CompliancePersistenceNotWiredError('deleteReport')
  }
  deleteAllReports(): Promise<void> {
    throw new CompliancePersistenceNotWiredError('deleteAllReports')
  }
  appendVersion(): Promise<ReportVersionRecord> {
    throw new CompliancePersistenceNotWiredError('appendVersion')
  }
  listVersions(): Promise<ReportVersionRecord[]> {
    throw new CompliancePersistenceNotWiredError('listVersions')
  }
  deleteVersion(): Promise<void> {
    throw new CompliancePersistenceNotWiredError('deleteVersion')
  }
  replaceFindings(): Promise<ReportFindingRecord[]> {
    throw new CompliancePersistenceNotWiredError('replaceFindings')
  }
  listFindings(): Promise<ReportFindingRecord[]> {
    throw new CompliancePersistenceNotWiredError('listFindings')
  }
  setFindingChecked(): Promise<void> {
    throw new CompliancePersistenceNotWiredError('setFindingChecked')
  }
}
