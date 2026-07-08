/**
 * Domain types for server-side compliance report persistence (PRD P0-1).
 *
 * These mirror database/migrations/0001_compliance_report_persistence.sql and
 * the existing public.compliance_reports table in database/schema.sql. This
 * module is a scaffold: it defines the contract but is not yet wired into the
 * app. Reports still persist to localStorage via
 * src/lib/store/compliance-store.ts until the repository below is implemented.
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
