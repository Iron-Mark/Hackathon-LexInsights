# LexInsights SEO / GEO / AEO Audit

| Field | Value |
|---|---|
| Subject | LexInsights (`lexiph.vercel.app`), version 0.5.2 |
| Date audited | 2026-07-08 |
| Status | All defects remediated 2026-07-08/09, merged in PR #18; deferred opportunities re-checked 2026-07-30 and still open |
| Scope | Repo source + live site, end-to-end: technical SEO, on-page, GEO (generative engines), AEO (answer engines), keyword + competitor research |
| Overall | Defects fixed; thin indexable content remains the open strategic gap |
| Companion | [SEO-AEO-GEO reference](./reference/SEO-AEO-GEO.md), [PRD](./PRD.md), [Competitive Brief](./COMPETITIVE-BRIEF.md) |
| Tooling note | No Ahrefs/Semrush/Similarweb connected; keyword data is web-researched, not tool-sourced. Re-verify volatile figures. |

> **Status note (2026-07-30).** This is a dated audit. Every defect it found was fixed on 2026-07-08/09 (see [Remediation status](#remediation-status)); what remains open is the answer-first content strategy below.

## Executive summary

For a hackathon-stage app the technical plumbing is ahead of its competitors: programmatic `robots.ts` and `sitemap.ts`, self-referential canonicals, structured data (Organization, WebSite, SoftwareApplication, Person, SoftwareSourceCode, BreadcrumbList, plus FAQPage since remediation), full Open Graph/Twitter, a PWA manifest, and both `/llms.txt` and `/ai.txt` from one source of truth in `src/lib/seo.ts`. The problem was never infrastructure. Two of the three highest-impact moves shipped in the remediation — the `/` vs `/chat` duplicate content and dual empty-H1 are fixed, and quotable facts (corpus numbers, named statutes, FAQ schema) now sit on crawlable surfaces. The third remains open: the site is still a chat shell whose 305-authority corpus, 45 frameworks, and compliance checklists live behind a JS-gated UI, so the play is answer-first content (`/learn` statute explainers, checklist/template pages) to win the compliance-ops SERPs that jurisprudence-focused rivals ignore.

## Technical checklist

The duplicate-content, H1, title-length, and SearchAction defects found on 2026-07-08 are all fixed; see [Remediation status](#remediation-status). What holds:

| Check | Status | Detail |
|---|---|---|
| HTTPS / HSTS | Pass | HTTP upgraded, `X-Content-Type-Options: nosniff`, 200 on home |
| robots.txt | Pass | Allows public routes; blocks `/api/`, auth, `/chat/*`, `/documents`, diagnostics; sitemap line correct |
| sitemap.xml | Pass | 4 URLs (`/`, `/about`, `/terms`, `/privacy`), valid lastmod, private and duplicate routes excluded |
| Canonical tags | Pass | Self-referential via `metadataBase`; `/chat` canonicalizes to `/` |
| OG / Twitter | Pass | Full coverage, `en_PH`, OG image 1200x630 returns 200 |
| PWA manifest | Pass | Icons, maskable, screenshots, shortcuts |
| llms.txt / ai.txt | Pass | Both 200 text/plain, robots-allowed, distinct content |

## GEO findings (generative engines)

`/llms.txt` follows the llmstxt.org convention and all AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) are allowed via `*`. The three gaps found on 2026-07-08 — no quantified facts, no statute citations, `ai.txt` a byte-identical clone of `llms.txt` — are all fixed: `llms.txt` now carries a `## Corpus and Coverage` block (305 authorities, 45 frameworks, 13 source families, 188 curated relations as of 2026-07-30, deterministic no-model note) plus named statutes with official-source links, and `ai.txt` is a distinct AI-usage/attribution statement.

## AEO findings (answer engines / featured snippets)

The 2026-07-08 gap — no `FAQPage`, `HowTo`, `QAPage`, or `Article` schema and no snippet-ready answers — is partly closed: `buildFaqStructuredData()` and a visible FAQ block now ship on `/about`. Still uncaptured are the high-value People-Also-Ask targets, each mapping to a statute already in the corpus:
- "What is the Data Privacy Act of 2012?" (RA 10173) -> `/learn/ra-10173`
- "How do I file a data breach notification with the NPC?" -> `/how-to/npc-breach-notification`
- "What are the penalties under the Data Privacy Act?" -> statute page
- "What is RA 10175 / the Cybercrime Prevention Act?" -> `/learn/ra-10175`

## Keyword opportunities (web-researched)

Pruned 2026-07-30 to the targets tied to shipped features; the original 2026-07-08 list carried a dozen more unverified, non-tool-sourced guesses. Re-research volumes before investing.

| Keyword | Difficulty | Opportunity | Intent | Content type |
|---|---|---|---|---|
| RA 10173 compliance checklist | Moderate | High | Info/commercial | Checklist article + interactive tool |
| compliance checklist generator Philippines | Easy | High | Transactional | Tool landing page (shipped feature) |
| Data Privacy Act penalties Philippines | Moderate | High | Info | Explainer (fines up to PHP 5M) |
| free Philippine legal research AI | Hard | Medium | Commercial | Comparison / "free alternative" page |
| LexInsights | Easy | High | Navigational | Brand SERP protection (already solid) |

## Content gaps vs competitors

| Gap | Why it matters | Format | Priority / Effort |
|---|---|---|---|
| Indexable statute explainer hub | 150+ authorities in the corpus, none crawlable; Intellegal ships a "Law Explorer" | One page per statute from corpus | High / Medium |
| Compliance templates (privacy manual, DSA, breach form, DPO memo) | No AI rival generates documents; turns "template" searches into activation | Template pages + generator | High / Medium |
| Interactive checklists as landing pages | Computed internally, trapped behind chat | Tool page per framework | High / Low |
| Q&A / "Dear Attorney" library | Respicio owns thousands of long-tail how-to queries | 800-1,500-word Q&A articles | High / High |
| "Free alternative" comparison pages | Users compare Anycase (PHP 999/mo), Jur (from PHP 167/mo annual), CD Asia | Comparison tables | Medium / Low |
| PH legal glossary | Easy-to-rank definition queries, topical authority | Glossary hub | Medium / Medium |

## Competitor SERP landscape

| Competitor | Owns | How LexInsights competes |
|---|---|---|
| Intellegal | Case-law analytics, "verifiable AI", heavy Jun 2026 PR | Own compliance scoring + templates, not jurisprudence depth |
| Anycase | 5,000+ users, semantic jurisprudence search, freemium | Free tier + document compliance rivals don't offer |
| Jur.ph | Budget case analytics (from PHP 167/mo annual) | Compete on free + compliance, not price on case search |
| CD Asia / Lawphil | Statute + case full text (Lawphil dominates "RA [number]") | Own summary + compliance-action pages, not full text |
| Respicio & Co. | Long-tail how-to / "Dear Attorney" SERPs | Match with practical checklists; the real organic rival for planned content |
| Digest PH | ~100k case digests, bar-review audience | Off-strategy to match; skip |

## Prioritized action plan

Quick wins (each under ~2 hours):
1. Canonicalize `/chat` to `/` and drop it from the sitemap.
2. One static keyword H1; demote the brand and empty greeting.
3. Add a `## Corpus and Coverage` block to `llms.txt` (271 / 45 / 13 / 180, no-model).
4. Name RA 10173 / 10175 / 9160 / 9775 / 9003 with source links in `llms.txt` and `/about`.
5. Expand short titles/descriptions and add CTAs.
6. Fix or remove the broken `/chat?q=` SearchAction.
7. Differentiate `ai.txt` from `llms.txt`.

Strategic investments (this quarter):
1. `buildFaqStructuredData()` + a visible FAQ block on `/about`.
2. `/learn/*` statute explainer hub generated from the corpus, answer-first + Article schema.
3. Expose compliance checklists + document generator as indexable landing pages.
4. Server-render the Help & Resources substance (corpus size, framework list, verification dates, score explanation); also delivers PRD P1-2.
5. Thicken the homepage with a static answer-first hero.
6. `/how-to/npc-breach-notification` with `HowTo` schema.

## Remediation status

All findings below were fixed on 2026-07-08 and verified with `tsc --noEmit`, `eslint`, and a full `npm run build` (all pass). Content was spot-checked (real statute URLs, FAQ JSON-LD injected, sitemap updated).

| Finding | Fix applied | Files |
|---|---|---|
| `/` vs `/chat` duplicate content | `/chat` canonical now points to `/`; `/chat` removed from sitemap | `chat/page.tsx`, `sitemap.ts` |
| Dual H1 + empty `", there"` hero H1 | Brand demoted to `<span>`; greeting demoted to `<p>`; one static keyword H1 "Philippine Legal Research & Compliance Assistant" added (sr-only, SSR-present) | `sidebar-header.tsx`, `empty-state.tsx` |
| Invalid WebSite SearchAction | `potentialAction`/SearchAction block removed from `buildBaseStructuredData()` | `seo.ts` |
| No FAQPage schema (AEO) | `buildFaqStructuredData()` + `FAQ_ITEMS` added; visible FAQ block + JSON-LD rendered on `/about` | `seo.ts`, `about/page.tsx` |
| `llms.txt` had no quantified facts | Added `## Corpus and Coverage` (271 / 13 / 45 / 180, deterministic no-model note) | `llms.txt/route.ts`, `seo.ts` |
| No statute citations for engines | `KEY_STATUTES` (RA 10173/10175/9160/9775/9003 with real official URLs) added to `llms.txt` and `/about` | `seo.ts`, `llms.txt/route.ts`, `about/page.tsx` |
| `ai.txt` was a byte-identical clone of `llms.txt` | Rewritten as a distinct AI-usage/attribution statement (`buildAiText()`) | `ai.txt/route.ts` |
| `/about` title 17 chars, brand dropped | Title now "About LexInsights - Philippine Legal Compliance Assistant" (57 chars); description padded to 157 chars with a CTA | `about/page.tsx` |

Deferred (opportunities, not defects; need legal-reviewed content): the `/learn/*` statute explainer hub, downloadable compliance templates, per-framework interactive checklist pages, the `/how-to/npc-breach-notification` HowTo page, and a fully visible homepage hero. These are the strategic investments above; the fixes shipped the AEO/GEO foundation they build on.
