# Ship Readiness Checkpoint

Last verified: 2026-07-30
Branch: `main` and `dev`

This checkpoint records the current ship/no-ship criteria for LexInsights. Update it when a release candidate changes that status. The last tagged release record is [RELEASE-2026-07-01-569983a](RELEASE-2026-07-01-569983a.md); `main` has since merged the July 2026 cycle (P0-1 Supabase server persistence, exact framework detection, the vitest unit layer, and CSP/profile-dialog/e2e fixes).

## Current Scope

- Guest-first chat experience with Clerk sign-in and sign-up in modal-style entry points; exploration is never gated.
- Providerless local legal research as the public default. The corpus is the source of truth for coverage — see [Providerless Research](../reference/PROVIDERLESS-RESEARCH.md) and the live coverage stats on `/about`; this document does not maintain a prose topic inventory.
- Compliance reports with dual-write persistence (P0-1, shipped 2026-07-28): IndexedDB is the local source of truth, signed-in users mirror to Supabase, and a report survives clearing browser storage via server rehydration.
- Chat UX, report rendering, dark mode, and mobile polish per the design source of truth in [UI](../reference/UI.md); check new visual work against that document.

## Required Local Gates

Run the full local gate before tagging or merging a release candidate:

```bash
npm run check:local
```

See [Testing](TESTING.md) for what it chains: lint, typecheck, vitest unit tests, `npm audit --omit=dev`, the docs/readiness/deployment/RAG/document/compliance-persistence/release self-tests, PWA and screenshot checks, build, bundle check, and browser smoke. CI ([ci.yml](../../.github/workflows/ci.yml)) runs the gate battery on every push to `main` and every pull request targeting `main`.

New corpus slices must add exact-citation, workflow, performance, and governance probes to the existing RAG gates (see [RAG QA](RAG-QA.md)); the per-slice expectations live in the executable fixtures (`tests/fixtures/rag-golden/answer-quality-cases.json`) and check scripts, not in this document.

## Required Live Gates

After production deployment, run:

```bash
npm run check:deployment -- --base-url https://lexiph.vercel.app
npm run check:live -- --base-url https://lexiph.vercel.app
```

The deployment is not considered current unless the live commit reported by those checks matches the commit being shipped. Details in [Deployment](DEPLOYMENT.md).

## Ship Criteria

- All required local gates pass and CI is green on `main`.
- Production serves the current pushed commit and live readiness passes.
- The target Supabase project has [database/migrations/0001_compliance_report_persistence.sql](../../database/migrations/0001_compliance_report_persistence.sql) applied and Clerk configured as a Supabase third-party auth provider — a deploy target without both silently degrades P0-1 server-side report writes to local-only.
- Providerless mode remains usable even when external RAG services are unavailable.
- No blocking mobile layout issues remain at 320px and common phone widths.
- `main` and `dev` are aligned, or an explicit PR from `dev` to `main` exists with the current validation summary.

## Hold Criteria

Do not tag or merge if any of these are true:

- Vercel production is still serving an older commit, or live checks report a commit mismatch.
- Browser smoke catches horizontal overflow, unusable mobile controls, or broken auth dialogs.
- A required local gate fails for reasons other than a clearly documented external-service outage.
- The PR diff contains unrelated work outside the release's stated scope.
