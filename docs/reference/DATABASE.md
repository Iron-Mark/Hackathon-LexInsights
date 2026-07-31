# Database

Supabase SQL is centralized under [database](../../database).

## Scripts

Run these in order from the Supabase SQL editor:

1. [schema.sql](../../database/schema.sql) - base tables, indexes, RLS policies, and grants.
2. [database/migrations](../../database/migrations) - numbered migrations, in filename order. Currently [0001_compliance_report_persistence.sql](../../database/migrations/0001_compliance_report_persistence.sql); it is required for compliance-report server persistence.
3. [storage.sql](../../database/storage.sql) - storage policies for the private `documents` bucket (create the bucket in the dashboard first; the file header documents the bucket settings).
4. Optional seed data:
   - [seed-admin.sql](../../database/seed-admin.sql)
   - [seed-ken.sql](../../database/seed-ken.sql)
   - [seed-mark.sql](../../database/seed-mark.sql)
   - [seed-mock.sql](../../database/seed-mock.sql)

## Migrations

[0001_compliance_report_persistence.sql](../../database/migrations/0001_compliance_report_persistence.sql) (idempotent, run after `schema.sql`) provisions the P0-1 server persistence path:

- `report_versions` - append-only audit trail of saved report versions. Immutable by design: no `updated_at` column and UPDATE is withheld at the grant level, so version history cannot be rewritten.
- `report_findings` - normalized findings and checklist rows extracted from each report, enabling severity filters and rollups.
- INSERT policies on both tables verify the parent `compliance_reports` row belongs to the caller, so a user cannot attach rows to another user's report by guessing its UUID.

## Runtime Client

The app client is [client.ts](../../src/lib/supabase/client.ts). It reads:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` as a backward-compatible fallback

Clerk is the auth provider, live in production via Supabase third-party auth: the client passes the Clerk session token through the `accessToken` callback in `client.ts`, and every RLS policy keys on `(SELECT auth.jwt()->>'sub')`, which resolves to the Clerk user id (TEXT, `user_...`). The four `storage.objects` policies in [storage.sql](../../database/storage.sql) apply the same pattern, requiring the Clerk user id as the top-level folder of each object path.

## Main Data Areas

Tables in `schema.sql`:

- `profiles` - user profiles keyed to the Clerk user id.
- `chats` and `messages` - chat history.
- `documents` - uploaded document metadata.
- `compliance_reports` - latest state of each saved compliance report.
- `search_history` - saved research queries.

Tables added by migration 0001: `report_versions` and `report_findings` (see Migrations above). Storage bucket objects for user documents are governed by `storage.sql`.

Compliance reports use a dual-write model: IndexedDB in the browser is the local source of truth, Supabase is the mirror for signed-in users, and guests are local-only ([factory.ts](../../src/lib/services/compliance-persistence/factory.ts), [sync.ts](../../src/lib/services/compliance-persistence/sync.ts)). A server failure never blocks a local save.

The source of truth for exact table definitions is [database/schema.sql](../../database/schema.sql) plus the migrations.

## Operational Notes

- Re-run `schema.sql` after schema changes; apply any new files in `database/migrations/` in filename order.
- Re-run `storage.sql` after storage policy changes.
- Never expose Supabase secret keys through `NEXT_PUBLIC_*` variables.
- Prefer publishable keys for current Supabase projects.
