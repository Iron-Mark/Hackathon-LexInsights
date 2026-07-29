/**
 * Compliance report persistence (PRD P0-1).
 *
 * Barrel for the server-side persistence contract, the Supabase
 * implementation, the findings extractor, and the dual-write sync core.
 * Wired into the app through src/lib/store/compliance-server-sync.ts. See
 * database/migrations/0001_compliance_report_persistence.sql for the matching
 * schema.
 */

export type {
  ComplianceReportRecord,
  FindingSeverity,
  NewComplianceReport,
  NewReportFinding,
  NewReportVersion,
  ReportFindingRecord,
  ReportVersionRecord,
  UpdateComplianceReportPatch,
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
  isFindingSeverity,
  mapFindingRow,
  mapReportRow,
  mapVersionRow,
} from './repository'

export { createComplianceReportRepository } from './factory'

export { SupabaseComplianceReportRepository } from './supabase-repository'

export type {
  DraftAnalysisLike,
  DraftFindingLike,
  FindingSeed,
  FindingSeedSeverity,
} from './findings-extractor'

export {
  extractFindingSeeds,
  extractFindingSeedsFromAnalysis,
  extractFindingSeedsFromMarkdown,
} from './findings-extractor'

export type {
  ComplianceSyncState,
  HydrationResult,
  VersionSyncInput,
  VersionSyncResult,
} from './sync'

export { performHydration, performVersionDelete, performVersionSync } from './sync'

export type {
  AiUseDisclosure,
  AiUseDisclosureInput,
  DisclosureAuthority,
  RagProviderMode,
} from './ai-use-disclosure'

export { buildAiUseDisclosure, renderAiUseDisclosureMarkdown } from './ai-use-disclosure'
