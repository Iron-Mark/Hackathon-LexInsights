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

- Corpus coverage for core statutes and official issuances, including procurement, government service delivery, cybercrime, consumer protection, competition, financial consumer protection, access-device fraud, anti-wiretapping, bouncing checks, ADR, insolvency, credit information, civil contracts, family status, civil registry records and corrections, notarization, evidence, small claims, constitutional rights, criminal complaints, Revised Penal Code issues, criminal procedure, juvenile justice, dangerous drugs, firearms, public assemblies, anti-torture, cooperatives, foreign investment, retail trade, secured transactions, movable collateral, immigration, visas, passports, citizenship, naturalization, OFW/DMW assistance, elections, voter registration, campaign materials, automated election systems, SK/youth governance, public health, notifiable diseases, tobacco, vape products, HIV and AIDS policy, immunization, blood services, cancer control, reproductive health, hazardous substances, SIM registration, customs, tax administration, PhilSys, public accountability, anti-graft, ethics, COA audit, GOCC governance, public-sector compensation, employee benefits, SSS, GSIS, Pag-IBIG, PhilHealth, maternity and paternity leave, kasambahay, transport, public services, land titles, FPIC, agriculture, organic agriculture, food safety, protected areas, labor, health, social welfare, IP, securities, FDA, heritage, built environment, sanitation, accessibility, child protection, migrant workers, bank secrecy, price controls, MSME/BMBE support, renewable energy, climate, fisheries, mining, education, records, FOI, housing, and social-benefit topics.
- RA 9003, RA 11058, and RA 10173 research matching.
- RA 12009, RA 11032, RA 10175, RA 7394, RA 10667, RA 11765, RA 8484, RA 4200, BP 22, RA 9285, RA 10142, RA 9510, RA 386, EO 209 s. 1987, Act No. 3753, RA 9048, RA 10172, A.M. No. 02-8-13-SC, Rules of Court evidence rules, A.M. No. 08-8-7-SC, the 1987 Constitution, Act No. 3815, Rules of Criminal Procedure, RA 9344, RA 9165 dangerous-drugs coverage, RA 10591, BP 880, RA 9745, RA 9520, RA 7042, RA 11647, RA 8762, RA 11595, RA 11057, CA 613, CA 473, RA 9139, RA 9225, RA 11983, RA 8239, RA 10022, RA 11641, BP 881, RA 8189, RA 7166, RA 9006, RA 8436, RA 9369, RA 10742, RA 11768, RA 6969, RA 11285, RA 11934, RA 9995, RA 10627, RA 10863, RA 11976, RA 11055, RA 11038, RA 4136, RA 11659, RA 8371, PD 1529, RA 8435, RA 10068, RA 10611, RA 11321, RA 3019, RA 6713, PD 1445, RA 7080, RA 10149, RA 6758, RA 11199, RA 8291, RA 9679, RA 10606, RA 11210, RA 8187, RA 10361, PD 442, RA 10911, RA 11036, RA 9262, RA 10364, RA 8293, RA 8799, RA 9711, RA 11223, RA 10066, RA 9994, RA 7277, PD 1096, PD 856, BP 344, RA 7610, RA 8042, RA 1405, RA 7581, RA 9178, RA 9501, RA 9513, RA 9729, RA 8550, RA 7942, RA 10533, RA 10931, RA 7279, RA 11201, RA 9470, EO 2 s. 2016, RA 11310, RA 11861, RA 11596, and RA 11510 research matching.
- Common citation formats such as `R.A. No. 10173` and `RA No. 8792`.
- Deep Search providerless metadata.
- No-result behavior for unrelated queries.
- Draft warnings when a cited Republic Act is outside the bundled local corpus.
- Draft warnings for thin procurement, service-delivery, public-accountability, anti-graft, ethics, public-funds audit, GOCC governance, compensation, SSS, GSIS, Pag-IBIG, PhilHealth, maternity leave, paternity leave, kasambahay, access-device fraud, wiretapping/recordings, bouncing checks, ADR, insolvency, credit information, civil contracts, family status, civil registry records and corrections, notarization, evidence custody, small claims, constitutional rights, criminal complaints, criminal procedure, juvenile justice, dangerous-drugs, firearms, public assembly, custody and anti-torture safeguards, cooperative governance, foreign investment, retail trade entry, secured transactions, transport, public-service, land-title, FPIC, agriculture, organic-agriculture, food-safety, Sagip Saka, cyber incident, consumer-protection, financial-consumer, hazardous-waste, competition, SIM/mobile-number, labor, mental-health, anti-trafficking, IP, securities, health-product, disease-reporting, tobacco, vape-product, HIV-confidentiality, child-immunization, blood-services, cancer-control, reproductive-health, senior-citizen, PWD, built-environment, sanitation, child-protection, migrant-worker, bank-secrecy, price-control, renewable-energy, climate, fisheries, mining, education, records, FOI, housing, social-assistance, solo-parent, and child-marriage controls.
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
2. Expand terms through legal-topic triggers such as waste, privacy, workplace safety, fire safety, DRRM, air, water, LGU authority, corporate governance, harassment, electronic records, procurement, government services, public accountability, anti-graft, ethics, audit, public funds, compensation, SSS, GSIS, Pag-IBIG, PhilHealth, maternity leave, paternity leave, kasambahay, access devices, wiretapping, bouncing checks, ADR, insolvency, credit information, civil contracts, family status, civil registry records and corrections, notarization, evidence, small claims, constitutional rights, criminal complaints, criminal procedure, juvenile justice, dangerous drugs, firearms, public assembly, custody and anti-torture, cooperatives, foreign investment, retail trade, secured transactions, movable collateral, immigration, visas, passports, dual citizenship, naturalization, OFW/DMW records, elections, voter registration, campaign materials, campaign finance, automated election systems, SK/youth governance, public health, notifiable diseases, outbreak response, tobacco, vape products, HIV status, immunization, blood donation, cancer registry, reproductive health, transport, land titles, FPIC, agriculture, food safety, cybercrime, consumer protection, labor, health, welfare, IP, securities, FDA, heritage, building permits, sanitation, accessibility, child protection, migrant workers, bank secrecy, price controls, renewable energy, climate, fisheries, mining, education, records, FOI, housing, and social benefits.
3. Score the bundled corpus with BM25-style term ranking plus boosts for exact RA numbers, statute aliases, short titles, and topic phrases.
4. Add a local compliance-framework section when a query matches a cross-law workflow such as incident response, LGU service delivery, public accountability and government funds, employee benefits and social insurance, payments/credit/evidence/dispute resolution, civil documents/family status/small claims, rights/criminal enforcement/public order/custody, business market entry/ownership/cooperatives/secured finance, immigration/citizenship/passports/OFW records, elections/campaigns/voter registration/SK governance, public-health disease reporting and sensitive health records, environmental operations, mobility and land/agriculture workflows, health and welfare, IP/investment/product claims, or procurement/imports.
5. Return the top matches with source links, citation coverage, matched terms, practical checklists, and common gaps. Standard local research returns up to six matches; deep local search returns up to ten.
6. Generate Markdown through templates only. Local mode does not call an AI model.

