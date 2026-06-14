-- =====================================================
-- LEXINSIGHT SUPABASE DATABASE SETUP
-- Complete SQL script for all tables, policies, and functions
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES TABLE
-- Extends Supabase auth.users with additional user data
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);

-- =====================================================
-- 2. CHATS TABLE
-- Stores chat conversations
-- =====================================================

CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'general' CHECK (mode IN ('general', 'compliance')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Chats policies
DROP POLICY IF EXISTS "Users can view own chats" ON public.chats;
CREATE POLICY "Users can view own chats"
  ON public.chats
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own chats" ON public.chats;
CREATE POLICY "Users can create own chats"
  ON public.chats
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own chats" ON public.chats;
CREATE POLICY "Users can update own chats"
  ON public.chats
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own chats" ON public.chats;
CREATE POLICY "Users can delete own chats"
  ON public.chats
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS chats_user_id_idx ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS chats_created_at_idx ON public.chats(created_at DESC);
CREATE INDEX IF NOT EXISTS chats_user_id_created_at_idx ON public.chats(user_id, created_at DESC);

-- =====================================================
-- 3. MESSAGES TABLE
-- Stores individual messages in chats
-- =====================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Messages policies (users can only access messages from their own chats)
DROP POLICY IF EXISTS "Users can view messages from own chats" ON public.messages;
CREATE POLICY "Users can view messages from own chats"
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create messages in own chats" ON public.messages;
CREATE POLICY "Users can create messages in own chats"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update messages in own chats" ON public.messages;
CREATE POLICY "Users can update messages in own chats"
  ON public.messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete messages from own chats" ON public.messages;
CREATE POLICY "Users can delete messages from own chats"
  ON public.messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS messages_chat_id_idx ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS messages_chat_id_created_at_idx ON public.messages(chat_id, created_at);

-- =====================================================
-- 4. DOCUMENTS TABLE
-- Stores uploaded documents for compliance analysis
-- =====================================================

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Documents policies
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
CREATE POLICY "Users can view own documents"
  ON public.documents
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own documents" ON public.documents;
CREATE POLICY "Users can create own documents"
  ON public.documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
CREATE POLICY "Users can update own documents"
  ON public.documents
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
CREATE POLICY "Users can delete own documents"
  ON public.documents
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS documents_user_id_idx ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS documents_chat_id_idx ON public.documents(chat_id);
CREATE INDEX IF NOT EXISTS documents_status_idx ON public.documents(status);
CREATE INDEX IF NOT EXISTS documents_created_at_idx ON public.documents(created_at DESC);

-- =====================================================
-- 5. COMPLIANCE_REPORTS TABLE
-- Stores generated compliance analysis reports
-- =====================================================

CREATE TABLE IF NOT EXISTS public.compliance_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 100),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY;

-- Compliance reports policies
DROP POLICY IF EXISTS "Users can view own compliance reports" ON public.compliance_reports;
CREATE POLICY "Users can view own compliance reports"
  ON public.compliance_reports
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own compliance reports" ON public.compliance_reports;
CREATE POLICY "Users can create own compliance reports"
  ON public.compliance_reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own compliance reports" ON public.compliance_reports;
CREATE POLICY "Users can update own compliance reports"
  ON public.compliance_reports
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own compliance reports" ON public.compliance_reports;
CREATE POLICY "Users can delete own compliance reports"
  ON public.compliance_reports
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS compliance_reports_user_id_idx ON public.compliance_reports(user_id);
CREATE INDEX IF NOT EXISTS compliance_reports_chat_id_idx ON public.compliance_reports(chat_id);
CREATE INDEX IF NOT EXISTS compliance_reports_document_id_idx ON public.compliance_reports(document_id);
CREATE INDEX IF NOT EXISTS compliance_reports_created_at_idx ON public.compliance_reports(created_at DESC);

-- =====================================================
-- 6. SEARCH_HISTORY TABLE
-- Stores user search queries for analytics and suggestions
-- =====================================================

CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Search history policies
DROP POLICY IF EXISTS "Users can view own search history" ON public.search_history;
CREATE POLICY "Users can view own search history"
  ON public.search_history
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own search history" ON public.search_history;
CREATE POLICY "Users can create own search history"
  ON public.search_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own search history" ON public.search_history;
