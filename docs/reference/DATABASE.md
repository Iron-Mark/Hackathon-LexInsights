# Database

Supabase SQL is centralized under [database](../../database).

## Scripts

Run these in order from the Supabase SQL editor:

1. [schema.sql](../../database/schema.sql) - tables, indexes, RLS policies, and grants.
2. [storage.sql](../../database/storage.sql) - storage bucket and file policies.
3. Optional seed data:
   - [seed-admin.sql](../../database/seed-admin.sql)
   - [seed-ken.sql](../../database/seed-ken.sql)
   - [seed-mark.sql](../../database/seed-mark.sql)
   - [seed-mock.sql](../../database/seed-mock.sql)

## Runtime Client

The app client is [client.ts](../../src/lib/supabase/client.ts). It reads:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` as a backward-compatible fallback

Clerk session integration is wired through the session provider and Supabase access token getter.

## Main Data Areas

- User profiles and auth-linked records.
- Chats and messages.
- Uploaded document metadata.
- Storage bucket objects for user documents.

The source of truth for exact table definitions is [database/schema.sql](../../database/schema.sql).

## Operational Notes

- Re-run `schema.sql` after schema changes.
- Re-run `storage.sql` after storage policy changes.
- Never expose Supabase secret keys through `NEXT_PUBLIC_*` variables.
- Prefer publishable keys for current Supabase projects.
