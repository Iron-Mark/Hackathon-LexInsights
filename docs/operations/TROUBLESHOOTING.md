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

If local mode does not return a result, try a narrower query with a statute number such as `RA 9003`, `RA 10173`, `RA 11058`, `RA 7160`, `RA 10121`, `RA 10667`, `RA 11765`, `RA 8484`, `RA 4200`, `BP 22`, `RA 9285`, `RA 10142`, `RA 9510`, `RA 386`, `EO 209`, `Act No. 3753`, `RA 9048`, `RA 10172`, `A.M. No. 02-8-13-SC`, `Rules of Court`, `A.M. No. 08-8-7-SC`, `1987 Constitution`, `Act No. 3815`, `Rules of Criminal Procedure`, `RA 9344`, `RA 9165`, `RA 10591`, `BP 880`, `RA 9745`, `RA 9520`, `RA 7042`, `RA 11647`, `RA 8762`, `RA 11595`, `RA 11057`, `CA 613`, `CA 473`, `RA 9139`, `RA 9225`, `RA 11983`, `RA 8239`, `RA 10022`, `RA 11641`, `BP 881`, `RA 8189`, `RA 7166`, `RA 9006`, `RA 8436`, `RA 9369`, `RA 10742`, `RA 11768`, `RA 11934`, `RA 11976`, `RA 4136`, `RA 11659`, `PD 1529`, `RA 11573`, `RA 10023`, `RA 11231`, `RA 6657`, `RA 9700`, `RA 11953`, `RA 8371`, `RA 8435`, `RA 10068`, `RA 10611`, `RA 11321`, `RA 3019`, `RA 6713`, `PD 1445`, `RA 7080`, `RA 10149`, `RA 6758`, `RA 11199`, `RA 8291`, `RA 9679`, `RA 10606`, `RA 11210`, `RA 8187`, `RA 10361`, `PD 442`, `RA 8293`, `RA 8799`, `RA 9711`, `RA 11223`, `RA 11332`, `RA 9211`, `RA 11900`, `RA 11166`, `RA 10152`, `RA 7719`, `RA 11215`, `RA 10354`, `RA 11036`, `RA 9262`, `RA 9994`, `RA 7277`, `PD 1096`, `PD 856`, `BP 344`, `RA 7610`, `RA 8042`, `RA 1405`, `RA 7653`, `RA 11211`, `RA 8791`, `RA 9474`, `RA 8556`, `RA 10607`, `RA 9829`, `RA 10846`, `RA 7581`, `RA 7638`, `RA 8479`, `RA 11592`, `RA 9367`, `RA 9513`, `RA 9729`, `RA 7942`, `RA 10533`, `RA 10931`, `RA 9470`, `RA 11310`, or `RA 11861`. The local corpus is intentionally bounded and does not search live government sites.

For the expanded local workflow packs, try `RA 11898` for EPR and plastic-packaging recovery, `RA 11127` for operators of payment systems, `RA 10168` for CFT/sanctions and AMLC asset-freeze workflows, `RA 11479` for anti-terrorism designation and proscription safeguards, `RA 8479` for downstream oil and fuel retail, `RA 11592` for LPG cylinders/refilling/dealers, `RA 9367` for biofuel blends, or `RA 7638` for DOE coordination/monitoring.

For the education/inclusive-learning slice, try `RA 9155` for basic education governance, `RA 10157` for kindergarten, `RA 12199` for current early childhood/ECCD, `RA 10650` for open distance learning, or `RA 11650` for inclusive learning and learners with disabilities. Use `RA 10410` only for historical Early Years Act context; it was repealed by RA 12199. Verify current ECCD answers against current DepEd, CHED, TESDA, ECCD Council, and LGU issuances because providerless mode does not search live agency updates.

For the public-land/free-patent/agrarian-reform slice, try `RA 11573` for imperfect or incomplete title confirmation, `RA 10023` for residential free patents, `RA 11231` for agricultural free patents, `RA 6657` and `RA 9700` for CARP/CARPER coverage, or `RA 11953` for agrarian emancipation and debt condonation. If a broad land query is weak, include concrete terms such as `alienable and disposable land`, `DENR CENRO`, `Register of Deeds`, `DAR clearance`, `CLOA`, `ARB`, `LandBank amortization`, `debt condonation`, and the relevant LGU. Providerless mode cannot verify actual land classification, cadastral surveys, title encumbrances, DAR/DENR case status, LandBank balances, or local zoning; confirm those with DENR, DAR, LandBank, the Register of Deeds, the LGU, official issuances, and qualified counsel.

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
