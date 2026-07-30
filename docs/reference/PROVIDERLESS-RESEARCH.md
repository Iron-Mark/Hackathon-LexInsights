# Providerless Research

LexInsights can answer basic Philippine legal research questions and review Markdown, text, PDF, and Word drafts without a remote RAG backend or AI provider.

The implementation lives in [local-legal-research.ts](../../src/lib/services/local-legal-research.ts), with corpus, framework, and topic-expansion data split into [local-research-data](../../src/lib/services/local-research-data). The normal service entry points in [rag-api.ts](../../src/lib/services/rag-api.ts) use local providerless mode by default. If `NEXT_PUBLIC_RAG_PROVIDER_MODE=remote-rag`, they try the configured provider first, then return local providerless output on timeout, network failure, or upstream error.

## Runtime Behavior

- Standard research uses local providerless mode by default.
- Remote-first research is opt-in with `NEXT_PUBLIC_RAG_PROVIDER_MODE=remote-rag`.
- Deep Search still uses the same service contract, but local mode expands cross-references instead of downloading PDFs or calling an AI provider.
- Draft checking works locally for browser-readable plain text and Markdown files. [document-text.ts](../../src/lib/utils/document-text.ts) normalizes BOMs, line endings, and null bytes before local review. PDF, DOCX, and DOC files are extracted through `/api/document-text` before review.
- Responses include `provider_mode`, `fallback_used`, `fallback_reason`, and `confidence_score` when available.
- Completed local responses carry `matched_framework_id` (the strongest bundled compliance-framework match) and `matched_framework_ids` (all matches, strongest first). Consumers must treat absence as "fall back to fuzzy inference", not "no framework" — remote-RAG and older cached/persisted responses do not carry the fields.
- Local responses include retrieval diagnostics for candidate count, score threshold, citation coverage, source type counts, provenance coverage, relation paths, coverage warnings, local corpus limits, source support level, and sub-second processing time.
- The UI shows a local-mode notice and keeps storing research responses in chat history.

## Regression Coverage

Run the providerless self-test from the repository root:

```bash
npm run check:providerless:self-test
npm run check:local-rag:golden
npm run check:local-rag:performance
npm run check:local-rag:governance
npm run check:document-text:self-test
npm run check:document-extraction:self-test
```

The self-test compiles [local-legal-research.ts](../../src/lib/services/local-legal-research.ts) and its local data modules with TypeScript, then executes them in Node. It verifies:

- Research matching for the topics and citations recorded in [coverage-map.ts](../../src/lib/services/local-research-data/coverage-map.ts) — representative examples: RA 9003 solid waste, RA 10173 privacy operations, RA 11058 OSH, RA 11976 EOPT/BIR implementation, and DOLE/SEC/NPC/BSP issuance workflows.
- Common citation formats such as `R.A. No. 10173` and `RA No. 8792`.
- Deep Search providerless metadata.
- Second Brain Lite provenance metadata, evidence anchors, relation paths, seeded-coverage warnings, and unknown-citation safety.
- No-result behavior for unrelated queries.
- Draft warnings when a cited Republic Act is outside the bundled local corpus, and thin-control warnings for each topic slice covered by the draft-checker heuristics.
- Red findings for risky privacy and penalty drafting, and green findings for a stronger solid-waste ordinance draft.
- Local health-check metadata.

The golden-query check ([check-local-rag-golden-self-test.mjs](../../scripts/check-local-rag-golden-self-test.mjs)) asserts retrieval quality: exact citations, citation variants, direct topic matches, workflow probes for each bundled topic slice, local ranking metadata, and no-result behavior for unrelated queries. The performance check ([check-local-rag-performance-self-test.mjs](../../scripts/check-local-rag-performance-self-test.mjs)) benchmarks uncached and warm-cache latency across representative citation, workflow, and no-result queries. Both derive their probe lists from the same bundled slices, so corpus changes surface as gate failures rather than silent drift.

Vitest unit tests co-located with the data modules ([framework-templates.test.ts](../../src/lib/services/local-research-data/framework-templates.test.ts), [local-research-frameworks.test.ts](../../src/lib/services/local-research-frameworks.test.ts)) run via `npm run test` and are part of CI.

The document tests cover Markdown/text normalization and deterministic PDF/DOCX extraction. `npm run check:local` includes the unit tests and all of these self-tests, so release gates catch providerless and ingestion regressions before browser smoke starts.

## Document Ingestion

Draft checking starts with text extraction:

1. Browser-readable Markdown and text files are normalized directly in the browser.
2. PDF, DOCX, and legacy DOC files are posted to `/api/document-text`.
3. The server extracts text with maintained parser libraries, normalizes it, and returns an `extractionMode` value such as `server-pdf` or `server-docx`.
4. The draft checker reviews the extracted text locally when providerless mode is active.

