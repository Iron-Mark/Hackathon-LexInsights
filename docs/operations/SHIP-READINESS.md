# Ship Readiness Checkpoint

Date: June 22, 2026
Branch: `dev`

This checkpoint is the handoff record for pausing active development after the current LexInSight polish pass. It should be updated only when a new release candidate changes the ship/no-ship status.

## Scope Locked In

- Guest-first chat experience with sign-in and sign-up available without gating exploration.
- Clerk authentication opened in modal-style entry points instead of redirecting away from the app surface.
- Providerless local legal research for demo-ready Philippine law coverage, including privacy, cybercrime, child online safety, AML, solid waste, procurement, government service delivery, anti-graft, ethics, COA audit, public funds, GOCC governance, public compensation, employee benefits, SSS, GSIS, Pag-IBIG, PhilHealth, maternity and paternity leave, kasambahay, competition, financial consumer protection, BSP supervision, banking, lending companies, financing companies, insurance, pre-need plans, PDIC and deposit insurance, access-device fraud, anti-wiretapping, bouncing checks, ADR, insolvency, credit information, civil contracts, family status, civil registry records and corrections, notarization, evidence handling, small claims, constitutional rights, criminal complaints, Revised Penal Code issues, criminal procedure, juvenile justice, dangerous drugs, firearms, public assemblies, anti-torture, cooperatives, foreign investment, retail trade, secured transactions, movable collateral, immigration, visas, passports, citizenship, naturalization, OFW/DMW assistance, elections, voter registration, campaign materials, automated election systems, SK/youth governance, public health, notifiable disease reporting, tobacco, vape, HIV, immunization, blood services, cancer control, reproductive health, hazardous substances, SIM registration, customs, tax administration, identity, transport, aviation, domestic shipping, seafarer welfare, Coast Guard incident response, ports and cargo operations, public services, land titles, FPIC, agriculture, organic agriculture, food safety, protected-area scope, labor, health, social welfare, IP, securities, FDA-regulated products, cultural heritage, built environment, sanitation, accessibility, child protection, migrant workers, bank secrecy, price controls, BMBE/MSME support, renewable energy, climate, fisheries, mining, education, public records, FOI, housing, and social benefits.
- Expanded local demo scope covers RA 11898 EPR/plastic-packaging recovery and DENR reporting, RA 11127 operators of payment systems and clearing/settlement infrastructure, RA 10168 CFT/sanctions and AMLC asset-freeze/watchlist workflows, and RA 11479 anti-terrorism designation/proscription due-process safeguards.
- Providerless downstream fuels/local energy demo scope covers RA 8479 downstream oil and fuel retail, petroleum product quality/pricing/stock reporting, RA 11592 LPG cylinders/refilling/dealers, RA 9367 biofuel blend mandates, and RA 7638 DOE coordination/monitoring.
- Providerless education/inclusive-learning demo scope covers RA 9155 basic education governance, RA 10157 kindergarten, RA 12199 current early childhood/ECCD, RA 10650 open distance learning, and RA 11650 inclusive learning for learners with disabilities. RA 10410 is historical/superseded Early Years Act context only because RA 12199 repealed it in 2025.
- Providerless public-land/free-patent/agrarian-reform demo scope covers RA 11573 imperfect and incomplete title confirmation, RA 10023 residential free patents, RA 11231 agricultural free patents, RA 6657 CARP, RA 9700 CARPER, and RA 11953 agrarian emancipation/debt condonation. Outputs must remind users to verify land status, patents, CLOA/ARB records, DAR clearance, LandBank amortization/debt context, Register of Deeds records, and LGU land-use signals with the relevant agencies.
- Chat UX polish: realistic streaming, subtler message surfaces, mobile-safe composer, mode selector beside upload, scroll controls, improved sidebar behavior, and responsive report cards.
- Compliance report rendering polish: practical checklist items render as checkbox-style rows, query echo removed from assistant briefs, `.docx` Word download labeling, and mobile action wrapping.
- Dark-mode contrast and brand-logo cleanup across header, sidebar, dialogs, and app icons.
- Documentation consolidation under [UI](../reference/UI.md) and this ship-readiness note.

## Design System Standard

The shipping UI should follow the consolidated source of truth in [UI](../reference/UI.md). Before accepting new visual work, check these areas:

- Color tokens instead of one-off Tailwind color choices.
- Consistent radius, spacing, and elevation across cards, dialogs, tooltips, and composer controls.
- 44px minimum touch targets for primary mobile actions.
- No horizontal overflow at 320px, 375px, 548px, tablet, and desktop widths.
- Dark mode checked separately, not assumed from light mode.
- Header, sidebar, prompt cards, resource dialog, report cards, and composer all follow the same interaction language.

## Required Local Gates

Run these before tagging or merging a release candidate:

```bash
npm run lint -- --max-warnings=0
npx tsc --noEmit
npm run check:docs
npm run check:release
npm run check:pwa
npm run build
npm run check:providerless:self-test
npm run check:local-rag:golden
npm run check:local-rag:performance
npm run check:local-rag:governance
npm run check:document-extraction:self-test
npm run smoke:browser
```

For the public-land/free-patent/agrarian-reform slice, the local RAG gates should include exact-citation probes for RA 11573, RA 10023, RA 11231, RA 6657, RA 9700, and RA 11953; a broad workflow query covering public land, imperfect title, residential/agricultural free patent, CARP/CARPER, CLOA/ARB, DAR clearance, and agrarian emancipation; and governance checks that the framework `public-land-free-patent-and-agrarian-reform` references the new corpus and coverage-map records.

## Required Live Gates

After production deployment, run:

```bash
npm run check:deployment -- --base-url https://lexiph.vercel.app
npm run check:live -- --base-url https://lexiph.vercel.app
```

The deployment is not considered current unless the live commit reported by those checks matches the commit being shipped.

## Current Known Production Status

The latest local checkpoint must still be verified against Vercel production after it is pushed. A previous production check showed `https://lexiph.vercel.app` serving commit `44e6760fa33b` while local `dev` was newer. Treat production as pending until a fresh deploy and live check confirm the current commit.

## Ship Criteria

- All required local gates pass.
- Production serves the current pushed commit.
- Live readiness passes.
- Providerless mode remains usable even when external RAG services are unavailable.
- No blocking mobile layout issues remain at 320px and common phone widths.
- A PR from `dev` to `main` exists with the current validation summary.

## Hold Criteria

Do not tag or merge if any of these are true:

- Vercel production is still serving an older commit.
- Live checks report a commit mismatch.
- Browser smoke catches horizontal overflow, unusable mobile controls, or broken auth dialogs.
- A required local gate fails for reasons other than a clearly documented external-service outage.
- The PR diff contains unrelated work outside the current polish and docs scope.
