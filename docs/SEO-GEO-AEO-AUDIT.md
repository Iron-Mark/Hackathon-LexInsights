# LexInsights SEO / GEO / AEO Audit

| Field | Value |
|---|---|
| Subject | LexInsights (`lexiph.vercel.app`), version 0.5.2 |
| Date audited | 2026-07-08 |
| Scope | Repo source + live site, end-to-end: technical SEO, on-page, GEO (generative engines), AEO (answer engines), keyword + competitor research |
| Overall | Needs work (strong technical base, thin indexable content) |
| Companion | [SEO-AEO-GEO reference](./reference/SEO-AEO-GEO.md). The PRD and Competitive Brief ship in a separate branch/PR. |
| Tooling note | No Ahrefs/Semrush/Similarweb connected; keyword data is web-researched, not tool-sourced. Re-verify volatile figures. |

## Executive summary

For a hackathon-stage app the technical plumbing is ahead of its competitors: programmatic `robots.ts` and `sitemap.ts`, self-referential canonicals, six structured-data types (Organization, WebSite, SoftwareApplication, Person, SoftwareSourceCode, BreadcrumbList), full Open Graph/Twitter, a PWA manifest, and both `/llms.txt` and `/ai.txt` from one source of truth in `src/lib/seo.ts`. The problem isn't infrastructure. The site is a shell with almost no indexable body content: a chat app whose 271-authority corpus, 45 frameworks, and compliance checklists live behind a JS-gated UI that crawlers and AI engines can't read. The three highest-impact moves are (1) fix the `/` vs `/chat` duplicate content and dual empty-H1, (2) surface quotable facts (271 authorities, named statutes) on a crawlable page, and (3) publish answer-first content (FAQ schema, `/learn` statute explainers, checklist/template pages) to win the compliance-ops SERPs that jurisprudence-focused rivals ignore.

## Scorecard

| Area | Grade | Note |
|---|---|---|
| Technical | A- | HTTPS/HSTS, viewport, robots, sitemap, PWA, llms/ai.txt pass. Only defect: intentional `/` vs `/chat` duplication. |
| GEO | B | Valid `llms.txt` + `ai.txt`, all AI bots allowed, clear entity typing. Gaps: no quantified facts, no statute citations, `ai.txt` is a byte-identical clone of `llms.txt`. |
| SEO | B- | Excellent base undercut by duplicate content, dual H1s, empty `", there"` hero H1, and 4 of 5 titles under 50 chars. |
| AEO | C+ | No FAQPage/HowTo/QAPage/Article schema; strong PAA opportunities uncaptured. |
| Content | C | App shell with no article content; forfeits statute-name, checklist, and template SERPs its own corpus could own. |

## On-page issues

| Page | Issue | Severity | Fix |
|---|---|---|---|
| `/` and `/chat` | Both render identical `ChatPageShell`; both indexable and in the sitemap | Critical | Canonicalize `/chat` to `/`, drop `/chat` from sitemap |
| `/`, `/chat` | Two `<h1>`: brand (`sidebar-header.tsx:91`) + greeting that SSR-renders empty as `", there"` (`empty-state.tsx:138`) | Critical | One static keyword-bearing H1; demote the others |
| `/about` | Title 17 chars; `title.absolute` drops the brand template | High | Expand to 50-60 chars with the keyword phrase |
| `/chat` | Meta description 109 chars, weak CTA | Medium | Extend toward 150-160 with a CTA |
| `/`, `/terms` | Descriptions 145 / 132 chars, no CTA | Medium | Pad to 150-160, add CTA |
| Homepage | Terms/Privacy not linked from indexable HTML | Medium | Add footer nav from the crawlable surface |

## Technical checklist

| Check | Status | Detail |
|---|---|---|
| HTTPS / HSTS | Pass | HTTP upgraded, `X-Content-Type-Options: nosniff`, 200 on home |
| robots.txt | Pass | Allows public routes; blocks `/api/`, auth, `/chat/*`, `/documents`, diagnostics; sitemap line correct |
| sitemap.xml | Pass | 5 URLs, valid lastmod, private routes excluded |
| Canonical tags | Pass | Self-referential via `metadataBase` |
| OG / Twitter | Pass | Full coverage, `en_PH`, OG image 1200x630 returns 200 |
| PWA manifest | Pass | Icons, maskable, screenshots, shortcuts |
| llms.txt / ai.txt | Pass (served) | Both 200 text/plain, robots-allowed |
| Duplicate content `/` vs `/chat` | Fail | Identical component, both indexable |
| H1 structure | Fail | Two H1s; hero H1 empty on SSR |
| Title length | Warn | Only home (51) in range; others 17-35 |
| WebSite SearchAction | Warn | Targets `/chat?q=` (auth-gated, no results page); searchbox can't function |

## GEO findings (generative engines)

`/llms.txt` follows the llmstxt.org convention and all AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) are allowed via `*`. Three gaps:
- No quantified, quotable facts. The most citable asset (271 authorities, 45 frameworks, 13 source families, 181 relations, deterministic no-model local mode) appears nowhere in `llms.txt`.
- No statute citations. No named RA numbers with official-source links, so no citation-traceable claim to attribute.
- `ai.txt` is a byte-identical clone of `llms.txt`; it should be a distinct AI-usage/attribution statement.

## AEO findings (answer engines / featured snippets)

