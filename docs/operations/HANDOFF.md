# Maintainer Handoff

Last updated: 2026-08-19. Written to survive a change of maintainer, so it records
operational state and non-obvious traps that are not visible from the code alone.
Feature status lives in [PRD.md](../PRD.md); change history lives in
[CHANGELOG.md](../../CHANGELOG.md). This file covers what neither of those says.

## Current state

`main` is deployed to `lexiph.vercel.app`. `dev` and `main` are in sync as of the
2026-07-30 promotion. Every quality gate passes in CI.

Production services are configured, but Supabase-backed signed-in persistence is
degraded until the corrected keep-alive passes after a project resume or relink:

- **Supabase** — `database/schema.sql`, `database/migrations/0001_compliance_report_persistence.sql`, and `database/storage.sql` are all applied. Three report tables exist with row-level security, plus four storage policies on the private `documents` bucket.
- **Clerk** — configured as a Supabase third-party auth provider on both sides. Row-level security compares `(SELECT auth.jwt()->>'sub')` to app-owned `TEXT` user columns.
- **Keepalive** — `.github/workflows/supabase-keepalive.yml` makes a daily PostgREST database-API request and fails visibly when secrets, DNS, or PostgREST are unavailable. The August 10–16 scheduled runs encountered DNS failures but were incorrectly reported as successful by the former warning-only workflow; resume or relink the project, update both secrets if its reference changed, and dispatch the corrected workflow before treating signed-in persistence as available. Without a successful run, a free-tier Supabase project can pause after inactivity and every signed-in feature breaks at once.

## Verified vs. unverified

Verified by automated gates or direct observation:

- All local quality gates, unit tests, and the browser smoke suite (CI run on the 2026-07-30 promotion).
- Supabase tables, policies, and third-party auth (checked in the dashboard).
- Keepalive workflow (dispatched manually; ping returned 200).

Not yet confirmed by a human, and worth doing early:

1. **End-to-end cloud persistence.** Sign in on production, run a compliance analysis on a text-based document, confirm rows appear in `compliance_reports` / `report_versions` / `report_findings`, then clear browser site data, reload, sign in, and confirm the report returns. This is the PRD's headline acceptance criterion for server-side persistence and has never been walked through manually.
2. **Live source URLs for the 2026-07-30 corpus batch.** The 34 authorities added that day carry `seeded` provenance: their Lawphil URLs follow the canonical pattern but were not fetched at authoring time. Run `npm run check:local-rag:sources:live` from a machine with unrestricted internet, then promote confirmed records to verified provenance. Until then the app discloses their status honestly, so this is a quality upgrade rather than a correctness bug.

## Traps that cost real debugging time

- **The Supabase SQL editor runs only the highlighted selection.** If any text is selected, Run executes just that fragment and reports success. A migration can appear to apply while creating nothing. Click into the editor and deselect before running, then verify with a `SELECT` against `information_schema.tables`.
- **`npm run check:screenshots` fails after any README edit.** The gate compares the README's modification time against the two preview PNGs and fails if the README is newer by more than ten minutes. After editing the README locally, `touch docs/assets/lexinsights-chat-desktop.png docs/assets/lexinsights-help-mobile.png`. CI is unaffected because checkout gives every file the same timestamp.
- **The README "Product Preview" section is machine-validated.** It must contain exactly two images whose paths match the expected strings verbatim, and both PNGs must keep their exact pixel dimensions. Adding a third image or reformatting those links breaks the build.
- **A duplicate `overrides` key in `package.json` is silently ignored** — the last one wins, with no warning. Also, npm will not re-resolve a dependency whose lockfile entry already satisfies the new override. Changing an override generally requires deleting `node_modules` and `package-lock.json` and reinstalling.
- **CI only runs on pushes to `main` and pull requests targeting `main`.** A pull request into `dev` gets no pipeline, so run `npm run check:local` before merging anything into `dev`.
- **Merging a pull request deletes its remote branch,** which leaves a stale local tracking reference and makes the next `--force-with-lease` push fail with a confusing "stale info" error. Clear it with `git update-ref -d refs/remotes/origin/<branch>` and push again.
- **Growing the corpus can silently degrade retrieval.** More authorities dilute term weighting, which once pushed compliance-framework members out of workflow results even though nothing about those records changed. `addFrameworkDocumentsForDeepSearch` in [local-legal-research.ts](../../src/lib/services/local-legal-research.ts) now floors framework members with a composite-evidence score to prevent this. Always run the five local-RAG gates after touching corpus data; they are what caught it.

## Adding a corpus authority

Each authority needs a record in all governance surfaces or the governance gate
fails: `corpus.ts` (the record itself), plus coverage in `coverage-map.ts`,
relations in `authority-relations.ts` where genuine relationships exist, and an
evidence anchor where useful. Source metadata and provenance are derived
automatically from the corpus record by `authority-sources.ts`.

Advertised counts must never be hardcoded. `COVERAGE_FACTS` in
[seo.ts](../../src/lib/seo.ts) is the single place a total appears, and it must
match what `coverage-summary.ts` derives; every user-facing surface reads from
there.

Content rules that exist for governance reasons, not style: never invent a
section number, penalty amount, or date. Summaries stay at the level of a
statute's purpose and framework. Obligations are review heuristics for the draft
checker, not quotations. The product's entire thesis is that it cannot fabricate
a legal authority, so a plausible-but-unverified detail is worse here than an
omission.

## Open work

Ordered by value, with the blocking question where one exists:

1. **Corpus growth toward 400+ authorities.** The largest remaining gap and the standing answer to the depth criticism in the competitive documents. Purely an authoring effort; the tooling and gates are in place.
2. **Server-side quota enforcement.** Daily limits are currently metered per browser, which a user can reset by clearing storage. Real enforcement needs a per-account counter, which in turn needs a decision about paid tiers.
3. **Full screenshot catalog recapture.** The two README previews are current; the wider archive under `public/screenshots` predates the July feature work. Some surfaces require a signed-in session to capture.
4. **Student verification for the education tier.** Blocked on the same tier decision as quota enforcement.
5. **Optical character recognition for scanned PDFs.** Currently out of scope by design; image-only PDFs get an explicit, friendly refusal rather than a silent failure.
