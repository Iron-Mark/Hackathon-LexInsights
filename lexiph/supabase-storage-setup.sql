-- =====================================================
-- SUPABASE STORAGE SETUP
-- Run this AFTER creating the 'documents' bucket in Storage UI
-- =====================================================

-- =====================================================
-- STEP 1: Create Storage Bucket (Do this in Supabase Dashboard first)
-- =====================================================
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "New bucket"
-- 3. Name: documents
-- 4. Public: OFF (unchecked)
-- 5. File size limit: 5242880 (5MB)
-- 6. Allowed MIME types: 
--    - application/pdf
--    - application/msword
--    - application/vnd.openxmlformats-officedocument.wordprocessingml.document
--    - text/plain
--    - text/markdown

-- =====================================================
-- STEP 2: Run these Storage Policies
-- =====================================================

-- Policy: Users can upload their own documents
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can view their own documents
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own documents
DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own documents
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check if policies were created
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
