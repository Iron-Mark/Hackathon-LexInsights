# Troubleshooting

Run commands from [lexiph](../lexiph) unless noted.

## Install Fails

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

Prefer `npm ci` when `package-lock.json` is already valid and dependencies should not change.

## TypeScript Cannot Resolve `@/...`

`@/*` maps to `src/*` in [tsconfig.json](../lexiph/tsconfig.json). If a file moved into `src`, imports should continue to use `@/...`. If a file is intentionally outside `src`, import it with an explicit relative path.

## Clerk Redirects Unexpectedly

Check:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- Clerk redirect URLs in `.env.local`
- The route protection rules in [proxy.ts](../lexiph/src/proxy.ts)

## Supabase Requests Fail

Check:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- RLS policies from [database/schema.sql](../lexiph/database/schema.sql)
- Storage policies from [database/storage.sql](../lexiph/database/storage.sql)

Run:

```powershell
npm run check:readiness -- --skip-external-checks
```

Use the full readiness check when the external services should be reachable.

## RAG Requests Fail

The app should still answer through local providerless research when the RAG provider is down. Check the response metadata for `provider_mode=local-providerless`.

Keep proxy mode enabled unless the backend supports CORS:

```text
NEXT_PUBLIC_USE_RAG_PROXY=true
```

Check proxy health:

```powershell
curl "http://localhost:3000/api/rag-proxy?endpoint=/api/research/health"
```

If the proxy returns an upstream error, verify `NEXT_PUBLIC_RAG_API_URL` and backend availability.

If local mode does not return a result, try a narrower query with a statute number such as `RA 9003`, `RA 10173`, `RA 11058`, `RA 7160`, or `RA 10121`. The local corpus is intentionally limited and does not search live government sites.

For draft checks, upload plain text or Markdown when working without a provider. PDF and Word files require backend extraction before their text can be reviewed.

## Markdown Link Check Fails

All Markdown should live in [docs](./README.md). Update links relative to the file containing the link, then run:

```powershell
npm run check:docs:self-test
npm run check:docs
```

## Production Serves Old Code

Check:

```powershell
curl https://lexiph.vercel.app/api/version
```

If the route is missing, Vercel is likely not using `lexiph` as the root directory or is serving a stale project.
