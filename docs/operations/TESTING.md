# Testing

Run commands from the repository root.

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

The providerless self-test covers the local legal research and draft-checking engine directly, without network or browser dependencies, including RA 10173 privacy operations, the Data Privacy Act IRR for PIC/PIP and lawful-processing implementation, NPC Circular No. 16-03 breach management, NPC Advisory No. 2026-02 DBNMS submissions, NPC Circular No. 2023-06 security safeguards, NPC Circular No. 2023-04 consent, NPC Circular No. 2022-04 DPO/DPS registration, NPC Circular No. 2020-03 data sharing agreements, NPC Advisory No. 2025-02 privacy engineering, Cybercrime Prevention Act IRR implementation coverage for RA 10175 cyber incident and electronic-evidence workflows, A.M. No. 17-11-03-SC Rule on Cybercrime Warrants coverage for WDCD/WICD/WSSECD/WECD and cybercrime court-process workflows, DOLE Department Order No. 147-15 termination due process, DOLE Department Order No. 174-17 contracting/subcontracting, DOLE Department Order No. 198-18 OSH implementation, SEC Memorandum Circular No. 28, s. 2020 official email/mobile contact requirements, SEC MC No. 1, s. 2021 beneficial ownership transparency, SEC MC No. 15, s. 2025 beneficial ownership disclosure rules, SEC HARBOR beneficial ownership registry workflows, Joint Administrative Order No. 24-03, s. 2024 Internet Transactions Act IRR, BSP Circular No. 1160, s. 2022 financial consumer protection, BSP Circular No. 1169, s. 2023 consumer assistance, BSP Circular No. 1140, s. 2022 fraud management, BSP Circular No. 1108, s. 2021 VASP guidance, AMLC 2018 AMLA IRR implementation coverage for RA 9160 AML workflows, RA 11976 EOPT with BIR RR 3-2024, RR 4-2024, RR 5-2024, RR 6-2024, RR 7-2024, RR 8-2024, RR 11-2024, and RMC 77-2024 implementation workflows, RA 12023 VAT on Digital Services and NRDSP workflows, RA 11642 domestic administrative adoption/alternative child care/NACC, RA 11222 simulated birth rectification, RA 11767 foundling recognition, RA 9442 PWD privileges, RA 10070 PDAO, RA 10524 PWD employment, and RA 10754 PWD discounts/VAT exemptions.
It also covers RA 12001 and BLGF MC No. 001-2025 RPVARA IRR for real property valuation, RPT, local assessment, SMV, tax declaration, assessor/treasurer, notice, appeal, and property-record safeguards.
The local RAG golden-query check covers exact citations, citation variants, AI governance guidance, privacy-operations/NPC-compliance workflows, Cybercrime Prevention Act IRR implementation workflows, Rule on Cybercrime Warrants direct retrieval, cross-law workflows, labor termination due-process workflows, labor contracting/subcontracting workflows, OSH IRR workflows, DRRM/imminent-disaster workflows, SEC official email/mobile contact workflows, SEC beneficial ownership/HARBOR workflows, internet-transactions IRR workflows, AMLC 2018 AMLA IRR implementation workflows, EOPT/BIR implementation workflows, digital-services VAT/NRDSP/BIR implementation workflows, EPR/plastic-packaging workflows, payment-system operator and settlement workflows, BSP financial-consumer, consumer-assistance, fraud-management, and VASP workflows, CFT/sanctions and AMLC asset-freeze workflows, anti-terrorism designation/proscription safeguards, aviation/maritime/ports/seafarer workflows, downstream fuels/local energy workflows, education governance/inclusive-learning workflows, PWD benefits/accessibility/employment workflows, public-land/free-patent/agrarian-reform workflows, child adoption/foundling/civil-status workflows, cultural heritage and ECCD exact-citation coverage, condominium/socialized-housing workflows, professional licensing/CPD/pharmacy workflows, medicine-access and tobacco-warning workflows, agricultural economic-sabotage workflows, ranking diagnostics, source trust metadata, and no-result behavior.
The local RAG performance check covers uncached exact-citation, Cybercrime Prevention Act IRR implementation, Rule on Cybercrime Warrants retrieval, AI-governance, privacy-operations/NPC-compliance workflow, deep-workflow, labor implementation and SEC contact workflow, SEC beneficial ownership/HARBOR workflow, payment-system/CFT workflow, AMLA IRR controls inside payment/CFT and BSP/VASP workflows, cybercrime IRR controls inside payment/CFT and financial-account-scam workflows, internet-transactions IRR marketplace workflow, BSP consumer/fraud/VASP workflow, aviation/maritime workflow, digital-services VAT/NRDSP workflow, downstream-fuels/local-energy workflow, education-governance/inclusive-learning workflow, PWD benefits/accessibility workflow, public-land/free-patent/agrarian-reform workflow, real-property valuation workflow, imminent-disaster/anticipatory-action workflow, child-adoption/foundling/civil-status workflow, unrelated no-result, and warm-cache local queries.
The local RAG governance check validates corpus source records, evidence anchors, authority relations, framework references, and coverage-map records, including new framework slices such as `privacy-operations-and-npc-compliance`, `workplace-pay-flex-work-and-family-support`, `workplace-school-and-public-safety`, `business-market-entry-ownership-and-secured-finance`, `health-welfare-and-accessibility`, `public-land-free-patent-and-agrarian-reform`, `child-adoption-foundling-and-civil-status`, and the Cybercrime Prevention Act IRR, Rule on Cybercrime Warrants, AMLC 2018 AMLA IRR, and SEC beneficial ownership/HARBOR source and workflow links.
Golden, performance, and governance checks should include the `real-property-valuation-local-tax-and-assessment` framework and its RA 12001/BLGF source, relation, coverage-map, and draft-warning records.
Golden, performance, and governance checks should include RA 10121 and RA 12287 for DRRM, state of imminent disaster, forecasted hazard, pre-disaster risk assessment, anticipatory action, pre-emptive evacuation, relief prepositioning, LDRRMF, special trust fund, national DRRM fund, OCD monitoring, and false hazard information controls.
Golden, performance, and governance checks should include RA 10863 and BOC CAO No. 09-2020 for customs, formal entry, goods declaration, valuation, classification, duties and taxes, regulated-goods permits, customs broker responsibility, examination, release, post-clearance audit, seizure, forfeiture, protest, appeal, procurement acceptance, and imported public-equipment records.
For education/inclusive-learning updates, include exact-citation probes for RA 9155, RA 10157, RA 12199, RA 10650, and RA 11650. Include RA 10410 only as a superseded historical-context probe if the local corpus keeps prior Early Years Act references.
For PWD/senior benefits and accessibility updates, include exact-citation probes for RA 9442, RA 10070, RA 10524, and RA 10754; direct probes for senior benefits, PWD discount/VAT exemption, PDAO, and PWD employment; and one broad workflow query covering PDAO, PWD ID verification, discounts, VAT exemption, reasonable accommodation, accessible service channels, employment support, complaint handling, and confidential records.
For privacy-operations/NPC-compliance updates, include an implementation probe for the Data Privacy Act IRR and exact-citation probes for NPC Circular No. 16-03, NPC Advisory No. 2026-02, NPC Circular No. 2023-06, NPC Circular No. 2023-04, NPC Circular No. 2022-04, NPC Circular No. 2020-03, and NPC Advisory No. 2025-02. Also include one broad workflow query covering RA 10173, the Data Privacy Act IRR, lawful processing, DPO, PIC/PIP, DPS registration, consent and withdrawal, privacy notices, data-subject rights, data sharing agreements, outsourcing, DBNMS breach notification, security safeguards, processor/vendor oversight, privacy engineering, automated decision-making, and profiling. Answers should remind users to verify live DBNMS submissions, NPC portal account status, actual breach facts, registration status, current NPC issuances, and qualified counsel.
For AMLC 2018 AMLA IRR updates, include one implementation probe covering RA 9160, covered persons, customer due diligence, KYC, beneficial ownership, CTR, STR, recordkeeping, AMLC escalation, confidentiality, anti-tipping-off controls, and AML compliance program ownership. Also include broad workflow assertions through payment-system/CFT, BSP/VASP, financial-account-scam, and financial-institution queries. Answers should remind users to verify current AMLC issuances, reporting guidelines, portal procedures, covered-person registration, live filing facts, sanctions or freeze-order facts, regulated-entity records, and qualified counsel.
For Cybercrime Prevention Act IRR and Rule on Cybercrime Warrants updates, include one implementation probe covering RA 10175, preservation orders, service providers, traffic data, content data, subscriber information, computer data, cyber warrants, DOJ Office of Cybercrime, CICC, CERT, electronic evidence, and chain of custody. Add a direct warrant-rule probe for A.M. No. 17-11-03-SC, WDCD, WICD, WSSECD, WECD, probable cause, service-provider disclosure, forensic image, inventory, return, retention, destruction, confidentiality, and motion-to-suppress signals. Also include broad workflow assertions through data incident response, financial-account scams, payment-system/CFT, digital-government/public-ICT, privacy, AI-governance, and rights/criminal-enforcement queries. Answers should remind users to verify current DOJ/OOC, CICC, PNP/NBI, prosecutor, cybercrime court, court-rule, warrant, service-provider, evidence-custody, and privacy facts with official sources and qualified counsel.
For EOPT/BIR implementation updates, include direct probes for RR 7-2024, RR 11-2024, and RMC 77-2024 invoicing, official receipt transition, COR, ATP, unused-form, and serial-number workflows; direct probes for RR 3-2024, RR 4-2024, RR 5-2024, RR 6-2024, and RR 8-2024 VAT, percentage tax, filing/payment, refund, penalty, and taxpayer-classification workflows; one broad business-tax workflow query; performance coverage for the EOPT/BIR implementation workflow; and governance checks that the business-tax framework references the new corpus, source, relation, and coverage-map records.
For digital-services VAT/NRDSP updates, include an exact-citation probe for RA 12023. Also include one broad workflow query covering VAT on Digital Services, NRDSP, nonresident digital service provider, resident digital service provider, online marketplace or platform signals, registration, invoicing, remittance, and BIR digital-services VAT implementation. For professional-practice, housing, medicine, tobacco-warning, and agricultural economic-sabotage updates, include broad workflow queries that assert the expected framework section and top matched authority. Answers should remind users to verify current official issuances, regulator portal instructions, taxpayer or license facts, transaction records, accounting or professional records, and qualified counsel before relying on local output.
For labor implementation and SEC official-contact updates, include exact-citation probes for DOLE Department Order No. 147-15, DOLE Department Order No. 174-17, DOLE Department Order No. 198-18, and SEC Memorandum Circular No. 28, s. 2020. Also include broad workflow queries covering termination twin notice, notice to explain, hearing or conference records, just and authorized cause, labor-only contracting, contractor registration, service agreements, principal/contractor supervision boundaries, OSH program, safety officer, safety committee, workplace accident reports, DOLE inspections, official SEC email, official cellphone number, authorized representative, MC28 portal, corporate contact, and reportorial records. The expected top authorities are the matching DOLE order for each labor query and SEC MC28 for the corporate-contact query. Answers should remind users to verify current DOLE/NLRC guidance, later DOLE and SEC issuances, contractor registration status, OSH forms and thresholds, company facts, CBA or handbook terms, MC28 portal instructions, entity records, and qualified counsel before relying on local output.
For SEC beneficial ownership/HARBOR updates, include exact-citation probes for SEC MC No. 15, s. 2025 and broad workflow queries covering beneficial ownership disclosure, HARBOR portal, GIS, ultimate beneficial owner, direct and indirect ownership, nominees, control persons, authorized filer, corporate secretary records, AML due diligence links, privacy safeguards, and reportorial records. Answers should remind users to verify live HARBOR behavior, credentials, entity coverage, actual beneficial-owner facts, filing status, later SEC issuances, and qualified counsel before relying on local output.
For public-land/free-patent/agrarian-reform updates, include exact-citation probes for RA 11573, RA 10023, RA 11231, RA 6657, RA 9700, and RA 11953. Also include one broad workflow query covering imperfect/incomplete title, residential and agricultural free patents, alienable and disposable land, CARP/CARPER, CLOA/ARB, DAR clearance, agrarian emancipation, debt condonation, DENR CENRO/PENRO, Register of Deeds, LandBank, and LGU verification signals.
For real-property valuation/RPT/local-assessment updates, include exact-citation probes for RA 12001 and BLGF MC No. 001-2025 RPVARA IRR. Also include one broad workflow query covering schedule of market values, property classification, valuation basis, tax declaration, assessment roll, assessor and treasurer ownership, notice/publication, RPT billing or delinquency, Local Board and Central Board of Assessment Appeals, property-record custody, privacy, retention, and LGU verification signals.
For child adoption/foundling/civil-status updates, include exact-citation probes for RA 11642, RA 11222, and RA 11767. Also include one broad workflow query covering adoption, domestic administrative adoption, alternative child care, NACC, simulated birth rectification, foundling recognition, birth certificates, civil registry, child identity, social welfare, and confidentiality controls. Answers should remind users to verify case facts and remedies with NACC, DSWD, local social welfare, the local civil registrar, the relevant LGU, current official issuances, and qualified counsel.
For customs/import-clearance updates, include exact-citation probes for RA 10863 and BOC CAO No. 09-2020. Also include one broad workflow query covering CMTA, formal entry, goods declaration, customs valuation, tariff classification, duties and taxes, product permits, customs broker responsibility, regulated goods, examination, release, post-clearance audit, seizure, forfeiture, protest, appeal, procurement acceptance, and imported public-equipment records. Answers should remind users to verify current BOC systems, port instructions, tariff treatment, commodity permits, shipment records, and qualified counsel or customs brokers before relying on local output.
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
