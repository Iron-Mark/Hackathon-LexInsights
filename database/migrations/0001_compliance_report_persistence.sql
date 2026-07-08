-- =====================================================
-- MIGRATION 0001: COMPLIANCE REPORT PERSISTENCE
-- Implements PRD requirement P0-1 (docs/PRD.md)
-- =====================================================
--
-- Context: database/schema.sql provisions public.compliance_reports with RLS,
-- four indexes, and a 0-100 compliance_score CHECK constraint, but the app
-- never writes to it. Compliance reports and their version history live only
-- in browser localStorage (src/lib/store/compliance-store.ts, key
-- 'compliance-storage'). This migration adds the two tables needed to persist
-- report versions and normalized findings server-side, with an append-only
-- audit trail keyed to the Clerk user id.
--
-- Prerequisites:
--   1. Run database/schema.sql first (creates uuid-ossp, compliance_reports,
--      the authenticated grants, and public.handle_updated_at()).
--   2. Clerk is configured as a Supabase Third-Party Auth provider so that
--      auth.jwt()->>'sub' resolves to the Clerk user id (user_...).
--
-- This migration is idempotent and safe to re-run.

-- =====================================================
-- 1. REPORT_VERSIONS (append-only audit trail)
-- =====================================================
-- One row per saved version of a compliance report. Immutable by design:
-- no updated_at column, and UPDATE is withheld at the grant level below so
-- the version history cannot be rewritten after the fact.

CREATE TABLE IF NOT EXISTS public.report_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES public.compliance_reports(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  version_number INTEGER NOT NULL CHECK (version_number >= 1),
  label TEXT NOT NULL,
  content TEXT NOT NULL,
  change_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (report_id, version_number)
);

ALTER TABLE public.report_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own report versions" ON public.report_versions;
CREATE POLICY "Users can view own report versions"
  ON public.report_versions
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.jwt()->>'sub') = user_id);

DROP POLICY IF EXISTS "Users can create own report versions" ON public.report_versions;
CREATE POLICY "Users can create own report versions"
  ON public.report_versions
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.jwt()->>'sub') = user_id);

DROP POLICY IF EXISTS "Users can delete own report versions" ON public.report_versions;
CREATE POLICY "Users can delete own report versions"
  ON public.report_versions
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.jwt()->>'sub') = user_id);

CREATE INDEX IF NOT EXISTS report_versions_report_id_idx ON public.report_versions(report_id);
CREATE INDEX IF NOT EXISTS report_versions_user_id_idx ON public.report_versions(user_id);
CREATE INDEX IF NOT EXISTS report_versions_report_id_version_idx ON public.report_versions(report_id, version_number DESC);

-- =====================================================
-- 2. REPORT_FINDINGS (normalized, queryable findings)
-- =====================================================
-- One row per finding or checklist item extracted from a report. Today these
-- live only as Markdown text inside compliance_reports.content, so nothing can
-- be filtered, counted, or audited. Normalizing them unlocks severity filters,
-- per-authority rollups, and matter-level analytics (PRD P1-3).

CREATE TABLE IF NOT EXISTS public.report_findings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES public.compliance_reports(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('green', 'amber', 'red')),
  title TEXT NOT NULL,
  detail TEXT,
  authority_citation TEXT,
  authority_source_url TEXT,
  checklist_item TEXT,
  is_checklist BOOLEAN NOT NULL DEFAULT FALSE,
  is_checked BOOLEAN NOT NULL DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.report_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own report findings" ON public.report_findings;
CREATE POLICY "Users can view own report findings"
  ON public.report_findings
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.jwt()->>'sub') = user_id);

DROP POLICY IF EXISTS "Users can create own report findings" ON public.report_findings;
CREATE POLICY "Users can create own report findings"
  ON public.report_findings
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.jwt()->>'sub') = user_id);

DROP POLICY IF EXISTS "Users can update own report findings" ON public.report_findings;
CREATE POLICY "Users can update own report findings"
  ON public.report_findings
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.jwt()->>'sub') = user_id)
  WITH CHECK ((SELECT auth.jwt()->>'sub') = user_id);

DROP POLICY IF EXISTS "Users can delete own report findings" ON public.report_findings;
CREATE POLICY "Users can delete own report findings"
  ON public.report_findings
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.jwt()->>'sub') = user_id);

CREATE INDEX IF NOT EXISTS report_findings_report_id_idx ON public.report_findings(report_id);
CREATE INDEX IF NOT EXISTS report_findings_user_id_idx ON public.report_findings(user_id);
CREATE INDEX IF NOT EXISTS report_findings_severity_idx ON public.report_findings(severity);
CREATE INDEX IF NOT EXISTS report_findings_report_id_position_idx ON public.report_findings(report_id, position);

-- =====================================================
-- 3. GRANTS
-- =====================================================
-- report_versions is append-only: SELECT, INSERT, DELETE only (no UPDATE),
-- so a stored version cannot be edited after the fact.

GRANT SELECT, INSERT, DELETE ON TABLE public.report_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.report_findings TO authenticated;

REVOKE ALL ON TABLE public.report_versions FROM anon;
REVOKE ALL ON TABLE public.report_findings FROM anon;

-- =====================================================
-- 4. TRIGGERS
-- =====================================================
-- report_findings tracks updated_at (e.g. toggling a checklist item's
-- is_checked). report_versions has no updated_at by design (immutable).

DROP TRIGGER IF EXISTS set_updated_at_report_findings ON public.report_findings;
CREATE TRIGGER set_updated_at_report_findings
  BEFORE UPDATE ON public.report_findings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- NOT wired into the application yet. The client-side seam that will call
-- these tables is defined in src/lib/services/compliance-persistence/. When
-- wiring, follow the existing Supabase call pattern in
-- src/lib/store/chat-store.ts (.from('chats').insert(...)).
