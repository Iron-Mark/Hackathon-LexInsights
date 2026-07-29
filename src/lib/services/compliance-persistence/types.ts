/**
 * Domain types for server-side compliance report persistence (PRD P0-1).
 *
 * These mirror database/migrations/0001_compliance_report_persistence.sql and
 * the existing public.compliance_reports table in database/schema.sql. The
 * contract is wired into the app through ./sync (dual-write orchestration) and
 * src/lib/store/compliance-server-sync.ts; IndexedDB
 * (src/lib/store/compliance-store.ts) remains the always-available local copy
 * and the only store for signed-out users.
 */

export type FindingSeverity = 'green' | 'amber' | 'red'

/** A row of public.compliance_reports as a camelCase domain record. */
export interface ComplianceReportRecord {
  id: string
  userId: string
  chatId: string | null
  documentId: string | null
  title: string
  content: string
  complianceScore: number | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/** An immutable, append-only saved version of a report (public.report_versions). */
export interface ReportVersionRecord {
  id: string
  reportId: string
  userId: string
  versionNumber: number
  label: string
  content: string
  changeNote: string | null
  createdAt: string
}

/** A normalized finding or checklist item of a report (public.report_findings). */
export interface ReportFindingRecord {
  id: string
  reportId: string
  userId: string
  severity: FindingSeverity
  title: string
  detail: string | null
  authorityCitation: string | null
  authoritySourceUrl: string | null
  checklistItem: string | null
  isChecklist: boolean
  isChecked: boolean
  position: number
  createdAt: string
  updatedAt: string
}

/** Input for creating a report. Server assigns id, timestamps. */
export interface NewComplianceReport {
  userId: string
  chatId?: string | null
  documentId?: string | null
  title: string
  content: string
  complianceScore?: number | null
  metadata?: Record<string, unknown>
}

/**
 * Partial update for an existing report. Only provided fields change; the
 * report keeps its identity, versions, and findings. Used to keep the parent
 * compliance_reports row at the latest saved content while report_versions
 * stays the immutable history.
 */
export interface UpdateComplianceReportPatch {
  title?: string
  content?: string
  complianceScore?: number | null
  metadata?: Record<string, unknown>
}

/** Input for appending a version. Server assigns id, created_at. */
export interface NewReportVersion {
  reportId: string
  userId: string
  versionNumber: number
  label: string
  content: string
  changeNote?: string | null
}

/** Input for creating a finding. Server assigns id, timestamps. */
export interface NewReportFinding {
  reportId: string
  userId: string
  severity: FindingSeverity
  title: string
  detail?: string | null
  authorityCitation?: string | null
  authoritySourceUrl?: string | null
  checklistItem?: string | null
  isChecklist?: boolean
  isChecked?: boolean
  position?: number
}
