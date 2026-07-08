/**
 * Compliance report persistence (PRD P0-1).
 *
 * Scaffold barrel. Defines the server-side persistence contract for compliance
 * reports, versions, and normalized findings. Not yet wired into the app; the
 * factory returns a stub that throws. See database/migrations/
 * 0001_compliance_report_persistence.sql for the matching schema.
 */

export type {
  ComplianceReportRecord,
  FindingSeverity,
  NewComplianceReport,
  NewReportFinding,
  NewReportVersion,
  ReportFindingRecord,
  ReportVersionRecord,
} from './types'

export type {
  ComplianceReportRepository,
  ComplianceReportRow,
  ReportFindingRow,
  ReportVersionRow,
} from './repository'

export {
  CompliancePersistenceNotWiredError,
  UnwiredComplianceReportRepository,
  createComplianceReportRepository,
  isFindingSeverity,
  mapFindingRow,
  mapReportRow,
  mapVersionRow,
} from './repository'

export type {
  AiUseDisclosure,
  AiUseDisclosureInput,
  DisclosureAuthority,
  RagProviderMode,
} from './ai-use-disclosure'

export { buildAiUseDisclosure, renderAiUseDisclosureMarkdown } from './ai-use-disclosure'
