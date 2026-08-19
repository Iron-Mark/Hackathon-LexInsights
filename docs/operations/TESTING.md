# Testing

Run commands from the repository root.

## Fast Checks

```bash
npm run lint -- --max-warnings=0
npx tsc --noEmit
npm run check:docs:self-test
npm run check:docs
npm run check:screenshots
```

## Unit Tests

```bash
npm run test
npm run test:watch
```

Vitest ([vitest.config.mts](../../vitest.config.mts)) runs `src/**/*.test.ts` (plus `tests/unit/**`) in the `node` environment, separate from the Playwright specs in `tests/e2e`. The current 35 tests cover the compliance-persistence layer (repository, sync, findings extractor) and local research framework matching (framework templates and framework selection). Unit tests run in CI and inside `npm run check:local`.

## Build

```bash
npm run build
npm run check:bundle
```

The build uses [build-with-metadata.mjs](../../scripts/build-with-metadata.mjs) so deployment metadata can be surfaced by `/api/version`.
The bundle check reads the completed `.next` output and fails on oversized generated assets or static chunks. It warns when providerless local RAG corpus markers appear in client chunks; use `npm run check:bundle -- --strict-client-rag` for releases that must be remote-only in the browser.

## Readiness

```bash
npm run check:readiness:self-test
npm run check:readiness -- --skip-external-checks
```

Use the full readiness check only when environment values point to reachable Supabase and RAG services:

```bash
npm run check:readiness
```

## Deployment Checks

```bash
npm run check:deployment:self-test
npm run check:live:self-test
npm run check:rag-proxy:self-test
npm run check:providerless:self-test
npm run check:local-rag:golden
npm run check:local-rag:answers
npm run check:local-rag:sources
npm run check:local-rag:performance
npm run check:local-rag:governance
npm run check:document-text:self-test
npm run check:document-extraction:self-test
npm run check:compliance-persistence:self-test
npm run check:supabase-keepalive:self-test
npm run check:release:self-test
npm run check:release
```

The providerless self-test exercises the local legal research and draft-checking engine directly, without network or browser dependencies.
The golden-query, answer-quality, performance, and governance checks validate exact-citation retrieval, citation variants, workflow queries, ranking diagnostics, confidence floors, forbidden-authority exclusions, corpus/source/relation/coverage-map integrity, source trust metadata, and no-result behavior across every corpus slice. Per-slice coverage and query terms live in [Providerless Research](../reference/PROVIDERLESS-RESEARCH.md) and the check scripts themselves.
When adding or updating a corpus slice, extend the golden, performance, and governance fixtures with exact-citation probes for each new authority plus one broad workflow query, and keep answers reminding users to verify live facts with official sources and qualified counsel.
The local RAG source-freshness check validates corpus-to-source and corpus-to-coverage parity, trusted HTTPS source hosts, sane catalog or verification dates, and provenance-note coverage. `npm run check:local-rag:sources:live` additionally samples 10 live source URLs with failures allowed; run it when refreshing source metadata.
The compliance-persistence self-test transpiles and asserts the report dual-write modules (repository, sync, findings extractor) with no database dependency.
The document text self-test covers browser-readable Markdown and text normalization plus unsupported, oversized, empty, and unknown-file handling.
The document extraction self-test generates deterministic PDF and DOCX fixtures and verifies server-side text extraction before draft checking.
The release integrity check verifies SemVer formatting, package-lock version sync, and release-tag consistency.

Against production:

```bash
$sha = (git rev-parse HEAD).Trim()
npm run check:deployment -- --base-url https://lexiph.vercel.app --expect-sha $sha
npm run check:live -- --base-url https://lexiph.vercel.app --expect-sha $sha
```

Before deploying a commit that is not live yet, use `npm run check:deployment -- --base-url https://lexiph.vercel.app --local-only` so the preflight does not compare production to a future SHA.

## Release Tag Check

Before publishing a GitHub release for an already-created tag, run:

```bash
npm run check:release:tag
```

This strict mode requires `HEAD` to have a matching `v<package version>` tag. Do not add it to regular CI because development commits after a release tag are expected.

## Browser Smoke

```bash
npm run smoke:browser
```

Playwright starts the dev server on `127.0.0.1:3100` unless `PLAYWRIGHT_BASE_URL` is set.

The smoke suite enables `ENABLE_DIAGNOSTIC_ROUTES=true` for its managed local server, stubs a failed RAG provider, and verifies that `/test-rag` still returns providerless local research. It also uploads a Markdown compliance draft through `/test-document` and verifies that the local draft checker returns a compliance analysis.

## Full Local Gate

```bash
npm run check:local
```

This is intentionally broad: lint, typecheck, unit tests, production dependency audit, docs checks, readiness self-test, deployment and live-deployment self-tests, RAG proxy self-test, providerless self-test, local RAG golden-query, answer-quality, source-freshness, performance, and governance checks, document text self-test, document extraction self-test, compliance-persistence self-test, release integrity checks, PWA check, screenshot check, build, bundle check, and browser smoke.

## Continuous Integration

CI ([.github/workflows/ci.yml](../../.github/workflows/ci.yml)) runs this battery — lint and unit tests through build, bundle check, and browser smoke — on every push to `main` and every pull request targeting `main`.