CREATE POLICY "Users can delete own search history"
  ON public.search_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS search_history_user_id_idx ON public.search_history(user_id);
CREATE INDEX IF NOT EXISTS search_history_created_at_idx ON public.search_history(created_at DESC);

-- =====================================================
-- 7. DATA API GRANTS
-- Supabase no longer guarantees new public tables are automatically exposed
-- through the Data API. Keep RLS enabled, then explicitly grant only the
-- authenticated role access to the app-owned tables used by supabase-js.
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
-- Utility functions for the application
-- =====================================================

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
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

-- Trigger helper functions are not client-callable RPC endpoints.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM anon, authenticated, public;

-- Function to get user's recent chats with message count
CREATE OR REPLACE FUNCTION public.get_user_chats_with_counts(user_uuid UUID)
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
    COUNT(m.id) as message_count,
    MAX(m.created_at) as last_message_at
  FROM public.chats c
  LEFT JOIN public.messages m ON c.id = m.chat_id
  WHERE c.user_id = auth.uid()
  AND c.user_id = user_uuid
  GROUP BY c.id, c.title, c.mode, c.created_at, c.updated_at
  ORDER BY COALESCE(MAX(m.created_at), c.created_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function to delete chat and all related data
CREATE OR REPLACE FUNCTION public.delete_chat_cascade(chat_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  chat_exists BOOLEAN;
BEGIN
  IF user_uuid IS DISTINCT FROM auth.uid() THEN
    RETURN FALSE;
  END IF;

  -- Check if chat exists and belongs to user
  SELECT EXISTS(
    SELECT 1 FROM public.chats
    WHERE id = chat_uuid AND user_id = auth.uid()
  ) INTO chat_exists;
  
  IF NOT chat_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Delete chat (cascade will handle messages, documents, reports)
  DELETE FROM public.chats WHERE id = chat_uuid AND user_id = auth.uid();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

REVOKE EXECUTE ON FUNCTION public.get_user_chats_with_counts(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.delete_chat_cascade(UUID, UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_user_chats_with_counts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_chat_cascade(UUID, UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_chats_with_counts(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_chat_cascade(UUID, UUID) FROM anon;

-- =====================================================
-- 9. STORAGE BUCKETS
-- Note: These need to be created in Supabase Storage UI or via API
-- =====================================================

-- Create storage bucket for documents (run this in Supabase Dashboard > Storage)
-- Bucket name: 'documents'
-- Public: false
-- File size limit: 5MB
-- Allowed MIME types: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain, text/markdown

-- Storage policies (run after creating bucket)
-- These allow users to upload, view, and delete their own documents

-- Policy: Users can upload their own documents
-- CREATE POLICY "Users can upload own documents"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'documents' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Policy: Users can view their own documents
-- CREATE POLICY "Users can view own documents"
-- ON storage.objects FOR SELECT
-- USING (
--   bucket_id = 'documents' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Policy: Users can delete their own documents
-- CREATE POLICY "Users can delete own documents"
-- ON storage.objects FOR DELETE
-- USING (
--   bucket_id = 'documents' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );

-- =====================================================
-- 10. REALTIME SUBSCRIPTIONS
-- Enable realtime for tables that need live updates
-- =====================================================

-- Enable realtime for chats
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Enable realtime for messages
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Enable realtime for documents
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 11. SAMPLE DATA (OPTIONAL - FOR TESTING)
-- Uncomment to insert sample data
-- =====================================================

-- Note: Replace 'YOUR_USER_ID' with actual user UUID after signup

-- INSERT INTO public.chats (id, user_id, title, mode) VALUES
-- ('550e8400-e29b-41d4-a716-446655440001', 'YOUR_USER_ID', 'Data Privacy Compliance', 'compliance'),
-- ('550e8400-e29b-41d4-a716-446655440002', 'YOUR_USER_ID', 'General Legal Questions', 'general');

-- INSERT INTO public.messages (chat_id, role, content) VALUES
-- ('550e8400-e29b-41d4-a716-446655440001', 'user', 'What are the requirements for RA 10173?'),
-- ('550e8400-e29b-41d4-a716-446655440001', 'assistant', 'RA 10173, also known as the Data Privacy Act of 2012...');

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Verify tables were created
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
