# AGENTS.md

## Scope

LexInsights v0.5.2 — Philippine legal research and compliance assistant (chat,
document review, providerless local RAG, cited compliance reports). Live at
https://lexiph.vercel.app. Work happens on `main` in this fork
(`origin` = Iron-Mark/Hackathon-LexInsights; `upstream` = KpG782/Lexinsights,
push disabled).

## Environment / Stack

- Node.js + **npm** (`package-lock.json`; no other lockfiles).
- Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4.
- Clerk (auth), Supabase (DB/storage — schema and seeds in `database/*.sql`),
  Zustand, Playwright (browser smoke tests in `tests/e2e`).
- Source in `src/` (`app`, `components`, `hooks`, `lib`, `types`, `proxy.ts`).
- QA gates are plain Node scripts in `scripts/check-*.mjs`; CI is
  `.github/workflows/ci.yml`. Docs root: `docs/README.md`.

## Key commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (http://localhost:3000) |
| Lint | `npm run lint -- --max-warnings=0` |
| Typecheck | `npx tsc --noEmit` |
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

Providerless local research is the default mode; the app runs without external
RAG provider values.

## Current status

- Branch `main`, in sync with `origin/main`; tree clean apart from this
  untracked (deliberately uncommitted) `AGENTS.md`.
- Last release: 0.5.2 (commit 569983a release note in
  `docs/operations/RELEASE-2026-07-01-569983a.md`); recent commits cover AI
  discovery (`/ai.txt`), analytics, and RAG QA hardening.
- No known blockers; active project (not archived).

Last verified: 2026-07-22 (workspace AGENTS.md refresh pass).