## Local Compliance Frameworks

When a query spans multiple topics, local mode can synthesize a practical cross-law checklist from bundled framework packs:

- Data, cyber, and mobile incident response.
- LGU ordinance, permit, and service delivery.
- Public accountability, ethics, audit, and government funds.
- Employee benefits, leave, and social insurance.
- Environmental operations and facility controls.
- Mobility, land, agriculture, and community rights.
- Consumer, financial, commerce, AML, and tax workflows.
- Payments, credit, evidence, and dispute resolution.
- Civil documents, family status, evidence, and small claims.
- Rights, criminal enforcement, public order, and custody.
- Business market entry, ownership, cooperative, and secured finance.
- Immigration, citizenship, passports, and overseas Filipino records.
- Elections, civic participation, campaigns, and youth governance.
- Public health, disease reporting, and sensitive health records.
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
- Adds topic checks for privacy, solid waste, workplace safety, fire safety, DRRM, water quality, air quality, digital records, procurement, government service delivery, public accountability, anti-graft, ethics and SALN/gifts, public-funds audit, plunder-risk indicators, GOCC governance, public-sector compensation, SSS, GSIS, Pag-IBIG, PhilHealth, maternity leave, paternity leave, kasambahay employment, access-device fraud, wiretapping and recording, bouncing checks, ADR, insolvency, credit information, civil contracts, family status, civil registry records and corrections, notarization, evidence custody, small claims, constitutional rights, criminal complaint intake, criminal procedure, juvenile justice, dangerous-drugs handling, firearms, public assembly, custody and anti-torture safeguards, cooperative governance, foreign investment, retail trade entry, secured transactions, immigration status, passports and travel documents, citizenship re-acquisition, naturalization, OFW/DMW records, election process, voter registration, campaign materials and finance, automated election systems, SK/youth governance, disease reporting, tobacco controls, vape-product controls, HIV confidentiality, child immunization, blood services, cancer control, reproductive health, transport, public-service operators, land-title verification, FPIC, agriculture support, organic agriculture, food safety, Sagip Saka enterprise support, cyber incidents, consumer protection, competition, financial consumers, hazardous substances, energy efficiency, SIM and mobile-number data, private image abuse, harassment, bullying, customs, tax administration, PhilSys identity handling, protected areas, labor, age discrimination, mental health, VAWC, trafficking, IP, securities, FDA-regulated products, health service delivery, cultural heritage, senior-citizen benefits, PWD accessibility, building and occupancy, sanitation, physical accessibility, child protection, migrant workers, bank deposits, price controls, micro and small business support, renewable energy, climate action, fisheries, mining, education, student aid, alternative learning, records management, FOI requests, housing, social assistance, solo-parent benefits, and child-marriage prevention.
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
- [RA 8484 - Access Devices Regulation Act of 1998](https://lawphil.net/statutes/repacts/ra1998/ra_8484_1998.html)
- [RA 4200 - Anti-Wiretapping Law](https://lawphil.net/statutes/repacts/ra1965/ra_4200_1965.html)
- [BP 22 - Bouncing Checks Law](https://lawphil.net/statutes/bataspam/bp1979/bp_22_1979.html)
- [RA 9285 - Alternative Dispute Resolution Act of 2004](https://lawphil.net/statutes/repacts/ra2004/ra_9285_2004.html)
- [RA 10142 - Financial Rehabilitation and Insolvency Act of 2010](https://lawphil.net/statutes/repacts/ra2010/ra_10142_2010.html)
- [RA 9510 - Credit Information System Act](https://lawphil.net/statutes/repacts/ra2008/ra_9510_2008.html)
- [RA 386 - Civil Code of the Philippines](https://lawphil.net/statutes/repacts/ra1949/ra_386_1949.html)
- [EO 209, s. 1987 - Family Code of the Philippines](https://lawphil.net/executive/execord/eo1987/eo_209_1987.html)
- [Act No. 3753 - Civil Registry Law](https://lawphil.net/statutes/acts/act1930/act_3753_1930.html)
- [RA 9048 - Clerical or Typographical Error Correction in Civil Registry Entries](https://lawphil.net/statutes/repacts/ra2001/ra_9048_2001.html)
- [RA 10172 - Administrative Correction of Sex, Day, and Month in Civil Registry Entries](https://lawphil.net/statutes/repacts/ra2012/ra_10172_2012.html)
- [A.M. No. 02-8-13-SC - 2004 Rules on Notarial Practice](https://lawphil.net/courts/supreme/am/am_02_8_13_sc_2008.html)
- [Rules of Court - Rules on Evidence](https://lawphil.net/courts/rules/rc_128-134_evidence.html)
- [A.M. No. 08-8-7-SC - Rule of Procedure for Small Claims Cases](https://lawphil.net/courts/supreme/am/am_08_8_7_sc_2008.html)
- [1987 Constitution of the Republic of the Philippines](https://lawphil.net/consti/cons1987.html)
- [Act No. 3815 - Revised Penal Code](https://lawphil.net/statutes/acts/act1930/act_3815_1930.html)
- [Rules of Court - Rules on Criminal Procedure](https://lawphil.net/courts/rules/rc_110-127_crim.html)
- [RA 9344 - Juvenile Justice and Welfare Act of 2006](https://lawphil.net/statutes/repacts/ra2006/ra_9344_2006.html)
- [RA 9165 - Comprehensive Dangerous Drugs Act of 2002](https://lawphil.net/statutes/repacts/ra2002/ra_9165_2002.html)
- [RA 10591 - Comprehensive Firearms and Ammunition Regulation Act](https://lawphil.net/statutes/repacts/ra2013/ra_10591_2013.html)
- [BP 880 - Public Assembly Act of 1985](https://lawphil.net/statutes/bataspam/bp1985/bp_880_1985.html)
- [RA 9745 - Anti-Torture Act of 2009](https://lawphil.net/statutes/repacts/ra2009/ra_9745_2009.html)
- [RA 9520 - Philippine Cooperative Code of 2008](https://lawphil.net/statutes/repacts/ra2009/ra_9520_2009.html)
- [RA 7042 - Foreign Investments Act of 1991](https://lawphil.net/statutes/repacts/ra1991/ra_7042_1991.html)
- [RA 11647 - Amendments to the Foreign Investments Act](https://lawphil.net/statutes/repacts/ra2022/ra_11647_2022.html)
- [RA 8762 - Retail Trade Liberalization Act of 2000](https://lawphil.net/statutes/repacts/ra2000/ra_8762_2000.html)
- [RA 11595 - Amendments to the Retail Trade Liberalization Act](https://lawphil.net/statutes/repacts/ra2021/ra_11595_2021.html)
- [RA 11057 - Personal Property Security Act](https://lawphil.net/statutes/repacts/ra2018/ra_11057_2018.html)
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
- [RA 11332 - Mandatory Reporting of Notifiable Diseases and Health Events of Public Health Concern Act](https://lawphil.net/statutes/repacts/ra2019/ra_11332_2019.html)
- [RA 9211 - Tobacco Regulation Act of 2003](https://lawphil.net/statutes/repacts/ra2003/ra_9211_2003.html)
- [RA 11900 - Vaporized Nicotine and Non-Nicotine Products Regulation Act](https://lawphil.net/statutes/repacts/ra2022/ra_11900_2022.html)
- [RA 11166 - Philippine HIV and AIDS Policy Act](https://lawphil.net/statutes/repacts/ra2018/ra_11166_2018.html)
- [RA 10152 - Mandatory Infants and Children Health Immunization Act](https://lawphil.net/statutes/repacts/ra2011/ra_10152_2011.html)
- [RA 7719 - National Blood Services Act of 1994](https://lawphil.net/statutes/repacts/ra1994/ra_7719_1994.html)
- [RA 11215 - National Integrated Cancer Control Act](https://lawphil.net/statutes/repacts/ra2019/ra_11215_2019.html)
- [RA 10354 - Responsible Parenthood and Reproductive Health Act of 2012](https://lawphil.net/statutes/repacts/ra2012/ra_10354_2012.html)
- [RA 10066 - National Cultural Heritage Act of 2009](https://lawphil.net/statutes/repacts/ra2010/ra_10066_2010.html)
- [RA 9994 - Expanded Senior Citizens Act of 2010](https://lawphil.net/statutes/repacts/ra2010/ra_9994_2010.html)
- [RA 7277 - Magna Carta for Disabled Persons](https://lawphil.net/statutes/repacts/ra1992/ra_7277_1992.html)
- [PD 1096 - National Building Code of the Philippines](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/11/53320)
- [PD 856 - Code on Sanitation of the Philippines](https://lawphil.net/statutes/presdecs/pd1975/pd_856_1975.html)
- [BP 344 - Accessibility Law](https://lawphil.net/statutes/bataspam/bp1983/bp_344_1983.html)
- [RA 7610 - Special Protection of Children Against Abuse, Exploitation and Discrimination Act](https://lawphil.net/statutes/repacts/ra1992/ra_7610_1992.html)
- [RA 8042 - Migrant Workers and Overseas Filipinos Act of 1995](https://lawphil.net/statutes/repacts/ra1995/ra_8042_1995.html)
- [RA 10022 - Amendments to the Migrant Workers and Overseas Filipinos Act](https://lawphil.net/statutes/repacts/ra2010/ra_10022_2010.html)
- [RA 11641 - Department of Migrant Workers Act](https://lawphil.net/statutes/repacts/ra2021/ra_11641_2021.html)
- [CA 613 - Philippine Immigration Act of 1940](https://lawphil.net/statutes/comacts/ca1940/ca_613_1940.html)
- [CA 473 - Revised Naturalization Law](https://lawphil.net/statutes/comacts/ca1939/ca_473_1939.html)
- [RA 9139 - Administrative Naturalization Law of 2000](https://lawphil.net/statutes/repacts/ra2001/ra_9139_2001.html)
- [RA 9225 - Citizenship Retention and Re-acquisition Act of 2003](https://lawphil.net/statutes/repacts/ra2003/ra_9225_2003.html)
- [RA 11983 - New Philippine Passport Act](https://lawphil.net/statutes/repacts/ra2024/ra_11983_2024.html)
- [RA 8239 - Philippine Passport Act of 1996](https://lawphil.net/statutes/repacts/ra1996/ra_8239_1996.html)
- [BP 881 - Omnibus Election Code of the Philippines](https://lawphil.net/statutes/bataspam/bp1985/bp_881_1985.html)
- [RA 8189 - Voter's Registration Act of 1996](https://lawphil.net/statutes/repacts/ra1996/ra_8189_1996.html)
- [RA 7166 - Synchronized National and Local Elections Act](https://lawphil.net/statutes/repacts/ra1991/ra_7166_1991.html)
- [RA 9006 - Fair Election Act](https://lawphil.net/statutes/repacts/ra2001/ra_9006_2001.html)
- [RA 8436 - Automated Election System Act](https://lawphil.net/statutes/repacts/ra1997/ra_8436_1997.html)
- [RA 9369 - Automated Election System Act amendments](https://lawphil.net/statutes/repacts/ra2007/ra_9369_2007.html)
- [RA 10742 - Sangguniang Kabataan Reform Act of 2015](https://lawphil.net/statutes/repacts/ra2016/ra_10742_2016.html)
- [RA 11768 - Strengthening the Sangguniang Kabataan Reform Act](https://lawphil.net/statutes/repacts/ra2022/ra_11768_2022.html)
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
- [RA 4136 - Land Transportation and Traffic Code](https://lawphil.net/statutes/repacts/ra1964/ra_4136_1964.html)
- [RA 11659 - Public Service Act Amendments](https://lawphil.net/statutes/repacts/ra2022/ra_11659_2022.html)
- [RA 8371 - Indigenous Peoples Rights Act of 1997](https://lawphil.net/statutes/repacts/ra1997/ra_8371_1997.html)
- [PD 1529 - Property Registration Decree](https://lawphil.net/statutes/presdecs/pd1978/pd_1529_1978.html)
- [RA 8435 - Agriculture and Fisheries Modernization Act of 1997](https://lawphil.net/statutes/repacts/ra1997/ra_8435_1997.html)
- [RA 10068 - Organic Agriculture Act of 2010](https://lawphil.net/statutes/repacts/ra2010/ra_10068_2010.html)
- [RA 10611 - Food Safety Act of 2013](https://lawphil.net/statutes/repacts/ra2013/ra_10611_2013.html)
- [RA 11321 - Sagip Saka Act](https://lawphil.net/statutes/repacts/ra2019/ra_11321_2019.html)
- [RA 3019 - Anti-Graft and Corrupt Practices Act](https://lawphil.net/statutes/repacts/ra1960/ra_3019_1960.html)
- [RA 6713 - Code of Conduct and Ethical Standards for Public Officials and Employees](https://lawphil.net/statutes/repacts/ra1989/ra_6713_1989.html)
- [PD 1445 - Government Auditing Code of the Philippines](https://lawphil.net/statutes/presdecs/pd1978/pd_1445_1978.html)
- [RA 7080 - Plunder Act](https://lawphil.net/statutes/repacts/ra1991/ra_7080_1991.html)
- [RA 10149 - GOCC Governance Act of 2011](https://lawphil.net/statutes/repacts/ra2011/ra_10149_2011.html)
- [RA 6758 - Compensation and Position Classification Act of 1989](https://lawphil.net/statutes/repacts/ra1989/ra_6758_1989.html)
- [RA 11199 - Social Security Act of 2018](https://lawphil.net/statutes/repacts/ra2019/ra_11199_2019.html)
- [RA 8291 - Government Service Insurance System Act of 1997](https://lawphil.net/statutes/repacts/ra1997/ra_8291_1997.html)
- [RA 9679 - Home Development Mutual Fund Law of 2009](https://lawphil.net/statutes/repacts/ra2009/ra_9679_2009.html)
- [RA 10606 - National Health Insurance Act of 2013](https://lawphil.net/statutes/repacts/ra2013/ra_10606_2013.html)
- [RA 11210 - 105-Day Expanded Maternity Leave Law](https://lawphil.net/statutes/repacts/ra2019/ra_11210_2019.html)
- [RA 8187 - Paternity Leave Act of 1996](https://lawphil.net/statutes/repacts/ra1996/ra_8187_1996.html)
- [RA 10361 - Domestic Workers Act or Batas Kasambahay](https://lawphil.net/statutes/repacts/ra2013/ra_10361_2013.html)

## Limits

Providerless mode does not search live government sites, new issuances, court decisions, local ordinances, amendments, or facts outside the query or draft text. Treat it as a resilient research aid and drafting checklist. Verify all outputs against current official sources and qualified legal counsel before making compliance decisions.
