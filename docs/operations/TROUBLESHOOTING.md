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

If local mode does not return a result, try a narrower query with a statute number or issuance such as `RA 9003`, `RA 10173`, `NPC Circular No. 16-03`, `NPC Advisory No. 2026-02`, `NPC Circular No. 2023-06`, `NPC Circular No. 2023-04`, `NPC Circular No. 2022-04`, `NPC Circular No. 2020-03`, `NPC Advisory No. 2025-02`, `RA 11058`, `RA 7160`, `RA 10121`, `RA 10667`, `RA 11765`, `RA 8484`, `RA 4200`, `BP 22`, `RA 9285`, `RA 10142`, `RA 9510`, `RA 386`, `EO 209`, `Act No. 3753`, `RA 9048`, `RA 10172`, `RA 11642`, `RA 11222`, `RA 11767`, `A.M. No. 02-8-13-SC`, `Rules of Court`, `A.M. No. 08-8-7-SC`, `1987 Constitution`, `Act No. 3815`, `Rules of Criminal Procedure`, `RA 9344`, `RA 9165`, `RA 10591`, `BP 880`, `RA 9745`, `RA 9520`, `RA 7042`, `RA 11647`, `RA 8762`, `RA 11595`, `RA 11057`, `CA 613`, `CA 473`, `RA 9139`, `RA 9225`, `RA 11983`, `RA 8239`, `RA 10022`, `RA 11641`, `BP 881`, `RA 8189`, `RA 7166`, `RA 9006`, `RA 8436`, `RA 9369`, `RA 10742`, `RA 11768`, `RA 11934`, `RA 11976`, `RA 12023`, `RA 4136`, `RA 11659`, `PD 1529`, `RA 11573`, `RA 10023`, `RA 11231`, `RA 6657`, `RA 9700`, `RA 11953`, `RA 8371`, `RA 8435`, `RA 10068`, `RA 10611`, `RA 11321`, `RA 3019`, `RA 6713`, `PD 1445`, `RA 7080`, `RA 10149`, `RA 6758`, `RA 11199`, `RA 8291`, `RA 9679`, `RA 10606`, `RA 11210`, `RA 8187`, `RA 10361`, `PD 442`, `RA 8293`, `RA 8799`, `RA 9711`, `RA 11223`, `RA 11332`, `RA 9211`, `RA 11900`, `RA 11166`, `RA 10152`, `RA 7719`, `RA 11215`, `RA 10354`, `RA 11036`, `RA 9262`, `RA 9994`, `RA 7277`, `RA 9442`, `RA 10070`, `RA 10524`, `RA 10754`, `PD 1096`, `PD 856`, `BP 344`, `RA 7610`, `RA 8042`, `RA 1405`, `RA 7653`, `RA 11211`, `RA 8791`, `RA 9474`, `RA 8556`, `RA 10607`, `RA 9829`, `RA 10846`, `RA 7581`, `RA 7638`, `RA 8479`, `RA 11592`, `RA 9367`, `RA 9513`, `RA 9729`, `RA 7942`, `RA 10533`, `RA 10931`, `RA 9470`, `RA 11310`, or `RA 11861`. The local corpus is intentionally bounded and does not search live government sites.

For the expanded local workflow packs, try `RA 11898` for EPR and plastic-packaging recovery, `RA 11127` for operators of payment systems, `RA 10168` for CFT/sanctions and AMLC asset-freeze workflows, `RA 11479` for anti-terrorism designation and proscription safeguards, `RA 8479` for downstream oil and fuel retail, `RA 11592` for LPG cylinders/refilling/dealers, `RA 9367` for biofuel blends, or `RA 7638` for DOE coordination/monitoring.

For the AMLC 2018 AMLA IRR slice, try `AMLC 2018 AMLA IRR`, `AMLA IRR`, `RA 9160 IRR`, `covered persons`, `customer due diligence`, `beneficial ownership`, `covered transaction report`, `suspicious transaction report`, `recordkeeping`, `AMLC reporting`, `confidentiality`, `tipping-off`, or `AML compliance program`. Providerless mode cannot verify current AMLC amendments, registration status, reporting portal behavior, actual CTR or STR filings, sanctions hits, freeze orders, customer risk facts, or regulated-entity records; confirm those with AMLC, BSP or the relevant regulator, current official issuances, internal records, and qualified counsel.

