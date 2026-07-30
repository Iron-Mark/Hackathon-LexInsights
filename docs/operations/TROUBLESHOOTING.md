# Troubleshooting

Run commands from the repository root unless noted.

## Install Fails

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

Prefer `npm ci` when `package-lock.json` is already valid and dependencies should not change.

## TypeScript Cannot Resolve `@/...`

`@/*` maps to `src/*` in [tsconfig.json](../../tsconfig.json). If a file moved into `src`, imports should continue to use `@/...`. If a file is intentionally outside `src`, import it with an explicit relative path.

## Clerk Redirects Unexpectedly

Check:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- Clerk redirect URLs in `.env.local`
- The route protection rules in [proxy.ts](../../src/proxy.ts)

## Clerk Fails With Worker CSP Violations

The CSP in [next.config.ts](../../next.config.ts) includes `worker-src 'self' blob:` because Clerk spawns blob workers. If the browser console reports worker CSP violations, the deployment or fork is serving a config without that directive; redeploy with the current one.

## Supabase Requests Fail

Check:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Clerk is configured as a Supabase third-party auth provider. The client authenticates with a Clerk token ([src/lib/supabase/client.ts](../../src/lib/supabase/client.ts)), and every policy keys on `auth.jwt()->>'sub'` resolving to the Clerk user id; without this wiring, RLS denies all signed-in requests.
- RLS policies from [database/schema.sql](../../database/schema.sql) and [database/migrations/0001_compliance_report_persistence.sql](../../database/migrations/0001_compliance_report_persistence.sql)
- Storage policies from [database/storage.sql](../../database/storage.sql)

Known production failure modes:

- `401` on table requests while signed in: usually a stale Clerk session issued before the Supabase third-party auth integration was enabled. Sign out and back in to mint a fresh token.
- `400` on `documents` bucket requests: [database/storage.sql](../../database/storage.sql) was never applied, so `storage.objects` has no policies for the bucket. Apply it in the SQL editor.
- SQL looks applied but tables or policies are missing: the Supabase SQL editor runs only the highlighted selection when text is selected. Clear the selection (or select the entire file) before running schema, migration, or storage SQL.

Run:

```powershell
npm run check:readiness -- --skip-external-checks
```

Use the full readiness check when the external services should be reachable.

## Compliance Report Missing on Another Device

Compliance reports dual-write: IndexedDB is the local source of truth, and signed-in users mirror reports to Supabase in the background. Guests stay local-only by design, and a server failure never blocks the local save (a one-time toast reports it). If a signed-in user's reports do not appear on another device:

- Confirm [database/migrations/0001_compliance_report_persistence.sql](../../database/migrations/0001_compliance_report_persistence.sql) was applied; without it, the server mirror silently no-ops.
- Confirm Clerk third-party auth is wired in Supabase (see above), and sign out and back in if table requests return `401`.
- Run `npm run check:compliance-persistence:self-test` to validate the persistence layer itself.

## RAG Requests Fail

The app should answer through local providerless research by default. Check the response metadata for `provider_mode=local-providerless`.

Remote RAG is opt-in:

```text
NEXT_PUBLIC_RAG_PROVIDER_MODE=remote-rag
```

Keep proxy mode enabled unless the backend supports CORS:

```text
NEXT_PUBLIC_USE_RAG_PROXY=true
```

Check proxy health:

```powershell
curl "http://localhost:3000/api/rag-proxy?endpoint=/api/research/health"
```

If the proxy returns an upstream error in remote mode, verify `NEXT_PUBLIC_RAG_API_URL` and backend availability.

If local mode does not return a result, try a narrower query with an exact statute or issuance citation such as `RA 10173`, `NPC Circular No. 16-03`, `RA 10175`, `RA 11976`, or `DOLE Department Order No. 147-15`, or add concrete slice-specific terms (for example `beneficial ownership disclosure`, `tax declaration`, or `pre-emptive evacuation`). The local corpus is intentionally bounded and does not search live government sites; per-slice coverage and suggested query terms are documented in [Providerless Research](../reference/PROVIDERLESS-RESEARCH.md).

Providerless answers cannot verify live portal behavior, filings, registration status, fund balances, or case-specific facts. Confirm those with the relevant agency, current official issuances, and qualified counsel.

For draft checks, upload Markdown, plain text, PDF, DOCX, or DOC files up to 5MB. Markdown and text files are read in the browser. PDF and Word files are posted to `/api/document-text` for server-side extraction before their text is reviewed.

## Document Extraction Fails

Check the upload type, size, and count first:

- Supported: `.md`, `.markdown`, `.txt`, `.text`, `.pdf`, `.docx`, `.doc`
- Maximum size: 5MB
- Maximum 3 documents per session

If a PDF upload fails with a `422` from `/api/document-text` (`Document extraction did not find readable text`), it is most likely a scanned image-only PDF. OCR is intentionally not bundled, so this is expected behavior, not a regression. Convert the document to selectable text before uploading.

Run the focused checks:

```powershell
npm run check:document-text:self-test
npm run check:document-extraction:self-test
```

## Unit Tests Fail

```powershell
npm run test
npm run test:watch
```

Vitest is configured in [vitest.config.mts](../../vitest.config.mts); tests are co-located as `src/**/*.test.ts` and run in the `node` environment. The same `npm run test` runs in CI and inside `npm run check:local`.

## Markdown Link Check Fails

All Markdown should live in [docs](../README.md). Update links relative to the file containing the link, then run:

```powershell
npm run check:docs:self-test
npm run check:docs
```

## Production Serves Old Code

Check:

```powershell
curl https://lexiph.vercel.app/api/version
```

If the route is missing, Vercel is likely not using the repository root as the root directory or is serving a stale project.
