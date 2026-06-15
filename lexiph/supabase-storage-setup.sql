-- =====================================================
-- SUPABASE STORAGE SETUP
-- Clerk Auth edition for fresh demo projects
-- Run this after creating the private 'documents' bucket.
-- =====================================================

-- STEP 1: Create Storage Bucket in Supabase Dashboard
-- Name: documents
-- Public: OFF
-- File size limit: 5242880 (5MB)
-- Allowed MIME types:
--   - application/pdf
--   - application/msword
--   - application/vnd.openxmlformats-officedocument.wordprocessingml.document
--   - text/plain
--   - text/markdown

-- STEP 2: Run these Storage Policies
-- Object paths must start with the Clerk user ID:
--   user_.../file-id.pdf

DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (SELECT auth.jwt()->>'sub') = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (SELECT auth.jwt()->>'sub') = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (SELECT auth.jwt()->>'sub') = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'documents' AND
  (SELECT auth.jwt()->>'sub') = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (SELECT auth.jwt()->>'sub') = (storage.foldername(name))[1]
);

SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
