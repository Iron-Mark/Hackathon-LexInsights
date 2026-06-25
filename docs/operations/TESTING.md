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
npm run check:local-rag:governance
npm run check:document-text:self-test
npm run check:document-extraction:self-test
npm run check:release:self-test
npm run check:release
```

The providerless self-test covers the local legal research and draft-checking engine directly, without network or browser dependencies, including RA 10173 privacy operations, NPC Circular No. 16-03 breach management, NPC Advisory No. 2026-02 DBNMS submissions, NPC Circular No. 2023-06 security safeguards, NPC Circular No. 2023-04 consent, NPC Circular No. 2022-04 DPO/DPS registration, NPC Circular No. 2020-03 data sharing agreements, NPC Advisory No. 2025-02 privacy engineering, RA 11642 domestic administrative adoption/alternative child care/NACC, RA 11222 simulated birth rectification, RA 11767 foundling recognition, RA 9442 PWD privileges, RA 10070 PDAO, RA 10524 PWD employment, and RA 10754 PWD discounts/VAT exemptions.
The local RAG golden-query check covers exact citations, citation variants, AI governance guidance, privacy-operations/NPC-compliance workflows, cross-law workflows, EPR/plastic-packaging workflows, payment-system operator and settlement workflows, CFT/sanctions and AMLC asset-freeze workflows, anti-terrorism designation/proscription safeguards, aviation/maritime/ports/seafarer workflows, downstream fuels/local energy workflows, education governance/inclusive-learning workflows, PWD benefits/accessibility/employment workflows, public-land/free-patent/agrarian-reform workflows, child adoption/foundling/civil-status workflows, ranking diagnostics, source trust metadata, and no-result behavior.
The local RAG performance check covers uncached exact-citation, AI-governance, privacy-operations/NPC-compliance workflow, deep-workflow, payment-system/CFT workflow, aviation/maritime workflow, downstream-fuels/local-energy workflow, education-governance/inclusive-learning workflow, PWD benefits/accessibility workflow, public-land/free-patent/agrarian-reform workflow, child-adoption/foundling/civil-status workflow, unrelated no-result, and warm-cache local queries.
The local RAG governance check validates corpus source records, evidence anchors, authority relations, framework references, and coverage-map records, including new framework slices such as `privacy-operations-and-npc-compliance`, `health-welfare-and-accessibility`, `public-land-free-patent-and-agrarian-reform`, and `child-adoption-foundling-and-civil-status`.
For education/inclusive-learning updates, include exact-citation probes for RA 9155, RA 10157, RA 12199, RA 10650, and RA 11650. Include RA 10410 only as a superseded historical-context probe if the local corpus keeps prior Early Years Act references.
For PWD/senior benefits and accessibility updates, include exact-citation probes for RA 9442, RA 10070, RA 10524, and RA 10754; direct probes for senior benefits, PWD discount/VAT exemption, PDAO, and PWD employment; and one broad workflow query covering PDAO, PWD ID verification, discounts, VAT exemption, reasonable accommodation, accessible service channels, employment support, complaint handling, and confidential records.
For privacy-operations/NPC-compliance updates, include exact-citation probes for NPC Circular No. 16-03, NPC Advisory No. 2026-02, NPC Circular No. 2023-06, NPC Circular No. 2023-04, NPC Circular No. 2022-04, NPC Circular No. 2020-03, and NPC Advisory No. 2025-02. Also include one broad workflow query covering RA 10173, DPO, PIC/PIP, DPS registration, consent and withdrawal, privacy notices, data-subject rights, data sharing agreements, DBNMS breach notification, security safeguards, processor/vendor oversight, privacy engineering, automated decision-making, and profiling. Answers should remind users to verify live DBNMS submissions, NPC portal account status, actual breach facts, registration status, current NPC issuances, and qualified counsel.
For public-land/free-patent/agrarian-reform updates, include exact-citation probes for RA 11573, RA 10023, RA 11231, RA 6657, RA 9700, and RA 11953. Also include one broad workflow query covering imperfect/incomplete title, residential and agricultural free patents, alienable and disposable land, CARP/CARPER, CLOA/ARB, DAR clearance, agrarian emancipation, debt condonation, DENR CENRO/PENRO, Register of Deeds, LandBank, and LGU verification signals.
For child adoption/foundling/civil-status updates, include exact-citation probes for RA 11642, RA 11222, and RA 11767. Also include one broad workflow query covering adoption, domestic administrative adoption, alternative child care, NACC, simulated birth rectification, foundling recognition, birth certificates, civil registry, child identity, social welfare, and confidentiality controls. Answers should remind users to verify case facts and remedies with NACC, DSWD, local social welfare, the local civil registrar, the relevant LGU, current official issuances, and qualified counsel.
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

This is intentionally broad: lint, typecheck, production dependency audit, docs checks, readiness self-tests, deployment self-tests, RAG proxy self-test, providerless self-test, local RAG golden-query check, local RAG performance check, local RAG governance check, document text self-test, document extraction self-test, release integrity checks, PWA check, build, and browser smoke.
