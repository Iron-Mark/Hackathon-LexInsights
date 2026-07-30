# Maintainers

## Source Of Truth

- App root: [repository root](../..)
- Source root: [src](../../src)
- Documentation root: [docs](../README.md)
- Specs: [docs/specs](../specs)
- Database scripts: [database](../../database) — base [schema.sql](../../database/schema.sql), [migrations](../../database/migrations), [storage.sql](../../database/storage.sql)

## Routine Checks

From the repository root, run the full local gate:

```powershell
npm run check:local
```

It chains lint, typecheck, unit tests (`npm run test`), `npm audit --omit=dev`, the docs/readiness/deployment/RAG/document/compliance-persistence/release self-tests, the PWA and screenshot checks, the production build, the bundle check, and the Playwright browser smoke. See [Testing](TESTING.md) for the individual commands and what each covers.

CI ([ci.yml](../../.github/workflows/ci.yml)) runs the gate battery — lint and unit tests through build, bundle check, and browser smoke — on every push to `main` and every pull request targeting `main`. A second workflow, [supabase-keepalive.yml](../../.github/workflows/supabase-keepalive.yml), pings Supabase on a schedule so the free-tier project does not pause.

## Release Checklist

- Verify `.env.example` still matches required runtime variables.
- Keep `ENABLE_DIAGNOSTIC_ROUTES=false` or unset for public deployments.
- Verify database changes are reflected in `database`, and that the target Supabase project has [database/migrations](../../database/migrations) applied (currently `0001_compliance_report_persistence.sql`) with Clerk configured as a Supabase third-party auth provider — without both, signed-in report persistence silently degrades to local-only.
- `npm audit --omit=dev` must pass clean. Remaining advisories are devDependency-only (eslint chain) and do not block release.
- Run `npm run check:release` before creating a release PR. After creating the release tag locally, run `npm run check:release:tag` before pushing the tag.
- Deploy, then run the pre-deployment, post-deployment, and live checks in [Deployment](DEPLOYMENT.md).
- Confirm no stray Markdown outside `docs` beyond the curated root set (`README.md`, `AGENTS.md`, `CHANGELOG.md`, `SECURITY.md`) and in-tree test fixtures.

## Cleanup Policy

Do not reintroduce implementation-summary Markdown files in the app root. Fold lasting information into the curated docs and delete stale progress reports after the implementation lands.