No `FAQPage`, `HowTo`, `QAPage`, or `Article` schema exists, and no page opens with a direct, snippet-ready answer. The structured data present describes the product, not answers. High-value People-Also-Ask targets, each mapping to a statute already in the corpus:
- "What is the Data Privacy Act of 2012?" (RA 10173) -> `/learn/ra-10173`
- "How do I file a data breach notification with the NPC?" -> `/how-to/npc-breach-notification`
- "What are the penalties under the Data Privacy Act?" -> statute page
- "What is RA 10175 / the Cybercrime Prevention Act?" -> `/learn/ra-10175`
- "Is LexInsights legal advice? Is it free?" -> branded FAQ on `/about`

## Keyword opportunities (web-researched)

| Keyword | Difficulty | Opportunity | Intent | Content type |
|---|---|---|---|---|
| RA 10173 compliance checklist | Moderate | High | Info/commercial | Checklist article + interactive tool |
| compliance checklist generator Philippines | Easy | High | Transactional | Tool landing page (shipped feature) |
| privacy notice template Philippines | Moderate | High | Transactional | Template + in-app generator |
| data sharing agreement template Philippines | Moderate | High | Transactional | Template + NPC explainer |
| NPC registration requirements | Easy | High | Info | How-to (thresholds) |
| Data Privacy Act penalties Philippines | Moderate | High | Info | Explainer (fines up to PHP 5M) |
| Internet Transactions Act RA 11967 summary | Easy | High | Info | Statute explainer |
| how to write a privacy manual Philippines | Easy | High | Info | How-to + generator CTA |
| annual security incident report NPC ASIR | Easy | Medium | Info | Deadline/filing guide |
| AI legal disclaimer Philippines | Easy | Medium | Info | Explainer (SC framework, NPC 2024-04) |
| AML compliance checklist Philippines | Moderate | High | Commercial | KYC/STR checklist |
| cybercrime prevention act explained | Moderate | Medium | Info | RA 10175 explainer |
| employee termination due process (twin notice) | Moderate | Medium | Info | Guide (crowded SERP) |
| kasambahay law benefits | Moderate | Medium | Info | Employer checklist |
| free Philippine legal research AI | Hard | Medium | Commercial | Comparison / "free alternative" page |
| LexInsights | Easy | High | Navigational | Brand SERP protection (already solid) |

## Content gaps vs competitors

| Gap | Why it matters | Format | Priority / Effort |
|---|---|---|---|
| Indexable statute explainer hub | 150+ authorities in the corpus, none crawlable; Intellegal ships a "Law Explorer" | One page per statute from corpus | High / Medium |
| Compliance templates (privacy manual, DSA, breach form, DPO memo) | No AI rival generates documents; turns "template" searches into activation | Template pages + generator | High / Medium |
| Interactive checklists as landing pages | Computed internally, trapped behind chat | Tool page per framework | High / Low |
| Q&A / "Dear Attorney" library | Respicio owns thousands of long-tail how-to queries | 800-1,500-word Q&A articles | High / High |
| "Free alternative" comparison pages | Users compare Anycase (PHP 999/mo), Jur (PHP 199+), CD Asia | Comparison tables | Medium / Low |
| PH legal glossary | Easy-to-rank definition queries, topical authority | Glossary hub | Medium / Medium |

## Competitor SERP landscape

| Competitor | Owns | How LexInsights competes |
|---|---|---|
| Intellegal | Case-law analytics, "verifiable AI", heavy Jun 2026 PR | Own compliance scoring + templates, not jurisprudence depth |
| Anycase | 5,000+ users, semantic jurisprudence search, freemium | Free tier + document compliance rivals don't offer |
| Jur.ph | Budget case analytics (from PHP 199/mo) | Compete on free + compliance, not price on case search |
| CD Asia / Lawphil | Statute + case full text (Lawphil dominates "RA [number]") | Own summary + compliance-action pages, not full text |
| Respicio & Co. | Long-tail how-to / "Dear Attorney" SERPs | Match with practical checklists; the real organic rival for planned content |
| Digest PH | ~100k case digests, bar-review audience | Off-strategy to match; skip |

## Prioritized action plan

Quick wins (each under ~2 hours):
1. Canonicalize `/chat` to `/` and drop it from the sitemap.
2. One static keyword H1; demote the brand and empty greeting.
3. Add a `## Corpus and Coverage` block to `llms.txt` (271 / 45 / 13 / 181, no-model).
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
| `llms.txt` had no quantified facts | Added `## Corpus and Coverage` (271 / 13 / 45 / 181, deterministic no-model note) | `llms.txt/route.ts`, `seo.ts` |
| No statute citations for engines | `KEY_STATUTES` (RA 10173/10175/9160/9775/9003 with real official URLs) added to `llms.txt` and `/about` | `seo.ts`, `llms.txt/route.ts`, `about/page.tsx` |
| `ai.txt` was a byte-identical clone of `llms.txt` | Rewritten as a distinct AI-usage/attribution statement (`buildAiText()`) | `ai.txt/route.ts` |
| `/about` title 17 chars, brand dropped | Title now "About LexInsights - Philippine Legal Compliance Assistant" (57 chars); description padded to 157 chars with a CTA | `about/page.tsx` |

Deferred (opportunities, not defects; need legal-reviewed content): the `/learn/*` statute explainer hub, downloadable compliance templates, per-framework interactive checklist pages, the `/how-to/npc-breach-notification` HowTo page, and a fully visible homepage hero. These are the strategic investments above; the fixes shipped the AEO/GEO foundation they build on.
