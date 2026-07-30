# Setup

## Prerequisites

- Node.js 22 or newer.
- npm.
- Supabase project.
- Clerk application.
- Optional access to the RAG backend. The app defaults to local providerless research and can review Markdown, text, PDF, and Word drafts without an AI provider.

## Install

From the repository root:

```powershell
npm ci
```

## Environment

Create `.env.local` from [.env.example](../../.env.example).

Required values:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Optional remote RAG values:

```text
NEXT_PUBLIC_RAG_PROVIDER_MODE=remote-rag
NEXT_PUBLIC_RAG_API_URL=https://devkada.resqlink.org
NEXT_PUBLIC_RAG_WS_URL=wss://devkada.resqlink.org
NEXT_PUBLIC_USE_RAG_PROXY=true
```

Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for current Supabase projects. `NEXT_PUBLIC_SUPABASE_ANON_KEY` remains supported as a fallback for older local env files.

By default `NEXT_PUBLIC_RAG_PROVIDER_MODE` can be omitted or set to `local-providerless`. Set it to `remote` or `remote-rag` only when the remote provider is reachable and should be used before local fallbacks. Providerless behavior is documented in [Providerless Research](../reference/PROVIDERLESS-RESEARCH.md).

Compliance uploads support browser-readable `.md`, `.markdown`, `.txt`, and `.text` files directly. PDF, DOCX, and legacy DOC uploads are extracted through the internal `/api/document-text` route before the local draft checker runs. The upload limit is 5MB.

## Database

Run the SQL files in this order:

1. [database/schema.sql](../../database/schema.sql)
2. [database/migrations/0001_compliance_report_persistence.sql](../../database/migrations/0001_compliance_report_persistence.sql)
3. [database/storage.sql](../../database/storage.sql) after creating the private `documents` storage bucket
4. Optional seed data from one of:
   - [database/seed-admin.sql](../../database/seed-admin.sql)
   - [database/seed-ken.sql](../../database/seed-ken.sql)
   - [database/seed-mark.sql](../../database/seed-mark.sql)
   - [database/seed-mock.sql](../../database/seed-mock.sql)

The migration adds the `report_versions` and `report_findings` tables. Without it, server-side compliance-report persistence for signed-in users silently no-ops.

Also configure Clerk as a Supabase third-party auth provider in both dashboards. The browser client authenticates every Supabase request with a Clerk token ([src/lib/supabase/client.ts](../../src/lib/supabase/client.ts)), and all RLS and storage policies key on `auth.jwt()->>'sub'` resolving to the Clerk user id. Without this wiring, signed-in Supabase requests are denied.

See [Database](../reference/DATABASE.md) for the table and storage notes.

## Run Locally

```powershell
npm run dev
```

Open `http://localhost:3000`.

## Minimum Local Verification

```powershell
npm run lint -- --max-warnings=0
npx tsc --noEmit
npm run test
npm run check:docs:self-test
npm run check:docs
npm run build
```

For the full local gate, run:

```powershell
npm run check:local
```
