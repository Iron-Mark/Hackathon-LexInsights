# Supabase Setup

## Database Schema Setup

Use the root setup scripts as the source of truth:

1. Run `supabase-setup.sql` in the Supabase SQL Editor.
2. Create the private `documents` storage bucket.
3. Run `supabase-storage-setup.sql` after the bucket exists.

The setup creates the runtime tables used by the app:

- `profiles`
- `chats`
- `messages`
- `documents`
- `compliance_reports`
- `search_history`

It also enables RLS, creates ownership policies, and grants the `authenticated` role Data API access to these tables. The explicit grants matter for newer Supabase projects where public tables may not be exposed through the Data API automatically.

## Verification

After running the SQL, verify the setup:

1. Confirm the six runtime tables exist in the Supabase table editor.
2. Confirm RLS is enabled on all six runtime tables.
3. Confirm the `documents` storage bucket exists and is private.
4. Confirm storage policies allow users to access only their own user-id folder.
5. Sign up in the app, create a chat, send a message, and upload a small `.txt` or `.md` document.

## Client Configuration

The Supabase client is configured in `client.ts` and uses the following environment variables from `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

These are already configured in the project.