For the labor implementation slice, try `DOLE Department Order No. 147-15` for termination due process, twin notice, notice to explain, hearing or conference, just cause, authorized cause, separation pay, final pay, and dismissal records; `DOLE Department Order No. 174-17` for contracting/subcontracting, labor-only contracting, contractor registration, service agreements, principal/contractor roles, supervision boundaries, payroll, and benefits records; or `DOLE Department Order No. 198-18` for OSH programs, safety officers, safety committees, worker training, PPE, workplace accident reports, DOLE inspections, and corrective action. Providerless mode cannot verify current DOLE or NLRC guidance, later issuances, actual contractor registration, company handbook or CBA terms, worker facts, OSH thresholds, training status, incident facts, or inspection status; confirm those with DOLE, NLRC or court guidance, employer records, official issuances, and qualified labor counsel.

For the SEC official-contact slice, try `SEC Memorandum Circular No. 28, s. 2020` or `SEC MC 28` for official email address, official cellphone number, authorized representative, MC28 portal, corporate contact owner, notice routing, and reportorial records. Providerless mode cannot verify current MC28 portal behavior, filing deadlines, later SEC issuances, actual contact authority, access credentials, entity records, or reportorial status; confirm those with SEC, current portal instructions, corporate records, and qualified counsel.

For the SEC beneficial ownership/HARBOR slice, try `SEC MC 15 s. 2025`, `beneficial ownership disclosure`, `HARBOR portal`, `GIS`, `ultimate beneficial owner`, `nominee`, `control person`, `authorized filer`, or `corporate secretary records`. Providerless mode cannot verify live HARBOR portal behavior, credentials, entity coverage, actual beneficial-owner facts, filing deadlines, SEC acceptance, later SEC issuances, or reportorial status; confirm those with SEC, current HARBOR instructions, corporate records, and qualified counsel.

For the Internet Transactions Act IRR slice, try `Joint Administrative Order No. 24-03, s. 2024`, `RA 11967 IRR`, or `Internet Transactions Act IRR` for online merchant onboarding, seller verification, e-marketplace platform responsibilities, takedown or corrective action, consumer redress, E-Commerce Bureau routing, and transaction records. If a broad marketplace query is weak, include concrete terms such as `online merchant`, `e-retailer`, `e-marketplace`, `digital platform`, `merchant onboarding`, `seller information`, `seller verification`, `product listing`, `notice and action`, `takedown`, `complaint`, `refund`, `transaction record`, and `online business database`. Providerless mode cannot verify current DTI or E-Commerce Bureau advisories, platform-registration status, seller identity, product facts, delivery facts, payment facts, tax treatment, complaint deadlines, or sector-regulator requirements; confirm those with DTI, the relevant regulator, platform records, transaction documents, current official issuances, and qualified counsel.

For the BSP financial-consumer/fraud/VASP slice, try `BSP Circular No. 1160, s. 2022` for financial consumer protection regulations, market conduct, transparent pricing, complaint handling, fraud response, and consumer data protection; `BSP Circular No. 1169, s. 2023` for consumer assistance mechanisms, complaint intake, acknowledgment, resolution timelines, escalation, root-cause analysis, and remediation; `BSP Circular No. 1140, s. 2022` for fraud management systems, monitoring, customer authentication, account takeover, incident response, and fraud reporting; or `BSP Circular No. 1108, s. 2021` for VASP registration, crypto exchange custody, wallet-address records, CDD, transaction monitoring, cybersecurity, and consumer disclosures. Providerless mode cannot verify current BSP amendments, MORB/MORNBFI updates, AMLC guidance, entity licensing or VASP registration, fraud case facts, wallet ownership, live complaint deadlines, or supervisory reporting status; confirm those with BSP, AMLC, regulated-entity records, current official issuances, and qualified counsel.

For the EOPT/BIR implementation slice, try `RA 11976`, `RR 3-2024`, `RR 4-2024`, `RR 5-2024`, `RR 6-2024`, `RR 7-2024`, `RR 8-2024`, `RR 11-2024`, or `RMC 77-2024` for VAT or percentage-tax treatment, filing and payment, refund claims, reduced penalties, taxpayer classification, COR, sales or service invoices, official receipt transition, unused official receipts, ATP, serial numbers, and BIR circular clarifications. Providerless mode cannot verify current BIR forms, portal procedures, registration status, actual taxpayer classification, invoice approval, unused-form inventory, refund eligibility, rates, deadlines, or later issuances; confirm those with BIR, current official issuances, accounting records, and qualified tax counsel.

For the digital-services VAT/NRDSP slice, try `RA 12023` for VAT on Digital Services, nonresident digital service providers, marketplace/platform signals, registration, invoicing, remittance, and BIR digital-services VAT implementation. If a broad query is weak, include concrete terms such as `VAT on Digital Services`, `NRDSP`, `nonresident digital service provider`, `digital service provider`, `online marketplace`, `platform`, `BIR registration`, `invoice`, `remittance`, and `reverse charge`. Providerless mode cannot verify current BIR issuances, portal procedures, actual registration or filing status, taxpayer classification, transaction facts, accounting treatment, or current agency interpretation; confirm those with BIR, current official issuances, internal records, and qualified tax counsel.

