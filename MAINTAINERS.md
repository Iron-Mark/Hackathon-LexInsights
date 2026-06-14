# Maintainers

LexInSight is maintained from the fork repository at `Iron-Mark/Hackathon-LexInsights`.

## Source Of Truth

- App root: `lexiph`
- Default branch: `main`
- Package manager: `npm`
- Required local gate:
  - `npm run check:local`
- Expanded local gates, when debugging one layer at a time:
  - `npm run lint -- --max-warnings=0`
  - `npx tsc --noEmit`
  - `npm audit --omit=dev`
  - `npm run check:readiness:self-test`
  - `npm run check:deployment:self-test`
  - `npm run check:rag-proxy:self-test`
  - `npm run build`
  - `npm run smoke:browser`
  - `npm run check:readiness` after backend env is available
- Required live gate after production deploy:
  - `npm run check:deployment -- --base-url https://lexinsights.vercel.app`
  - `npm run check:deployment -- --base-url https://lexinsights.vercel.app --with-vercel-cli` when diagnosing Vercel ownership/linkage
  - `npm run check:live -- --base-url https://lexinsights.vercel.app --source-only`
  - `npm run check:live -- --base-url https://lexinsights.vercel.app`

## Maintenance Priorities

1. Keep dependencies patched and audit-clean.
2. Keep Supabase and RAG environment setup documented in `lexiph/.env.example`.
3. Preserve zero-warning lint as the baseline.
4. Replace mock compliance analysis with real backend-backed document analysis.
5. Keep README clone/deploy instructions aligned with the maintained fork.

## Release Checklist

- Confirm `main` is clean.
- Run `npm run check:local`.
- Verify key routes: `/`, `/auth/login`, `/chat`, `/documents`, `/test-rag`.
- Confirm GitHub Actions CI is green after push.
- Run the deployment preflight and resolve stale Vercel linkage before live QA.
- Confirm the live deployment exposes the expected commit through `/api/version`.
- Commit with a clear Conventional Commit message.
- Push to `origin/main`.
