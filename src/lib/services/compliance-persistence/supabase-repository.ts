/**
 * Supabase-backed compliance report repository (PRD P0-1 server path).
 *
 * Implements the ComplianceReportRepository contract against the tables defined
 * in database/schema.sql (public.compliance_reports) and
 * database/migrations/0001_compliance_report_persistence.sql
 * (public.report_versions, public.report_findings).
 *
 * Follows the .from('...').insert(...).select() usage and error handling style
 * of src/lib/store/chat-store.ts. The Supabase client is untyped, so write
 * payloads are cast with `as never` (matching chat-store) and read rows are
 * cast to the snake_case Row types before being run through the pure map*Row
 * mappers in ./repository.
 */

import { createClient } from '@/lib/supabase/client'

import type {
  ComplianceReportRecord,
  NewComplianceReport,
  NewReportFinding,
  NewReportVersion,
  ReportFindingRecord,
  ReportVersionRecord,
} from './types'
import type {
  ComplianceReportRepository,
  ComplianceReportRow,
  ReportFindingRow,
  ReportVersionRow,
} from './repository'
import { mapFindingRow, mapReportRow, mapVersionRow } from './repository'

type SupabaseLike = ReturnType<typeof createClient>

function fail(action: string, message: string): never {
  throw new Error(`Failed to ${action}: ${message}`)
}

export class SupabaseComplianceReportRepository implements ComplianceReportRepository {
  private readonly supabase: SupabaseLike

  constructor(supabase: SupabaseLike = createClient()) {
    this.supabase = supabase
  }

  // -------------------------------------------------------------------------
  // Reports (public.compliance_reports)
  // -------------------------------------------------------------------------

  async createReport(input: NewComplianceReport): Promise<ComplianceReportRecord> {
    const { data, error } = await this.supabase
      .from('compliance_reports')
      .insert({
        user_id: input.userId,
        chat_id: input.chatId ?? null,
        document_id: input.documentId ?? null,
        title: input.title,
        content: input.content,
        compliance_score: input.complianceScore ?? null,
        metadata: input.metadata ?? {},
      } as never)
      .select()
      .single()

    if (error) fail('create compliance report', error.message)

    return mapReportRow(data as unknown as ComplianceReportRow)
  }

  async getReport(reportId: string): Promise<ComplianceReportRecord | null> {
    const { data, error } = await this.supabase
      .from('compliance_reports')
      .select('*')
      .eq('id', reportId)
      .maybeSingle()

    if (error) fail('load compliance report', error.message)

    return data ? mapReportRow(data as unknown as ComplianceReportRow) : null
  }

  async listReports(userId: string): Promise<ComplianceReportRecord[]> {
    const { data, error } = await this.supabase
      .from('compliance_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) fail('list compliance reports', error.message)

    return ((data ?? []) as unknown as ComplianceReportRow[]).map(mapReportRow)
  }

  async deleteReport(reportId: string): Promise<void> {
    const { error } = await this.supabase
      .from('compliance_reports')
      .delete()
      .eq('id', reportId)

    if (error) fail('delete compliance report', error.message)
  }

  // -------------------------------------------------------------------------
  // Versions (public.report_versions, append-only)
  // -------------------------------------------------------------------------

  async appendVersion(input: NewReportVersion): Promise<ReportVersionRecord> {
    const { data, error } = await this.supabase
      .from('report_versions')
      .insert({
        report_id: input.reportId,
        user_id: input.userId,
        version_number: input.versionNumber,
        label: input.label,
        content: input.content,
        change_note: input.changeNote ?? null,
      } as never)
      .select()
      .single()

    if (error) fail('append report version', error.message)

    return mapVersionRow(data as unknown as ReportVersionRow)
  }

  async listVersions(reportId: string): Promise<ReportVersionRecord[]> {
    const { data, error } = await this.supabase
      .from('report_versions')
      .select('*')
      .eq('report_id', reportId)
      .order('version_number', { ascending: false })

    if (error) fail('list report versions', error.message)

    return ((data ?? []) as unknown as ReportVersionRow[]).map(mapVersionRow)
  }

  // -------------------------------------------------------------------------
  // Findings (public.report_findings)
  // -------------------------------------------------------------------------

  async replaceFindings(
    reportId: string,
    findings: NewReportFinding[]
  ): Promise<ReportFindingRecord[]> {
    const { error: deleteError } = await this.supabase
      .from('report_findings')
      .delete()
      .eq('report_id', reportId)

    if (deleteError) fail('replace report findings', deleteError.message)

    if (findings.length === 0) {
      return []
    }

    const rows = findings.map((finding, index) => ({
      report_id: finding.reportId,
      user_id: finding.userId,
      severity: finding.severity,
      title: finding.title,
      detail: finding.detail ?? null,
      authority_citation: finding.authorityCitation ?? null,
      authority_source_url: finding.authoritySourceUrl ?? null,
      checklist_item: finding.checklistItem ?? null,
      is_checklist: finding.isChecklist ?? false,
      is_checked: finding.isChecked ?? false,
      position: finding.position ?? index,
    }))

    const { data, error } = await this.supabase
      .from('report_findings')
      .insert(rows as never)
      .select()

    if (error) fail('replace report findings', error.message)

    return ((data ?? []) as unknown as ReportFindingRow[])
      .map(mapFindingRow)
      .sort((a, b) => a.position - b.position)
  }

  async listFindings(reportId: string): Promise<ReportFindingRecord[]> {
    const { data, error } = await this.supabase
      .from('report_findings')
      .select('*')
      .eq('report_id', reportId)
      .order('position', { ascending: true })

    if (error) fail('list report findings', error.message)

    return ((data ?? []) as unknown as ReportFindingRow[]).map(mapFindingRow)
  }

  async setFindingChecked(findingId: string, isChecked: boolean): Promise<void> {
    const { error } = await this.supabase
      .from('report_findings')
      .update({ is_checked: isChecked } as never)
      .eq('id', findingId)

    if (error) fail('update report finding', error.message)
  }
}
