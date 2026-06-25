# App Root Migration

The Next.js app now lives at the repository root. Contributors can open `Hackathon-LexInsights/`, run `npm ci`, and use npm scripts without changing into a nested app folder.

## Current Layout

```text
Hackathon-LexInsights/
|-- .github/
|-- .vscode/
|-- database/
|-- docs/
|-- public/
|-- scripts/
|-- src/
|-- tests/
|-- .env.example
|-- .gitignore
|-- components.json
|-- eslint.config.mjs
|-- next.config.ts
|-- package-lock.json
|-- package.json
|-- playwright.config.ts
|-- postcss.config.mjs
`-- tsconfig.json
```

## What Changed

- App source moved from the old nested app folder to `src/`.
- Static assets moved to `public/`.
- Supabase SQL moved to `database/`.
- Local, CI, readiness, release, and deployment scripts moved to `scripts/`.
- Playwright tests moved to `tests/`.
- `package.json`, `package-lock.json`, Next.js, TypeScript, ESLint, PostCSS, Playwright, and component config files moved to the repository root.
- The root `.gitignore` now covers Node, Next.js, Playwright, Vercel, environment, and TypeScript generated files.
- GitHub Actions now runs from the repository root and caches `package-lock.json`.

## Generated Files

Keep generated and local-only files out of git:

- `node_modules/`
- `.next/`
- `.tmp/`
- `.tmp/test-results/`
- `.tmp/playwright-report/`
- legacy root `test-results/`
- legacy root `playwright-report/`
- `.vercel/`
- `*.tsbuildinfo`
- `next-env.d.ts`
- `.env.local`

## Root App Assumptions

- `tsconfig.json` keeps `baseUrl: "."` and `@/* -> ./src/*`.
- `next.config.ts` keeps `turbopack.root = path.resolve(__dirname)`, now resolving to the repository root.
- `components.json` keeps `src/app/globals.css` and `@/...` aliases.
- `playwright.config.ts` keeps `testDir: ./tests/e2e`.
- `src/app/api/version/route.ts` imports `../../../../package.json`, which remains correct from `src/app/api/version/route.ts` to the root `package.json`.

## Validation

Run from the repository root:

```powershell
npm ci
npm run lint -- --max-warnings=0
npx tsc --noEmit
npm run check:docs:self-test
npm run check:docs
npm run check:readiness:self-test
npm run check:deployment:self-test
npm run check:live:self-test
npm run check:rag-proxy:self-test
npm run check:providerless:self-test
npm run check:document-text:self-test
npm run check:document-extraction:self-test
npm run check:release:self-test
npm run check:release
npm run check:pwa
npm run build
npm run smoke:browser
```

## Deployment Cutover

In Vercel, set the project Root Directory to the repository root. Keep the build and install commands unchanged unless Vercel has explicit overrides:

- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: Next.js default

After changing the Vercel root, run:

```powershell
npm run check:deployment -- --base-url https://lexiph.vercel.app
npm run check:live -- --base-url https://lexiph.vercel.app
```