For the privacy-operations/NPC-compliance slice, try `RA 10173` for the Data Privacy Act, `Data Privacy Act IRR` for PIC/PIP roles and lawful-processing implementation, `NPC Circular No. 16-03` for personal data breach management, `NPC Advisory No. 2026-02` for DBNMS submissions, `NPC Circular No. 2023-06` for security safeguards, `NPC Circular No. 2023-04` for consent, `NPC Circular No. 2022-04` for DPO designation, DPS registration, and automated decision-making/profiling notification, `NPC Circular No. 2020-03` for data sharing agreements, or `NPC Advisory No. 2025-02` for privacy engineering. If a broad privacy query is weak, include concrete terms such as `lawful processing`, `DPO`, `PIC`, `PIP`, `DPS registration`, `privacy notice`, `consent withdrawal`, `data subject rights`, `data sharing agreement`, `DSA`, `outsourcing`, `personal data breach`, `DBNMS`, `security safeguards`, `processor`, `vendor`, `PIA`, `privacy by design`, `automated decision-making`, and `profiling`. Providerless mode cannot verify live DBNMS submissions, NPC portal account status, actual breach facts, current registration status, organization-specific thresholds, or current agency interpretation; confirm those with NPC, current official issuances, internal records, and qualified counsel.

For the education/inclusive-learning slice, try `RA 9155` for basic education governance, `RA 10157` for kindergarten, `RA 12199` for current early childhood/ECCD, `RA 10650` for open distance learning, or `RA 11650` for inclusive learning and learners with disabilities. Use `RA 10410` only for historical Early Years Act context; it was repealed by RA 12199. Verify current ECCD answers against current DepEd, CHED, TESDA, ECCD Council, and LGU issuances because providerless mode does not search live agency updates.

For the PWD/senior benefits and accessibility slice, try `RA 9994` for senior-citizen benefits, `RA 7277` for PWD rights, `RA 9442` for PWD privileges and anti-discrimination signals, `RA 10070` for PDAO, `RA 10524` for PWD employment, `RA 10754` for PWD discounts and VAT exemptions, or `BP 344` for physical accessibility. If a broad query is weak, include concrete terms such as `PDAO`, `PWD ID`, `discount`, `VAT exemption`, `reasonable accommodation`, `accessible service channel`, `PWD employment`, `complaint`, `confidential records`, `OSCA`, and the relevant local office. Providerless mode cannot verify eligibility, actual ID validity, local budget, current DSWD/NCDA/BIR guidance, or establishment-specific tax treatment; confirm those with the relevant LGU, PDAO/OSCA, DSWD, NCDA, BIR, official issuances, and qualified counsel.

For the public-land/free-patent/agrarian-reform slice, try `RA 11573` for imperfect or incomplete title confirmation, `RA 10023` for residential free patents, `RA 11231` for agricultural free patents, `RA 6657` and `RA 9700` for CARP/CARPER coverage, or `RA 11953` for agrarian emancipation and debt condonation. If a broad land query is weak, include concrete terms such as `alienable and disposable land`, `DENR CENRO`, `Register of Deeds`, `DAR clearance`, `CLOA`, `ARB`, `LandBank amortization`, `debt condonation`, and the relevant LGU. Providerless mode cannot verify actual land classification, cadastral surveys, title encumbrances, DAR/DENR case status, LandBank balances, or local zoning; confirm those with DENR, DAR, LandBank, the Register of Deeds, the LGU, official issuances, and qualified counsel.

For the child adoption/foundling/civil-status slice, try `RA 11642` for domestic administrative adoption, alternative child care, NACC, child placement, matching, custody, and post-adoption confidentiality; `RA 11222` for simulated birth rectification, adoption-linked birth-certificate correction, and civil-registry records; or `RA 11767` for foundling recognition, birth registration, child identity, service access, and confidentiality. If a broad query is weak, include concrete terms such as `administrative adoption`, `alternative child care`, `NACC`, `DSWD`, `local social welfare`, `simulated birth rectification`, `foundling recognition`, `birth certificate`, `local civil registrar`, `civil registry`, `child identity`, `LGU`, and `confidentiality`. Providerless mode cannot verify actual child status, eligibility, consent, custody, matching, agency case status, civil-registry live records, passport or school eligibility, benefits access, or current agency procedures; confirm those with NACC, DSWD, local social welfare, the local civil registrar, the relevant LGU, official issuances, and qualified counsel.

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
