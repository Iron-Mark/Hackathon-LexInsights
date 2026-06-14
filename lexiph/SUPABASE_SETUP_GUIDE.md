# Supabase Backend Setup Guide

Complete guide to set up the LexInSight backend on Supabase.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A new Supabase project created
3. Your project's API keys and URL

## Step-by-Step Setup

### 1. Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Click on **Settings** (gear icon) → **API**
3. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - Keep this secret!

4. Update your `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Run Database Setup SQL

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New query**
3. Copy the entire contents of `supabase-setup.sql`
4. Paste into the SQL editor
5. Click **Run** (or press Ctrl/Cmd + Enter)

This will create:
- ✅ All database tables (profiles, chats, messages, documents, etc.)
- ✅ Row Level Security (RLS) policies
- ✅ Explicit authenticated Data API grants for Supabase projects that do not auto-expose new public tables
- ✅ Indexes for performance
- ✅ Triggers for auto-updates
- ✅ Utility functions
- ✅ Realtime subscriptions

The setup scripts are intended to be rerunnable. Existing policies and triggers are replaced, indexes use `IF NOT EXISTS`, and realtime table registration ignores duplicate entries.

**Expected Result:** You should see "Success. No rows returned" message.

### 3. Verify Database Setup

Run this verification query in SQL Editor:

```sql
-- Check all tables were created
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

You should see these tables:
- chats
- compliance_reports
- documents
- messages
- profiles
- search_history

### 4. Set Up Storage Bucket

#### Create the Bucket:
1. Go to **Storage** in Supabase dashboard
2. Click **New bucket**
3. Configure:
   - **Name:** `documents`
   - **Public:** OFF (unchecked)
   - **File size limit:** `5242880` (5MB)
   - **Allowed MIME types:** 
     ```
     application/pdf
     application/msword
     application/vnd.openxmlformats-officedocument.wordprocessingml.document
     text/plain
     text/markdown
     ```
4. Click **Create bucket**

#### Apply Storage Policies:
1. Go back to **SQL Editor**
2. Create a new query
3. Copy contents of `supabase-storage-setup.sql`
4. Paste and **Run**

### 5. Configure Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider (should be enabled by default)
3. Configure email templates (optional):
   - Go to **Authentication** → **Email Templates**
   - Customize confirmation and password reset emails

#### Recommended Auth Settings:
- **Enable email confirmations:** ON (for production)
- **Enable email confirmations:** OFF (for development/testing)
- **Minimum password length:** 8 characters

To disable email confirmation for testing:
1. Go to **Authentication** → **Settings**
2. Scroll to **Email Auth**
3. Toggle OFF "Enable email confirmations"

### 6. Enable Realtime (Optional but Recommended)

Realtime is automatically enabled for:
- `chats` table (live chat list updates)
- `messages` table (live message updates)
- `documents` table (live document status updates)

To verify:
1. Go to **Database** → **Replication**
2. Check that these tables are listed under "Realtime"

### 7. Test the Setup

#### Test Authentication:
1. Run your Next.js app: `npm run dev`
2. Go to `/auth/signup`
3. Create a test account
4. Check Supabase **Authentication** → **Users** to see the new user

#### Test Database:
1. After signup, check **Table Editor** → **profiles**
2. You should see your profile automatically created
3. Try creating a chat in the app
4. Check **Table Editor** → **chats** to see the new chat

#### Test Storage:
1. Try uploading a document in the app
2. Go to **Storage** → **documents**
3. You should see a folder with your user ID containing the uploaded file

## Database Schema Overview

### Tables Structure

