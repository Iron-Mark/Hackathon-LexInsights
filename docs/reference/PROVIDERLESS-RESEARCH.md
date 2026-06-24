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

- Corpus coverage for core statutes and official issuances, including procurement, government service delivery, cybercrime, consumer protection, competition, financial consumer protection, hazardous substances, SIM registration, customs, tax administration, PhilSys, protected areas, labor, health, social welfare, IP, securities, FDA, heritage, built environment, sanitation, accessibility, child protection, migrant workers, bank secrecy, price controls, MSME/BMBE support, renewable energy, climate, fisheries, mining, education, records, FOI, housing, and social-benefit topics.
- RA 9003, RA 11058, and RA 10173 research matching.
- RA 12009, RA 11032, RA 10175, RA 7394, RA 10667, RA 11765, RA 6969, RA 11285, RA 11934, RA 9995, RA 10627, RA 10863, RA 11976, RA 11055, RA 11038, PD 442, RA 10911, RA 11036, RA 9262, RA 10364, RA 8293, RA 8799, RA 9711, RA 11223, RA 10066, RA 9994, RA 7277, PD 1096, PD 856, BP 344, RA 7610, RA 8042, RA 1405, RA 7581, RA 9178, RA 9501, RA 9513, RA 9729, RA 8550, RA 7942, RA 10533, RA 10931, RA 7279, RA 11201, RA 9470, EO 2 s. 2016, RA 11310, RA 11861, RA 11596, and RA 11510 research matching.
- Common citation formats such as `R.A. No. 10173` and `RA No. 8792`.
- Deep Search providerless metadata.
- No-result behavior for unrelated queries.
- Draft warnings when a cited Republic Act is outside the bundled local corpus.
- Draft warnings for thin procurement, service-delivery, cyber incident, consumer-protection, financial-consumer, hazardous-waste, competition, SIM/mobile-number, labor, mental-health, anti-trafficking, IP, securities, health-product, senior-citizen, PWD, built-environment, sanitation, child-protection, migrant-worker, bank-secrecy, price-control, renewable-energy, climate, fisheries, mining, education, records, FOI, housing, social-assistance, solo-parent, and child-marriage controls.
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
2. Expand terms through legal-topic triggers such as waste, privacy, workplace safety, fire safety, DRRM, air, water, LGU authority, corporate governance, harassment, electronic records, procurement, government services, cybercrime, consumer protection, labor, health, welfare, IP, securities, FDA, heritage, building permits, sanitation, accessibility, child protection, migrant workers, bank secrecy, price controls, renewable energy, climate, fisheries, mining, education, records, FOI, housing, and social benefits.
3. Score the bundled corpus with BM25-style term ranking plus boosts for exact RA numbers, statute aliases, short titles, and topic phrases.
4. Add a local compliance-framework section when a query matches a cross-law workflow such as incident response, LGU service delivery, environmental operations, health and welfare, IP/investment/product claims, or procurement/imports.
5. Return the top matches with source links, citation coverage, matched terms, practical checklists, and common gaps. Standard local research returns up to six matches; deep local search returns up to ten.
6. Generate Markdown through templates only. Local mode does not call an AI model.

## Local Compliance Frameworks

When a query spans multiple topics, local mode can synthesize a practical cross-law checklist from bundled framework packs:

- Data, cyber, and mobile incident response.
- LGU ordinance, permit, and service delivery.
- Environmental operations and facility controls.
- Consumer, financial, commerce, AML, and tax workflows.
- Workplace, school, public safety, and protection.
- Health, welfare, accessibility, and protection.
- Education, housing, records, and social benefits.
- IP, investment, health product, and market claims.
- Imports, public procurement, assets, and audit.

## Draft Checker Algorithm

The providerless draft checker uses structural and topic-specific heuristics:

