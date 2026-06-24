# Troubleshooting

Run commands from the repository root(../..) unless noted.

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

## Supabase Requests Fail

Check:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- RLS policies from [database/schema.sql](../../database/schema.sql)
- Storage policies from [database/storage.sql](../../database/storage.sql)

Run:

```powershell
npm run check:readiness -- --skip-external-checks
```

Use the full readiness check when the external services should be reachable.

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

If local mode does not return a result, try a narrower query with a statute number such as `RA 9003`, `RA 10173`, `RA 11058`, `RA 7160`, `RA 10121`, `RA 10667`, `RA 11765`, `RA 11934`, `RA 11976`, `RA 4136`, `RA 11659`, `PD 1529`, `RA 8371`, `RA 8435`, `RA 10068`, `RA 10611`, `RA 11321`, `RA 3019`, `RA 6713`, `PD 1445`, `RA 7080`, `RA 10149`, `RA 6758`, `PD 442`, `RA 8293`, `RA 8799`, `RA 9711`, `RA 11223`, `RA 11036`, `RA 9262`, `RA 9994`, `RA 7277`, `PD 1096`, `PD 856`, `BP 344`, `RA 7610`, `RA 8042`, `RA 1405`, `RA 7581`, `RA 9513`, `RA 9729`, `RA 7942`, `RA 10533`, `RA 10931`, `RA 9470`, `RA 11310`, or `RA 11861`. The local corpus is intentionally bounded and does not search live government sites.

For draft checks, upload Markdown, plain text, PDF, DOCX, or DOC files up to 5MB. Markdown and text files are read in the browser. PDF and Word files are posted to `/api/document-text` for server-side extraction before their text is reviewed.

## Document Extraction Fails

Check the upload type and size first:

- Supported: `.md`, `.markdown`, `.txt`, `.text`, `.pdf`, `.docx`, `.doc`
- Maximum size: 5MB

If a PDF upload returns `Document extraction did not find readable text`, it may be a scanned image-only PDF. OCR is not bundled. Convert it to selectable text before uploading.

Run the focused checks:

```powershell
npm run check:document-text:self-test
npm run check:document-extraction:self-test
```

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