```
profiles
├── id (UUID, PK, FK to auth.users)
├── email (TEXT, UNIQUE)
├── full_name (TEXT)
├── avatar_url (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

chats
├── id (UUID, PK)
├── user_id (UUID, FK to auth.users)
├── title (TEXT)
├── mode (TEXT: 'general' | 'compliance')
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

messages
├── id (UUID, PK)
├── chat_id (UUID, FK to chats)
├── role (TEXT: 'user' | 'assistant' | 'system')
├── content (TEXT)
├── metadata (JSONB)
└── created_at (TIMESTAMPTZ)

documents
├── id (UUID, PK)
├── user_id (UUID, FK to auth.users)
├── chat_id (UUID, FK to chats, nullable)
├── file_name (TEXT)
├── file_size (INTEGER)
├── file_type (TEXT)
├── storage_path (TEXT)
├── status (TEXT: 'pending' | 'processing' | 'completed' | 'failed')
├── metadata (JSONB)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

compliance_reports
├── id (UUID, PK)
├── user_id (UUID, FK to auth.users)
├── chat_id (UUID, FK to chats)
├── document_id (UUID, FK to documents, nullable)
├── title (TEXT)
├── content (TEXT)
├── compliance_score (INTEGER, 0-100)
├── metadata (JSONB)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

search_history
├── id (UUID, PK)
├── user_id (UUID, FK to auth.users)
├── chat_id (UUID, FK to chats, nullable)
├── query (TEXT)
├── results_count (INTEGER)
├── metadata (JSONB)
└── created_at (TIMESTAMPTZ)
```

## Security Features

### Row Level Security (RLS)
All tables have RLS enabled with policies ensuring:
- Users can only access their own data
- No user can see another user's chats, messages, or documents
- Automatic user_id validation on all operations

### Storage Security
- Documents are stored in user-specific folders
- Each user can only access files in their own folder
- 5MB file size limit enforced
- Only allowed file types can be uploaded

## Utility Functions

### `handle_new_user()`
Automatically creates a profile when a user signs up.

### `handle_updated_at()`
Automatically updates the `updated_at` timestamp on record updates.

### `get_user_chats_with_counts(user_uuid)`
Returns user's chats with message counts and last message timestamp.

### `delete_chat_cascade(chat_uuid, user_uuid)`
Safely deletes a chat and all related data (messages, documents, reports).

## Troubleshooting

### Issue: "relation does not exist"
**Solution:** Make sure you ran the entire `supabase-setup.sql` script.

### Issue: "permission denied for table"
**Solution:** Check that RLS policies and explicit Data API grants were created. Re-run the latest `supabase-setup.sql` script.

### Issue: "new row violates row-level security policy"
**Solution:** Make sure you're authenticated and the user_id matches auth.uid().

### Issue: Storage upload fails
**Solution:** 
1. Verify the 'documents' bucket exists
2. Check that storage policies were applied
3. Ensure file size is under 5MB
4. Verify file type is allowed

### Issue: Profile not created on signup
**Solution:** 
1. Check that the `handle_new_user()` function exists
2. Verify the trigger `on_auth_user_created` is active
3. Check Supabase logs for errors

## Next Steps

After setup is complete:

1. ✅ Test user signup and login
2. ✅ Create a test chat
3. ✅ Send test messages
4. ✅ Upload a test document
5. ✅ Verify data appears in Supabase dashboard

## Production Checklist

Before going to production:

- [ ] Enable email confirmations
- [ ] Set up custom email templates
- [ ] Configure password requirements
- [ ] Set up database backups
- [ ] Review and test all RLS policies
- [ ] Set up monitoring and alerts
- [ ] Configure rate limiting
- [ ] Review storage limits and pricing
- [ ] Set up proper error logging
- [ ] Test all CRUD operations
- [ ] Verify realtime subscriptions work
- [ ] Load test with expected user volume

## Support

For issues with:
- **Supabase setup:** Check [Supabase Documentation](https://supabase.com/docs)
- **SQL errors:** Review the error message in SQL Editor
- **RLS issues:** Check [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- **Storage issues:** Check [Storage Guide](https://supabase.com/docs/guides/storage)

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime Guide](https://supabase.com/docs/guides/realtime)
