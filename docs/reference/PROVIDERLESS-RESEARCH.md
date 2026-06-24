# Providerless Research

LexInSight can answer basic Philippine legal research questions and review Markdown, text, PDF, and Word drafts without a remote RAG backend or AI provider.

The implementation lives in [local-legal-research.ts](../../src/lib/services/local-legal-research.ts). The normal service entry points in [rag-api.ts](../../src/lib/services/rag-api.ts) use local providerless mode by default. If `NEXT_PUBLIC_RAG_PROVIDER_MODE=remote-rag`, they try the configured provider first, then return local providerless output on timeout, network failure, or upstream error.

## Runtime Behavior

- Standard research uses local providerless mode by default.
- Remote-first research is opt-in with `NEXT_PUBLIC_RAG_PROVIDER_MODE=remote-rag`.
- Deep Search still uses the same service contract, but local mode expands cross-references instead of downloading PDFs or calling an AI provider.
- Draft checking works locally for browser-readable plain text and Markdown files. [document-text.ts](../../src/lib/utils/document-text.ts) normalizes BOMs, line endings, and null bytes before local review. PDF, DOCX, and DOC files are extracted through `/api/document-text` before review.
- Responses include `provider_mode`, `fallback_used`, `fallback_reason`, and `confidence_score` when available.
- The UI shows a local-mode notice and keeps storing research responses in chat history.

## Regression Coverage

Run the providerless self-test from the repository root(../..):

```powershell
npm run check:providerless:self-test
npm run check:document-text:self-test
npm run check:document-extraction:self-test
```

The self-test compiles [local-legal-research.ts](../../src/lib/services/local-legal-research.ts) with TypeScript and executes it in Node. It verifies:

- Corpus coverage for core statutes, including procurement, government service delivery, cybercrime, consumer protection, competition, financial consumer protection, hazardous substances, SIM registration, customs, tax administration, PhilSys, and protected areas.
- RA 9003, RA 11058, and RA 10173 research matching.
- RA 12009, RA 11032, RA 10175, RA 7394, RA 10667, RA 11765, RA 6969, RA 11285, RA 11934, RA 9995, RA 10627, RA 10863, RA 11976, RA 11055, and RA 11038 research matching.
- Common citation formats such as `R.A. No. 10173` and `RA No. 8792`.
- Deep Search providerless metadata.
- No-result behavior for unrelated queries.
- Draft warnings when a cited Republic Act is outside the bundled local corpus.
- Draft warnings for thin procurement, service-delivery, cyber incident, consumer-protection, financial-consumer, hazardous-waste, competition, and SIM/mobile-number controls.
- Red findings for risky privacy and penalty drafting.
- Green findings for a stronger solid-waste ordinance draft.
- Local health-check metadata.

The document tests cover Markdown/text normalization and deterministic PDF/DOCX extraction. `npm run check:local` includes these self-tests, so release gates catch providerless and ingestion regressions before browser smoke starts.

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
2. Expand terms through legal-topic triggers such as waste, privacy, workplace safety, fire safety, DRRM, air, water, LGU authority, corporate governance, harassment, electronic records, procurement, government services, cybercrime, and consumer protection.
3. Score the bundled corpus with BM25-style term ranking plus boosts for exact RA numbers, statute aliases, short titles, and topic phrases.
4. Return the top matches with source links, citation coverage, matched terms, practical checklists, and common gaps.
5. Generate Markdown through templates only. Local mode does not call an AI model.

## Draft Checker Algorithm

The providerless draft checker uses structural and topic-specific heuristics:

- Checks for legal authority, purpose, scope, definitions, responsible office, operative duties, monitoring, budget, effectivity, and due process.
- Prioritizes explicitly cited local-corpus authorities in finding references.
- Flags amber findings when a draft cites a Republic Act that is not in the bundled local corpus.
- Flags red findings when penalties appear without notice, hearing, appeal, or reconsideration safeguards.
- Adds topic checks for privacy, solid waste, workplace safety, fire safety, DRRM, water quality, air quality, digital records, procurement, government service delivery, cyber incidents, consumer protection, competition, financial consumers, hazardous substances, energy efficiency, SIM and mobile-number data, private image abuse, harassment, bullying, customs, tax administration, PhilSys identity handling, and protected areas.
- Computes a conservative compliance score from green, amber, and red findings.

This catches common drafting gaps. It does not determine legality, validity, or enforceability.

