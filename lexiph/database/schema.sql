-- =====================================================
-- LEXINSIGHT SUPABASE DATABASE SETUP
-- Clerk Auth edition for fresh demo projects
-- =====================================================
--
-- Prerequisites:
-- 1. Configure Clerk with Supabase compatibility.
-- 2. Add Clerk as a Third-Party Auth provider in Supabase.
-- 3. Use Clerk user IDs (for example: user_...) as app user IDs.
--
-- Existing Supabase Auth UUID data is not migrated by this script.
-- Reset/drop the app-owned public tables before running this fresh setup.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('chats', 'documents', 'compliance_reports', 'search_history')
      AND column_name = 'user_id'
      AND udt_name = 'uuid'
  ) THEN
    RAISE EXCEPTION 'Existing Supabase Auth UUID schema detected. Reset/drop app tables before running the Clerk fresh-demo setup.';
  END IF;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.get_user_chats_with_counts(UUID);
DROP FUNCTION IF EXISTS public.delete_chat_cascade(UUID, UUID);

-- =====================================================
-- 1. PROFILES TABLE
-- Mirrors Clerk profile data when the app chooses to persist it.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.jwt()->>'sub') = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.jwt()->>'sub') = id)
  WITH CHECK ((SELECT auth.jwt()->>'sub') = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.jwt()->>'sub') = id);

CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);

-- =====================================================
-- 2. CHATS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'general' CHECK (mode IN ('general', 'compliance')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own chats" ON public.chats;
CREATE POLICY "Users can view own chats"
  ON public.chats
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.jwt()->>'sub') = user_id);

DROP POLICY IF EXISTS "Users can create own chats" ON public.chats;
CREATE POLICY "Users can create own chats"
  ON public.chats
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.jwt()->>'sub') = user_id);

DROP POLICY IF EXISTS "Users can update own chats" ON public.chats;
CREATE POLICY "Users can update own chats"
  ON public.chats
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.jwt()->>'sub') = user_id)
  WITH CHECK ((SELECT auth.jwt()->>'sub') = user_id);

DROP POLICY IF EXISTS "Users can delete own chats" ON public.chats;
CREATE POLICY "Users can delete own chats"
  ON public.chats
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.jwt()->>'sub') = user_id);

CREATE INDEX IF NOT EXISTS chats_user_id_idx ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS chats_created_at_idx ON public.chats(created_at DESC);
CREATE INDEX IF NOT EXISTS chats_user_id_created_at_idx ON public.chats(user_id, created_at DESC);

-- =====================================================
-- 3. MESSAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages from own chats" ON public.messages;
CREATE POLICY "Users can view messages from own chats"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
        AND chats.user_id = (SELECT auth.jwt()->>'sub')
    )
  );

DROP POLICY IF EXISTS "Users can create messages in own chats" ON public.messages;
CREATE POLICY "Users can create messages in own chats"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
        AND chats.user_id = (SELECT auth.jwt()->>'sub')
    )
  );

DROP POLICY IF EXISTS "Users can update messages in own chats" ON public.messages;
CREATE POLICY "Users can update messages in own chats"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
        AND chats.user_id = (SELECT auth.jwt()->>'sub')
    )
  );

DROP POLICY IF EXISTS "Users can delete messages from own chats" ON public.messages;
CREATE POLICY "Users can delete messages from own chats"
  ON public.messages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
        AND chats.user_id = (SELECT auth.jwt()->>'sub')
    )
  );

CREATE INDEX IF NOT EXISTS messages_chat_id_idx ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS messages_chat_id_created_at_idx ON public.messages(chat_id, created_at);

-- =====================================================
-- 4. DOCUMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
CREATE POLICY "Users can view own documents"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.jwt()->>'sub') = user_id);

DROP POLICY IF EXISTS "Users can create own documents" ON public.documents;
CREATE POLICY "Users can create own documents"
  ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.jwt()->>'sub') = user_id);

DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
CREATE POLICY "Users can update own documents"
  ON public.documents
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.jwt()->>'sub') = user_id)
  WITH CHECK ((SELECT auth.jwt()->>'sub') = user_id);

DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
CREATE POLICY "Users can delete own documents"
  ON public.documents
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.jwt()->>'sub') = user_id);

CREATE INDEX IF NOT EXISTS documents_user_id_idx ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS documents_chat_id_idx ON public.documents(chat_id);
CREATE INDEX IF NOT EXISTS documents_status_idx ON public.documents(status);
CREATE INDEX IF NOT EXISTS documents_created_at_idx ON public.documents(created_at DESC);

-- =====================================================
-- 5. COMPLIANCE_REPORTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.compliance_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 100),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own compliance reports" ON public.compliance_reports;
CREATE POLICY "Users can view own compliance reports"
  ON public.compliance_reports
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.jwt()->>'sub') = user_id);

DROP POLICY IF EXISTS "Users can create own compliance reports" ON public.compliance_reports;
CREATE POLICY "Users can create own compliance reports"
  ON public.compliance_reports
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.jwt()->>'sub') = user_id);

