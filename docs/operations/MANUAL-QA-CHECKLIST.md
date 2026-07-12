# Manual QA Checklist

Covers the UI surfaces added in the 2026-07-08 build cycle (PRD P0-1 through P2-3 plus the P1-3 matter follow-ups). These are build-verified (`tsc`, `eslint`, `npm run build`) and their guest-reachable parts were browser-checked, but the surfaces behind an authenticated upload flow were not eyeballed. This checklist clears that gap in one pass.

## Setup

- Run locally: `npm run dev`, open `http://localhost:3000`. Or test production after a `dev` -> `main` release at `https://lexiph.vercel.app`.
- Sign in (Clerk) so the profile and persistence paths are active.
- Have a sample document ready: [docs/samples/sample-barangay-disaster-plan.md](../samples/sample-barangay-disaster-plan.md).
- Check each item at desktop width and again at a 375px phone width; watch for horizontal page scroll (there should be none).

## 1. Guest-reachable (quick, no login)

- [ ] Home `/`: exactly one visible-or-`sr-only` `<h1>` ("Philippine Legal Research & Compliance Assistant"); no horizontal scroll.
- [ ] `/about`: FAQ section renders; a "Coverage" block shows 271 authorities / 13 source families / 45 frameworks; key statute links (RA 10173, RA 10175, RA 9160, RA 9775, RA 9003) open official sources.
- [ ] Help & Resources dialog -> "Corpus coverage": four stat tiles plus a per-source-family table with authority counts and last-verified dates (e.g. Lawphil 230, Jun 27 2026). Table scrolls inside its own box on mobile; the page does not.
- [ ] `/llms.txt`: includes a "Corpus and Coverage" section and a "Key Philippine laws covered" list. `/ai.txt` is a distinct AI-usage statement (not a copy of `/llms.txt`).

## 2. Plan and limits (P2-1)

- [ ] Open the profile dialog. A plan/limits section shows the "Free" tier, the per-minute request limits (research 30, document extraction 12, etc.), and a note on what Education/Pro would add. No overflow at 375px.

## 3. Compliance report flow (P1-1, P0-2, P0-3, P2-2, P2-3)

Switch to Compliance mode and upload the sample document.

- [ ] **Progress (P2-3):** during extraction and analysis, named step-level stages appear (not a static spinner), with a ticking elapsed time; a long run shows a "taking longer than usual" hint rather than hanging silently.
- [ ] **Report renders** with color-coded findings and a compliance score.
- [ ] **Framework checklist (P2-2):** a collapsible "Framework checklist" panel appears for a report that maps to a bundled framework (the disaster-plan sample should map to an LGU/DRRM stack); it lists the framework's sequence/checkpoint items. For an unrelated/thin report, no panel appears (correct).
- [ ] **No-authority notice (P0-2):** ask a general-mode question with no Philippine-law basis (e.g. a made-up statute); the answer shows an explicit "no supporting authority in the local corpus" notice instead of an unlinked citation.
- [ ] **PDF export (P1-1):** the download menu offers Markdown, PDF, and Word. Export PDF; it opens with the report's headings, color-coded findings, and checklist.
- [ ] **Disclosure (P0-3):** the exported PDF (and DOCX/MD) ends with an "AI-Use Disclosure" block naming the tool, version, reason, human oversight, research mode, and cited authorities (A.M. No. 25-11-28-SC).

## 4. Matter workspace (P1-3)

From a compliance report, use "Save to matter".

- [ ] Create a matter (name + comma-separated tags); it appears in the list.
- [ ] "Save current report to this matter" saves it; the report shows in the matter's Saved reports with its compliance-score pill.
- [ ] **Documents section** lists the analyzed document name after saving.
- [ ] **Rename:** the pencil edits the matter name inline; save persists it.
- [ ] **Tags:** each tag has an "x" to remove; the add-tag input adds a new tag (deduped).
- [ ] Delete a saved report (per-row x) and delete a matter; both work.
- [ ] Dialog has no horizontal overflow at 375px; the two-pane layout stacks to one column.

## 5. Persistence (P0-1, client-side / IndexedDB)

- [ ] After saving a report and creating a matter, reload the page. The compliance report version history and the matter (with its reports, tags, and documents) are still there.
- [ ] In DevTools -> Application -> IndexedDB, a `lexinsights` database holds the `compliance-storage` and `matter-storage` keys.

## Notes

- Server-side compliance persistence (Supabase) is intentionally not wired; reports persist client-side per device. See PRD P0-1.
- Tier enforcement and student verification are not implemented (transparency surface only). See PRD P2-1.
