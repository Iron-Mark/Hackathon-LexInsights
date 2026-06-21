# Maintainers

## Source Of Truth

- App root: [repository root](../..)
- Source root: [src](../../src)
- Documentation root: [docs](../README.md)
- Specs: [docs/specs](../specs)
- Database scripts: [database](../../database)

## Routine Checks

```powershell
cd "C:\Users\ultim\_ Local Codes\Hackathon-LexInsights"
npm run lint -- --max-warnings=0
npx tsc --noEmit
npm run check:docs:self-test
npm run check:docs
npm run check:providerless:self-test
npm run check:document-text:self-test
npm run check:document-extraction:self-test
npm run check:release:self-test
npm run check:release
npm run build
```

Run `npm run check:local` before release branches when credentials and browser dependencies are available.

## Release Checklist

- Verify `.env.example` still matches required runtime variables.
- Keep `ENABLE_DIAGNOSTIC_ROUTES=false` or unset for public deployments.
- Verify database changes are reflected in `database`.
- Verify `/api/version` and `/api/readiness` locally.
- With `ENABLE_DIAGNOSTIC_ROUTES=true`, verify `/test-rag` returns providerless local research when the RAG provider is unavailable.
- With `ENABLE_DIAGNOSTIC_ROUTES=true`, verify `/test-document` can upload a Markdown sample and return a compliance analysis.
- Run `npm run check:release` before creating a release PR.
- After creating the release tag locally, run `npm run check:release:tag` before pushing the tag.
- Deploy with Vercel root directory set to the repository root.
- Run production deployment and live checks.
- Confirm docs have no Markdown outside root `docs`.

## Cleanup Policy

Do not reintroduce implementation-summary Markdown files in the app root. Fold lasting information into the curated docs and delete stale progress reports after the implementation lands.