The upload limit is 5MB. Scanned image-only PDFs may fail with `Document extraction did not find readable text` because OCR is not bundled.

## Local Research Algorithm

The providerless research path is deterministic:

1. Normalize the query, strip punctuation, remove common stop words, and extract Republic Act numbers from common formats such as `RA 9003`, `RA No. 9003`, `R.A. No. 9003`, and `Republic Act Number 9003`.
2. Analyze direct query terms, narrow legal synonyms, and softer topic-expansion terms separately. The topic triggers live in [topic-expansions.ts](../../src/lib/services/local-research-data/topic-expansions.ts).
3. Score candidate documents from precomputed token, citation, alias, topic, IDF, field-weight, framework, and provenance indexes. Exact citations, statutes, titles, short titles, aliases, topics, keywords, summaries, obligations, and common gaps have separate weights, and broad expansion hits are capped so they cannot overwhelm direct evidence.
4. Require meaningful direct evidence before returning a local match. A single incidental word should produce `no_results`, while exact citations and strong phrase/topic matches remain eligible.
5. Add a local compliance-framework section when a query matches a cross-law workflow. The framework triggers live in [compliance-frameworks.ts](../../src/lib/services/local-research-data/compliance-frameworks.ts).
6. In Deep Search, add capped relation expansion from curated authority relationships so related authorities can appear without outranking exact citations or direct matches.
7. Return the top matches with source links, citation coverage, matched terms, evidence anchors, provenance status, relation paths, retrieval metadata, practical checklists, and common gaps. Standard local research returns up to six matches; deep local search returns up to twelve and can include framework authorities.
8. Generate Markdown through templates only. Local mode does not call an AI model. Detected framework ids are emitted as `matched_framework_id`/`matched_framework_ids` (see Runtime Behavior).

## Second Brain Lite Governance

The providerless corpus has a lightweight knowledge/provenance layer under [local-research-data](../../src/lib/services/local-research-data):

- `corpus.ts` is the bundled authority corpus itself (271 entries).
- `authority-sources.ts` is the canonical local source registry for source name, URL, authority type, source tier, verification date, provenance status, and catalog tags.
- `evidence-anchors.ts` creates short evidence anchors for summaries, obligations, and common gaps without storing long source excerpts.
- `authority-relations.ts` records curated amendment, guidance, cross-reference, and workflow relationships used by local Deep Search.
- `coverage-map.ts` records whether an authority is covered by golden queries, draft checks, framework coverage, or explicitly seeded status.
- `compliance-frameworks.ts` defines the bundled cross-law framework packs; framework membership is itself validated by the governance gate.
- `framework-templates.ts` maps a compliance report to a bundled framework (exact detection via the emitted framework id, fuzzy inference otherwise) and feeds the compliance-canvas Framework checklist.
- `topic-expansions.ts` holds the softer topic-expansion triggers used by query analysis.
- `coverage-summary.ts` derives the advertised coverage counts (271 authorities, 13 source families, 45 frameworks, 180 curated relations) that `COVERAGE_FACTS` in `src/lib/seo.ts` must match.

When adding or changing an authority, update or verify every affected governance surface above. A complete local authority should have:

1. A corpus record.
2. A canonical source record.
3. At least one evidence anchor.
4. Any relevant authority relationships or framework membership.
5. A coverage record marked `golden`, `draft`, `framework`, or explicitly `seeded`.

`npm run check:local-rag:governance` fails on orphan records, missing source metadata, future verification dates, source-registry conflicts, invalid framework references, relation targets that do not exist, missing evidence anchors, and unmarked coverage gaps.

## Local Compliance Frameworks

When a query spans multiple topics, local mode can synthesize a practical cross-law checklist from the 45 framework packs bundled in [compliance-frameworks.ts](../../src/lib/services/local-research-data/compliance-frameworks.ts) — for example data/cyber incident response, privacy operations and NPC compliance, financial-account scam response, LGU service delivery, workplace pay and OSH implementation, EPR and DENR reporting, EOPT/BIR implementation, and payment-system/CFT controls. The pack list in the data module is the source of truth; the governance gate validates framework membership.

## Topic Slices

Each bundled topic slice follows the same pattern: it treats matching queries as compliance workflows anchored to the listed authorities, connects related corpus authorities when the query or draft supplies direct evidence, and never verifies live agency data — portal behavior, filing or registration status, case facts, account records, forms, deadlines, or later issuances. Verify outputs with the listed agency, current official issuances, source documents, and qualified counsel.

