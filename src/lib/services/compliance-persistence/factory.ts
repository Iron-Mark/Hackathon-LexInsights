/**
 * Environment-aware factory for the compliance report repository (PRD P0-1).
 *
 * Lives apart from ./repository so that module keeps zero value imports:
 * scripts/check-compliance-persistence-self-test.mjs transpiles repository.ts
 * standalone and would fail to resolve a runtime import of the Supabase
 * implementation.
 */

import type { ComplianceReportRepository } from './repository'
import { UnwiredComplianceReportRepository } from './repository'
import { SupabaseComplianceReportRepository } from './supabase-repository'

/**
 * In the browser, returns the Supabase-backed implementation (P0-1 server
 * path). On the server/build (no `window`), returns the unwired stub so that
 * importing this module never constructs a Supabase client outside the client
 * runtime. Callers depend only on the ComplianceReportRepository interface, so
 * neither branch changes their code.
 */
export function createComplianceReportRepository(): ComplianceReportRepository {
  if (typeof window !== 'undefined') {
    return new SupabaseComplianceReportRepository()
  }

  return new UnwiredComplianceReportRepository()
}
