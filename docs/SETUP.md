# Setup

## Prerequisites

- Node.js 22 or newer.
- npm.
- Supabase project.
- Clerk application.
- Optional access to the RAG backend. The app still provides local providerless research and Markdown/text draft checks when no RAG provider is reachable.

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
NEXT_PUBLIC_RAG_API_URL=https://devkada.resqlink.org
NEXT_PUBLIC_RAG_WS_URL=wss://devkada.resqlink.org
NEXT_PUBLIC_USE_RAG_PROXY=true
```

Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for current Supabase projects. `NEXT_PUBLIC_SUPABASE_ANON_KEY` remains supported as a fallback for older local env files.

If these RAG values are omitted or point to an unavailable provider, LexInSight falls back to the bundled providerless research engine documented in [Providerless Research](./PROVIDERLESS-RESEARCH.md).

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