| Slice | Anchor authorities | Verify with |
| --- | --- | --- |
| DRRM and imminent disaster | RA 10121; RA 12287 (with RA 7160) | NDRRMC/OCD, LGU records |
| Digital-services VAT and NRDSP | RA 12023 | BIR, tax counsel |
| EOPT and BIR implementation | RA 11976; BIR RR Nos. 3- to 8-2024 and 11-2024; RMC 77-2024 | BIR, tax counsel |
| Labor implementation | PD 442; DOLE DO 147-15, 174-17, 198-18 | DOLE, NLRC, labor counsel |
| SEC official contact | SEC MC No. 28, s. 2020 (with RA 11232) | SEC, current portal instructions |
| SEC beneficial ownership and HARBOR | SEC MC No. 1, s. 2021; SEC MC No. 15, s. 2025; SEC HARBOR | SEC, live HARBOR portal |
| PWD benefits, PDAO, and accessibility | RA 9994, RA 7277, RA 9442, RA 10070, RA 10524, RA 10754, BP 344 | LGU/PDAO/OSCA, DSWD, NCDA, BIR |
| Privacy operations and NPC compliance | RA 10173 and its IRR; NPC Circulars 16-03, 2020-03, 2022-04, 2023-04, 2023-06; NPC Advisories 2025-02, 2026-02 | NPC, live DBNMS/portal guidance |
| Education and inclusive learning | RA 9155, RA 10157, RA 12199, RA 10650, RA 11650 (RA 10410 is retained only as superseded historical context — RA 12199 repealed it in 2025) | DepEd, CHED, TESDA, ECCD Council |
| Public land, free patent, and agrarian reform | RA 11573, RA 10023, RA 11231, RA 6657, RA 9700, RA 11953 | DENR, DAR, LandBank, Register of Deeds, LGU |
| Real property valuation, RPT, and local assessment | RA 12001; BLGF MC No. 001-2025 (RPVARA IRR) | BLGF/DOF, LGU assessor/treasurer, assessment appeal boards |
| Child adoption, foundling, and civil status | RA 11642, RA 11222, RA 11767 | NACC, DSWD, local civil registrar |
| Cybercrime IRR and warrant procedure | DOJ-DILG-DOST RA 10175 IRR; A.M. No. 17-11-03-SC | DOJ/OOC, CICC, courts |
| AMLC 2018 AMLA IRR | RA 9160 2018 IRR (January 2021 amendment) | AMLC, BSP or sector regulator |
| BSP financial consumer, fraud, and VASP | BSP Circulars 1108, 1140, 1160, 1169 | BSP, AMLC |
| Internet transactions IRR | RA 11967; JAO No. 24-03, s. 2024 | DTI, E-Commerce Bureau |
| Customs and import clearance | RA 10863; BOC CAO No. 09-2020 | Bureau of Customs, licensed customs professionals |

## Draft Checker Algorithm

The providerless draft checker uses structural and topic-specific heuristics:

- Checks for legal authority, purpose, scope, definitions, responsible office, operative duties, monitoring, budget, effectivity, and due process.
- Prioritizes explicitly cited local-corpus authorities in finding references.
- Flags amber findings when a draft cites a Republic Act that is not in the bundled local corpus.
- Flags red findings when penalties appear without notice, hearing, appeal, or reconsideration safeguards.
- Adds topic-specific checks for every bundled topic slice (privacy operations, solid waste and EPR, workplace safety, public accountability, tax and customs administration, land and agrarian workflows, health, education, transport, and the rest). The checker heuristics live alongside the corpus data and drift is caught by the self-test's thin-control warnings.
- Adds focused warnings for thin termination due-process, contracting/subcontracting, OSH implementation, and SEC official-contact provisions when drafts cite or imply those workflows.
- Computes a conservative compliance score from green, amber, and red findings.

This catches common drafting gaps. It does not determine legality, validity, or enforceability.

## Bundled Corpus

The local corpus intentionally stays small and auditable: 271 authorities across 13 official source families, with 45 framework packs and 180 curated relations (counts derived by [coverage-summary.ts](../../src/lib/services/local-research-data/coverage-summary.ts)). The canonical registry is [corpus.ts](../../src/lib/services/local-research-data/corpus.ts) with source metadata in [authority-sources.ts](../../src/lib/services/local-research-data/authority-sources.ts) — the governance gate validates those files, so this doc no longer maintains a duplicate link list.

## Limits

Providerless mode does not search live government sites, new issuances, court decisions, local ordinances, amendments, implementing rules, agency circulars, or any facts outside the query or draft text. Treat it as a resilient research aid and drafting checklist, not legal advice; verify outputs against the "Verify with" column of the slice table above, current official issuances, and qualified counsel before making compliance decisions.