## Bundled Corpus

The local corpus intentionally stays small and auditable:

- [RA 9003 - Ecological Solid Waste Management Act of 2000](https://lawphil.net/statutes/repacts/ra2001/ra_9003_2001.html)
- [RA 10173 - Data Privacy Act of 2012](https://privacy.gov.ph/data-privacy-act/)
- [RA 11058 - Occupational Safety and Health Standards Act](https://lawphil.net/statutes/repacts/ra2018/ra_11058_2018.html)
- [RA 9514 - Fire Code of the Philippines of 2008](https://lawphil.net/statutes/repacts/ra2008/ra_9514_2008.html)
- [RA 7160 - Local Government Code of 1991](https://lawphil.net/statutes/repacts/ra1991/ra_7160_1991.html)
- [RA 10121 - Philippine Disaster Risk Reduction and Management Act of 2010](https://lawphil.net/statutes/repacts/ra2010/ra_10121_2010.html)
- [RA 8749 - Philippine Clean Air Act of 1999](https://www.lawphil.net/statutes/repacts/ra1999/ra_8749_1999.html)
- [RA 9275 - Philippine Clean Water Act of 2004](https://lawphil.net/statutes/repacts/ra2004/ra_9275_2004.html)
- [RA 11232 - Revised Corporation Code of the Philippines](https://lawphil.net/statutes/repacts/ra2019/ra_11232_2019.html)
- [RA 11313 - Safe Spaces Act](https://lawphil.net/statutes/repacts/ra2019/ra_11313_2019.html)
- [RA 8792 - Electronic Commerce Act of 2000](https://lawphil.net/statutes/repacts/ra2000/ra_8792_2000.html)
- [RA 12009 - New Government Procurement Act](https://lawphil.net/statutes/repacts/ra2024/ra_12009_2024.html)
- [RA 11032 - Ease of Doing Business and Efficient Government Service Delivery Act of 2018](https://lawphil.net/statutes/repacts/ra2018/ra_11032_2018.html)
- [RA 10175 - Cybercrime Prevention Act of 2012](https://lawphil.net/statutes/repacts/ra2012/ra_10175_2012.html)
- [RA 7394 - Consumer Act of the Philippines](https://lawphil.net/statutes/repacts/ra1992/ra_7394_1992.html)
- [RA 10667 - Philippine Competition Act](https://lawphil.net/statutes/repacts/ra2015/ra_10667_2015.html)
- [RA 11765 - Financial Products and Services Consumer Protection Act](https://lawphil.net/statutes/repacts/ra2022/ra_11765_2022.html)
- [RA 6969 - Toxic Substances and Hazardous and Nuclear Wastes Control Act of 1990](https://lawphil.net/statutes/repacts/ra1990/ra_6969_1990.html)
- [RA 11285 - Energy Efficiency and Conservation Act](https://lawphil.net/statutes/repacts/ra2019/ra_11285_2019.html)
- [RA 11934 - SIM Registration Act](https://lawphil.net/statutes/repacts/ra2022/ra_11934_2022.html)
- [RA 9995 - Anti-Photo and Video Voyeurism Act of 2009](https://lawphil.net/statutes/repacts/ra2010/ra_9995_2010.html)
- [RA 7877 - Anti-Sexual Harassment Act of 1995](https://lawphil.net/statutes/repacts/ra1995/ra_7877_1995.html)
- [RA 10627 - Anti-Bullying Act of 2013](https://lawphil.net/statutes/repacts/ra2013/ra_10627_2013.html)
- [RA 10863 - Customs Modernization and Tariff Act](https://lawphil.net/statutes/repacts/ra2016/ra_10863_2016.html)
- [RA 11976 - Ease of Paying Taxes Act](https://lawphil.net/statutes/repacts/ra2024/ra_11976_2024.html)
- [RA 11055 - Philippine Identification System Act](https://lawphil.net/statutes/repacts/ra2018/ra_11055_2018.html)
- [RA 11038 - Expanded National Integrated Protected Areas System Act of 2018](https://lawphil.net/statutes/repacts/ra2018/ra_11038_2018.html)

## Limits

Providerless mode does not search live government sites, new issuances, court decisions, local ordinances, amendments, or facts outside the query or draft text. Treat it as a resilient research aid and drafting checklist. Verify all outputs against current official sources and qualified legal counsel before making compliance decisions.
