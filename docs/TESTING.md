# Testing

Run commands from [lexiph](../lexiph).

## Fast Checks

```powershell
npm run lint -- --max-warnings=0
npx tsc --noEmit
npm run check:docs:self-test
npm run check:docs
```

## Build

```powershell
npm run build
```

The build uses [build-with-metadata.mjs](../lexiph/scripts/build-with-metadata.mjs) so deployment metadata can be surfaced by `/api/version`.

## Readiness

```powershell
npm run check:readiness:self-test
npm run check:readiness -- --skip-external-checks
```

Use the full readiness check only when environment values point to reachable Supabase and RAG services:

```powershell
npm run check:readiness
```

## Deployment Checks

```powershell
npm run check:deployment:self-test
npm run check:live:self-test
npm run check:rag-proxy:self-test
npm run check:providerless:self-test
npm run check:release:self-test
npm run check:release
```

The providerless self-test covers the local legal research and draft-checking engine directly, without network or browser dependencies.
The release integrity check verifies SemVer formatting, package-lock version sync, and release-tag consistency.

Against production:

```powershell
npm run check:deployment -- --base-url https://lexiph.vercel.app
npm run check:live -- --base-url https://lexiph.vercel.app
```

## Release Tag Check

Before publishing a GitHub release for an already-created tag, run:

```powershell
npm run check:release:tag
```

This strict mode requires `HEAD` to have a matching `v<package version>` tag. Do not add it to regular CI because development commits after a release tag are expected.

## Browser Smoke

```powershell
npm run smoke:browser
```

Playwright starts the dev server on `127.0.0.1:3100` unless `PLAYWRIGHT_BASE_URL` is set.

The smoke suite stubs a failed RAG provider and verifies that `/test-rag` still returns providerless local research.

## Full Local Gate

```powershell
npm run check:local
```

This is intentionally broad: lint, typecheck, production dependency audit, docs checks, readiness self-tests, deployment self-tests, RAG proxy self-test, providerless self-test, release integrity checks, PWA check, build, and browser smoke.
