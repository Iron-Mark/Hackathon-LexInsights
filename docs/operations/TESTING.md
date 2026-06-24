# Testing

Run commands from the repository root(../..).

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

The build uses [build-with-metadata.mjs](../../scripts/build-with-metadata.mjs) so deployment metadata can be surfaced by `/api/version`.

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
npm run check:local-rag:golden
npm run check:local-rag:performance
npm run check:document-text:self-test
npm run check:document-extraction:self-test
npm run check:release:self-test
npm run check:release
```

The providerless self-test covers the local legal research and draft-checking engine directly, without network or browser dependencies.
The local RAG golden-query check covers exact citations, citation variants, AI governance guidance, cross-law workflows, ranking diagnostics, source trust metadata, and no-result behavior.
The local RAG performance check covers uncached exact-citation, AI-governance, deep-workflow, unrelated no-result, and warm-cache local queries.
The document text self-test covers browser-readable Markdown and text normalization plus unsupported, oversized, empty, and unknown-file handling.
The document extraction self-test generates deterministic PDF and DOCX fixtures and verifies server-side text extraction before draft checking.
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

The smoke suite enables `ENABLE_DIAGNOSTIC_ROUTES=true` for its managed local server, stubs a failed RAG provider, and verifies that `/test-rag` still returns providerless local research. It also uploads a Markdown compliance draft through `/test-document` and verifies that the local draft checker returns a compliance analysis.

## Full Local Gate

```powershell
npm run check:local
```

This is intentionally broad: lint, typecheck, production dependency audit, docs checks, readiness self-tests, deployment self-tests, RAG proxy self-test, providerless self-test, local RAG golden-query check, local RAG performance check, document text self-test, document extraction self-test, release integrity checks, PWA check, build, and browser smoke.
