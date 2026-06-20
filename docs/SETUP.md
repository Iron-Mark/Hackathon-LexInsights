# Setup

## Prerequisites

- Node.js 22 or newer.
- npm.
- Supabase project.
- Clerk application.
- Optional access to the RAG backend. The app defaults to local providerless research and can review Markdown, text, PDF, and Word drafts without an AI provider.

## Install

```powershell
cd "C:\Users\ultim\_ Local Codes\Hackathon-LexInsights\lexiph"
npm ci
```

## Environment

Create `lexiph/.env.local` from [lexiph/.env.example](../lexiph/.env.example).

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

By default `NEXT_PUBLIC_RAG_PROVIDER_MODE` can be omitted or set to `local-providerless`. Set it to `remote` or `remote-rag` only when the remote provider is reachable and should be used before local fallbacks. Providerless behavior is documented in [Providerless Research](./PROVIDERLESS-RESEARCH.md).

Compliance uploads support browser-readable `.md`, `.markdown`, `.txt`, and `.text` files directly. PDF, DOCX, and legacy DOC uploads are extracted through the internal `/api/document-text` route before the local draft checker runs. The upload limit is 5MB.

## Database

Run the SQL files in this order:

1. [database/schema.sql](../lexiph/database/schema.sql)
2. [database/storage.sql](../lexiph/database/storage.sql)
3. Optional seed data from one of:
   - [database/seed-admin.sql](../lexiph/database/seed-admin.sql)
   - [database/seed-ken.sql](../lexiph/database/seed-ken.sql)
   - [database/seed-mark.sql](../lexiph/database/seed-mark.sql)
   - [database/seed-mock.sql](../lexiph/database/seed-mock.sql)

See [Database](./DATABASE.md) for the table and storage notes.

## Run Locally

```powershell
npm run dev
```

Open `http://localhost:3000`.

## Minimum Local Verification

```powershell
npm run lint -- --max-warnings=0
npx tsc --noEmit
npm run check:docs:self-test
npm run check:docs
npm run build
```

For the full local gate, run:

```powershell
npm run check:local
```