DROP POLICY IF EXISTS "Users can update own compliance reports" ON public.compliance_reports;
CREATE POLICY "Users can update own compliance reports"
  ON public.compliance_reports
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.jwt()->>'sub') = user_id)
  WITH CHECK ((SELECT auth.jwt()->>'sub') = user_id);

DROP POLICY IF EXISTS "Users can delete own compliance reports" ON public.compliance_reports;
CREATE POLICY "Users can delete own compliance reports"
  ON public.compliance_reports
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.jwt()->>'sub') = user_id);

CREATE INDEX IF NOT EXISTS compliance_reports_user_id_idx ON public.compliance_reports(user_id);
CREATE INDEX IF NOT EXISTS compliance_reports_chat_id_idx ON public.compliance_reports(chat_id);
CREATE INDEX IF NOT EXISTS compliance_reports_document_id_idx ON public.compliance_reports(document_id);
CREATE INDEX IF NOT EXISTS compliance_reports_created_at_idx ON public.compliance_reports(created_at DESC);

-- =====================================================
-- 6. SEARCH_HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own search history" ON public.search_history;
CREATE POLICY "Users can view own search history"
  ON public.search_history
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.jwt()->>'sub') = user_id);

DROP POLICY IF EXISTS "Users can create own search history" ON public.search_history;
CREATE POLICY "Users can create own search history"
  ON public.search_history
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.jwt()->>'sub') = user_id);

DROP POLICY IF EXISTS "Users can delete own search history" ON public.search_history;
CREATE POLICY "Users can delete own search history"
  ON public.search_history
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.jwt()->>'sub') = user_id);

CREATE INDEX IF NOT EXISTS search_history_user_id_idx ON public.search_history(user_id);
CREATE INDEX IF NOT EXISTS search_history_created_at_idx ON public.search_history(created_at DESC);

-- =====================================================
-- 7. DATA API GRANTS
-- =====================================================

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.profiles,
  public.chats,
  public.messages,
  public.documents,
  public.compliance_reports,
  public.search_history
TO authenticated;

REVOKE ALL ON TABLE
  public.profiles,
  public.chats,
  public.messages,
  public.documents,
  public.compliance_reports,
  public.search_history
FROM anon;

-- =====================================================
-- 8. FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_chats ON public.chats;
CREATE TRIGGER set_updated_at_chats
  BEFORE UPDATE ON public.chats
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_documents ON public.documents;
CREATE TRIGGER set_updated_at_documents
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_compliance_reports ON public.compliance_reports;
CREATE TRIGGER set_updated_at_compliance_reports
  BEFORE UPDATE ON public.compliance_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.get_user_chats_with_counts(user_id_param TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  mode TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  message_count BIGINT,
  last_message_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.mode,
    c.created_at,
    c.updated_at,
    COUNT(m.id) AS message_count,
    MAX(m.created_at) AS last_message_at
  FROM public.chats c
  LEFT JOIN public.messages m ON c.id = m.chat_id
  WHERE c.user_id = (SELECT auth.jwt()->>'sub')
    AND c.user_id = user_id_param
  GROUP BY c.id, c.title, c.mode, c.created_at, c.updated_at
  ORDER BY COALESCE(MAX(m.created_at), c.created_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION public.delete_chat_cascade(chat_uuid UUID, user_id_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  chat_exists BOOLEAN;
BEGIN
  IF user_id_param IS DISTINCT FROM (SELECT auth.jwt()->>'sub') THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.chats
    WHERE id = chat_uuid
      AND user_id = (SELECT auth.jwt()->>'sub')
  ) INTO chat_exists;

  IF NOT chat_exists THEN
    RETURN FALSE;
  END IF;

  DELETE FROM public.chats
  WHERE id = chat_uuid
    AND user_id = (SELECT auth.jwt()->>'sub');

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

REVOKE EXECUTE ON FUNCTION public.get_user_chats_with_counts(TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION public.delete_chat_cascade(UUID, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.get_user_chats_with_counts(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_chat_cascade(UUID, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_chats_with_counts(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_chat_cascade(UUID, TEXT) FROM anon;

-- =====================================================
-- 9. STORAGE BUCKETS
-- =====================================================

-- Create storage bucket for documents in Supabase Dashboard:
-- Bucket name: documents
-- Public: false
-- File size limit: 5MB
-- Allowed MIME types: application/pdf, application/msword,
-- application/vnd.openxmlformats-officedocument.wordprocessingml.document,
-- text/plain, text/markdown

-- Storage object names must start with the Clerk user ID:
--   user_.../file-id.pdf
-- Run database/storage.sql after creating the bucket.

-- =====================================================
-- 10. REALTIME SUBSCRIPTIONS
-- =====================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 11. SAMPLE DATA
-- =====================================================

-- Replace YOUR_CLERK_USER_ID with a real Clerk user ID after signup.
-- INSERT INTO public.chats (id, user_id, title, mode) VALUES
-- ('550e8400-e29b-41d4-a716-446655440001', 'YOUR_CLERK_USER_ID', 'Data Privacy Compliance', 'compliance'),
-- ('550e8400-e29b-41d4-a716-446655440002', 'YOUR_CLERK_USER_ID', 'General Legal Questions', 'general');

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
