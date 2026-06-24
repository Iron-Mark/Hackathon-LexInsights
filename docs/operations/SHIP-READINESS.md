# Ship Readiness Checkpoint

Date: June 22, 2026
Branch: `dev`

This checkpoint is the handoff record for pausing active development after the current LexInSight polish pass. It should be updated only when a new release candidate changes the ship/no-ship status.

## Scope Locked In

- Guest-first chat experience with sign-in and sign-up available without gating exploration.
- Clerk authentication opened in modal-style entry points instead of redirecting away from the app surface.
- Providerless local legal research for demo-ready Philippine law coverage, including privacy, cybercrime, child online safety, AML, solid waste, procurement, government service delivery, competition, financial consumer protection, hazardous substances, SIM registration, customs, tax administration, identity, protected-area scope, labor, health, social welfare, IP, securities, FDA-regulated products, and cultural heritage.
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
npm run check:document-extraction:self-test
npm run smoke:browser
```

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
