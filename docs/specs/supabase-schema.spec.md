# Supabase Database Schema

Last verified: 2026-07-30.

## Overview

Supabase is the database and storage backend. Clerk is the source of authentication and is deployed as a Supabase Third-Party Auth provider in production. RLS policies authorize rows by comparing the Clerk user ID claim to app-owned `TEXT` user columns:

```sql
USING ((SELECT auth.jwt()->>'sub') = user_id)
```

The SQL files are the source of truth — this spec only maps them:

- [database/schema.sql](../../database/schema.sql) - base schema (extensions, tables, RLS, indexes, triggers, grants, RPC helpers).
- [database/migrations/0001_compliance_report_persistence.sql](../../database/migrations/0001_compliance_report_persistence.sql) - P0-1 report-persistence tables (idempotent; run after schema.sql).
- [database/storage.sql](../../database/storage.sql) - storage policies for the private `documents` bucket.

See [docs/reference/DATABASE.md](../reference/DATABASE.md) for operational detail.

## Tables

| Table | Defined in | Notes |
| --- | --- | --- |
| `profiles` | schema.sql | `id TEXT PRIMARY KEY` = Clerk user id; `email TEXT UNIQUE NOT NULL`; SELECT/UPDATE/INSERT policies |
| `chats` | schema.sql | `mode` CHECK (`general`/`compliance`); full CRUD policies |
| `messages` | schema.sql | Ownership checked through the parent chat in all four policies |
| `documents` | schema.sql | `status` CHECK (`pending`/`processing`/`completed`/`failed`); full CRUD policies |
| `compliance_reports` | schema.sql | `compliance_score` CHECK 0-100; written by the P0-1 dual-write mirror |
| `search_history` | schema.sql | SELECT/INSERT/DELETE policies (no UPDATE) |
| `report_versions` | migrations/0001 | Append-only version audit trail: no `updated_at`, UPDATE withheld at the grant level |
| `report_findings` | migrations/0001 | Normalized findings and checklist items per report (severity, citation, checklist state) |

All tables use `uuid_generate_v4()` for UUID primary keys (except `profiles`, keyed by the Clerk `TEXT` id) and RLS keyed to `auth.jwt()->>'sub'`. The migration's INSERT policies for `report_versions` and `report_findings` additionally verify the parent report belongs to the caller, so users cannot attach rows to another user's report by guessing its UUID.

The app writes `compliance_reports`, `report_versions`, and `report_findings` through `src/lib/services/compliance-persistence/supabase-repository.ts` as a mirror of the local IndexedDB store (signed-in users only; guests are local-only).

## Storage Buckets

- `documents`: private uploaded PDF, Word, Markdown, and text files.
- Object paths must start with the Clerk user ID: `user_.../file-name`.
- [database/storage.sql](../../database/storage.sql) implements the four policies (upload/view/update/delete) keyed to the Clerk user-id top-level folder.

## Auth Configuration

Deployed in production:

- Clerk is configured as a Supabase Third-Party Auth provider.
- Clerk session tokens include the role claim expected by Supabase.
- The app passes Clerk session tokens through the Supabase client `accessToken` callback (`src/lib/supabase/client.ts`).

## Data API Grants

New Supabase projects may not expose public tables to the Data API automatically. `schema.sql` explicitly grants the `authenticated` role CRUD access to app tables after RLS policies are enabled; migration 0001 grants `SELECT, INSERT, DELETE` (no UPDATE) on `report_versions` and full CRUD on `report_findings`.