- Checks for legal authority, purpose, scope, definitions, responsible office, operative duties, monitoring, budget, effectivity, and due process.
- Prioritizes explicitly cited local-corpus authorities in finding references.
- Flags amber findings when a draft cites a Republic Act that is not in the bundled local corpus.
- Flags red findings when penalties appear without notice, hearing, appeal, or reconsideration safeguards.
- Adds topic checks for privacy, solid waste, workplace safety, fire safety, DRRM, water quality, air quality, digital records, procurement, government service delivery, cyber incidents, consumer protection, competition, financial consumers, hazardous substances, energy efficiency, SIM and mobile-number data, private image abuse, harassment, bullying, customs, tax administration, PhilSys identity handling, protected areas, labor, age discrimination, mental health, VAWC, trafficking, IP, securities, FDA-regulated products, health service delivery, cultural heritage, senior-citizen benefits, PWD accessibility, building and occupancy, sanitation, physical accessibility, child protection, migrant workers, bank deposits, price controls, micro and small business support, renewable energy, climate action, fisheries, mining, education, student aid, alternative learning, records management, FOI requests, housing, social assistance, solo-parent benefits, and child-marriage prevention.
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
- [PD 442 - Labor Code of the Philippines](https://lawphil.net/statutes/presdecs/pd1974/pd_442_1974.html)
- [RA 10911 - Anti-Age Discrimination in Employment Act](https://lawphil.net/statutes/repacts/ra2016/ra_10911_2016.html)
- [RA 11036 - Mental Health Act](https://lawphil.net/statutes/repacts/ra2018/ra_11036_2018.html)
- [RA 9262 - Anti-Violence Against Women and Their Children Act of 2004](https://lawphil.net/statutes/repacts/ra2004/ra_9262_2004.html)
- [RA 10364 - Expanded Anti-Trafficking in Persons Act of 2012](https://lawphil.net/statutes/repacts/ra2013/ra_10364_2013.html)
- [RA 8293 - Intellectual Property Code of the Philippines](https://lawphil.net/statutes/repacts/ra1997/ra_8293_1997.html)
- [RA 8799 - Securities Regulation Code](https://lawphil.net/statutes/repacts/ra2000/ra_8799_2000.html)
- [RA 9711 - Food and Drug Administration Act of 2009](https://lawphil.net/statutes/repacts/ra2009/ra_9711_2009.html)
- [RA 11223 - Universal Health Care Act](https://lawphil.net/statutes/repacts/ra2019/ra_11223_2019.html)
- [RA 10066 - National Cultural Heritage Act of 2009](https://lawphil.net/statutes/repacts/ra2010/ra_10066_2010.html)
- [RA 9994 - Expanded Senior Citizens Act of 2010](https://lawphil.net/statutes/repacts/ra2010/ra_9994_2010.html)
- [RA 7277 - Magna Carta for Disabled Persons](https://lawphil.net/statutes/repacts/ra1992/ra_7277_1992.html)
- [PD 1096 - National Building Code of the Philippines](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/11/53320)
- [PD 856 - Code on Sanitation of the Philippines](https://lawphil.net/statutes/presdecs/pd1975/pd_856_1975.html)
- [BP 344 - Accessibility Law](https://lawphil.net/statutes/bataspam/bp1983/bp_344_1983.html)
- [RA 7610 - Special Protection of Children Against Abuse, Exploitation and Discrimination Act](https://lawphil.net/statutes/repacts/ra1992/ra_7610_1992.html)
- [RA 8042 - Migrant Workers and Overseas Filipinos Act of 1995](https://lawphil.net/statutes/repacts/ra1995/ra_8042_1995.html)
- [RA 1405 - Law on Secrecy of Bank Deposits](https://lawphil.net/statutes/repacts/ra1955/ra_1405_1955.html)
- [RA 7581 - Price Act](https://lawphil.net/statutes/repacts/ra1992/ra_7581_1992.html)
- [RA 9178 - Barangay Micro Business Enterprises Act of 2002](https://lawphil.net/statutes/repacts/ra2002/ra_9178_2002.html)
- [RA 9501 - Magna Carta for Micro, Small and Medium Enterprises](https://lawphil.net/statutes/repacts/ra2008/ra_9501_2008.html)
- [RA 9513 - Renewable Energy Act of 2008](https://lawphil.net/statutes/repacts/ra2008/ra_9513_2008.html)
- [RA 9729 - Climate Change Act of 2009](https://lawphil.net/statutes/repacts/ra2009/ra_9729_2009.html)
- [RA 8550 - Philippine Fisheries Code of 1998](https://lawphil.net/statutes/repacts/ra1998/ra_8550_1998.html)
- [RA 7942 - Philippine Mining Act of 1995](https://lawphil.net/statutes/repacts/ra1995/ra_7942_1995.html)
- [RA 10533 - Enhanced Basic Education Act of 2013](https://lawphil.net/statutes/repacts/ra2013/ra_10533_2013.html)
- [RA 10931 - Universal Access to Quality Tertiary Education Act](https://lawphil.net/statutes/repacts/ra2017/ra_10931_2017.html)
- [RA 7279 - Urban Development and Housing Act of 1992](https://lawphil.net/statutes/repacts/ra1992/ra_7279_1992.html)
- [RA 11201 - Department of Human Settlements and Urban Development Act](https://lawphil.net/statutes/repacts/ra2019/ra_11201_2019.html)
- [RA 9470 - National Archives of the Philippines Act of 2007](https://lawphil.net/statutes/repacts/ra2007/ra_9470_2007.html)
- [EO 2, s. 2016 - Freedom of Information Executive Order](https://lawphil.net/executive/execord/eo2016/eo_2_2016.html)
- [RA 11310 - Pantawid Pamilyang Pilipino Program Act](https://lawphil.net/statutes/repacts/ra2019/ra_11310_2019.html)
- [RA 11861 - Expanded Solo Parents Welfare Act](https://lawphil.net/statutes/repacts/ra2022/ra_11861_2022.html)
- [RA 11596 - Prohibition of Child Marriage Law](https://lawphil.net/statutes/repacts/ra2021/ra_11596_2021.html)
- [RA 11510 - Alternative Learning System Act](https://lawphil.net/statutes/repacts/ra2020/ra_11510_2020.html)

## Limits

Providerless mode does not search live government sites, new issuances, court decisions, local ordinances, amendments, or facts outside the query or draft text. Treat it as a resilient research aid and drafting checklist. Verify all outputs against current official sources and qualified legal counsel before making compliance decisions.
