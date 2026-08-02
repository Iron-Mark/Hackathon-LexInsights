# AGENTS.md

Canonical agent instructions for this repository, in the cross-vendor
`AGENTS.md` convention. `CLAUDE.md` is a pointer to this file, not a second
source — keep all guidance here so the two cannot drift.

## Scope

LexInsights v0.5.2 — Philippine legal research and compliance assistant (chat,
document review, providerless local RAG, cited compliance reports). Live at
https://lexiph.vercel.app. Work happens on `main`; `origin` =
Iron-Mark/Hackathon-LexInsights (a fork of KpG782/Lexinsights — do not assume
an `upstream` remote is configured in your checkout).

## Environment / Stack

- Node.js + **npm** (`package-lock.json`; no other lockfiles).
- Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4.
- Clerk (auth; Supabase third-party auth with Clerk is live in production),
  Supabase (DB/storage — base schema and seeds in `database/*.sql`, numbered
  migrations in `database/migrations/` that must also be applied), Zustand.
- Tests: Vitest unit tests (`vitest.config.mts`, colocated `*.test.ts`) and
  Playwright browser smoke tests in `tests/e2e`.
- Source in `src/` (`app`, `components`, `hooks`, `lib`, `types`, `proxy.ts`).
  Largest recent subsystem: compliance report persistence in
  `src/lib/services/compliance-persistence/` (repository, supabase-repository,
  factory, sync, findings-extractor) plus
  `src/lib/store/compliance-server-sync.ts`; self-test via
  `npm run check:compliance-persistence:self-test`.
- QA gates are plain Node scripts in `scripts/check-*.mjs`. Workflows:
  `.github/workflows/ci.yml` (CI) and
  `.github/workflows/supabase-keepalive.yml` (Supabase keep-alive).
  Docs root: `docs/README.md`.

## Key commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (http://localhost:3000) |
| Lint | `npm run lint -- --max-warnings=0` |
| Typecheck | `npx tsc --noEmit` |
| Unit tests | `npm run test` (Vitest; watch mode: `npm run test:watch`) |
| Build | `npm run build` (runs `scripts/build-with-metadata.mjs`) |
| Browser smoke tests | `npm run smoke:browser` (Playwright) |
| Full local release gate | `npm run check:local` |
| Docs / release / PWA checks | `npm run check:docs` / `check:release` / `check:pwa` |
| Production verify | `npm run check:live -- --base-url https://lexiph.vercel.app` |
| Deploy | `npm run deploy:prod` (Vercel) |

Many more granular `check:*` scripts exist — see `package.json` "scripts".

## Secrets / env

Copy `.env.example` to `.env.local`; never commit values. Key names:

- Site: `NEXT_PUBLIC_SITE_URL`
- Clerk: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, plus
  `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `SIGN_UP_URL` / fallback-redirect URLs
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- RAG: `NEXT_PUBLIC_RAG_PROVIDER_MODE`, `NEXT_PUBLIC_RAG_API_URL`,
  `NEXT_PUBLIC_RAG_WS_URL`, `NEXT_PUBLIC_RAG_BACKEND_ISSUE_URL`,
  `NEXT_PUBLIC_USE_RAG_PROXY`
- Diagnostics: `ENABLE_DIAGNOSTIC_ROUTES`
- Server-only, optional (not in `.env.example`): `PUBLIC_API_LOG_HASH_SALT`
  (see `src/lib/server/request-guardrails.ts`)

Providerless local research is the default mode; the app runs without external
RAG provider values.

## Status pointers

- Feature status: `docs/PRD.md` — its dated per-requirement status lines are
  the source of truth for what has shipped.
- Change history: `CHANGELOG.md` and `git log`.
- Last tagged release: 0.5.2
  (`docs/operations/RELEASE-2026-07-01-569983a.md`).

Last verified: 2026-07-30.
