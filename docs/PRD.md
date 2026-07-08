# LexInsights Product Requirements Document

| Field | Value |
|---|---|
| Product | LexInsights (`lexiph.vercel.app`) |
| App version at time of writing | 0.5.2 |
| Document status | Draft for review |
| Date | 2026-07-08 |
| Owner | Mark Siazon (maintainer) |
| Contributors | Jam Emmanuel Villarosa, Ken Patrick Garcia, Ashlyn Jam Torres |
| Source of truth for shipping behavior | [docs/README.md](./README.md) and the reference docs it links |
| Competitive research freshness | Researched 2026-07-08; verify volatile figures (valuations, launch dates, pricing) before quoting externally |

This is the first product-level requirements document in the repository. The `docs/` tree holds reference, operations, and per-feature specs, but nothing states what LexInsights is for, who it is for, & what gets built next. This document fills that gap. It is written to be checked: nearly every claim carries a number, a file path, a statute, or a dated source.

---

## 1. Summary

LexInsights answers Philippine legal questions and scores uploaded documents for compliance from a bundled corpus of 271 legal authorities that runs with no AI provider attached. The default research mode is deterministic; it calls no model. [PROVIDERLESS-RESEARCH.md:92](./reference/PROVIDERLESS-RESEARCH.md) states it plainly: "Local mode does not call an AI model." That single design choice is the product's reason to exist, and this document is built around protecting it.

The positioning, in one sentence: **for price-sensitive Philippine solo practitioners, small firms, SME compliance officers, & law students, LexInsights is the providerless legal-research-and-compliance assistant that pairs citation-grounded answers with document-level compliance scoring against 45 Philippine frameworks in one guest-first chat, because it runs off a bundled 271-authority local corpus instead of a metered enterprise seat or a general chatbot that invents case names.**

The product is live at version 0.5.2, built on Next.js 16.2.9 and React 19.2.7, with Clerk for auth & Supabase Postgres for storage. Active development paused after a polish pass on 2026-07-01. This PRD is the plan for the next build cycle.

---

## 2. The problem, stated in numbers

A Philippine lawyer researching a statute at 11pm reaches for ChatGPT, and ChatGPT is confidently wrong at a rate that ends careers. Dahl et al., in "Large Legal Fictions" (Journal of Legal Analysis, 2024), measured GPT-4 hallucinating on roughly 58% of verifiable legal questions; the worst tested model, Llama 2, missed 88%. These are not edge cases. They are the base rate for the tool most people actually use.

The purpose-built tools are not clean either. A 2025 Stanford study (Magesh et al.) put Lexis+ AI's hallucination rate above 17% and Westlaw's AI-Assisted Research above 34%, and those are the products that cost USD 10,000 to USD 20,000 per year. The Charlotin database logged roughly 1,450 court cases worldwide flagging AI-fabricated citations as of July 2026. The canonical one still costs the least to remember: *Mata v. Avianca*, a USD 5,000 sanction on 22 June 2023 for six ChatGPT-invented cases in a federal filing.

The Philippine Supreme Court has now made the stakes procedural, not just reputational. Its AI Governance Framework, A.M. No. 25-11-28-SC, resolved 18 February 2026, requires plain-language disclosure of AI use in court-bound work and puts personal responsibility on the filer. Any tool a Philippine lawyer uses for court work now sits inside a disclosure regime. No competitor has built for that regime yet.

Price locks most of the market out of the safe options. Westlaw runs USD 150 to USD 400 per user per month; Harvey, valued at roughly USD 11 billion in March 2026, sells enterprise seats to the AmLaw 100 and does not target a solo practitioner in Quezon City. The choice a Filipino solo or SME faces today is a USD 20/month general chatbot that fabricates citations, or an annual enterprise contract priced for a firm with 200 lawyers. LexInsights exists to be the third option: grounded, cheap enough to be free at entry, & built for Philippine law specifically.

---

## 3. Who this is for

Four personas drive every requirement in Section 8. Each has a need the current build partly serves and a gap a competitor could exploit first.

**The price-sensitive practitioner.** A solo or small-firm Philippine lawyer who will not pay USD 150 to USD 400 a month for Westlaw and will not risk a fabricated citation in a pleading. They need fast, source-linked research & a quick document read, plus an AI-use disclosure they can attach to court-bound work under A.M. No. 25-11-28-SC. Today they get the research; they get no disclosure artifact.

**The SME compliance officer or owner.** Runs a 20-to-200-person company, uploads a policy or contract, and wants a plain verdict against the frameworks that carry real fines: RA 10173 (the Data Privacy Act, with National Privacy Commission administrative fines up to PHP 5,000,000 per act and criminal fines from PHP 500,000 to PHP 4,000,000), RA 9160 anti-money-laundering, RA 10175 cybercrime. No Philippine-native legal-AI competitor targets this persona. It is the widest open lane in the market.

**The law student and bar candidate.** 3,962 people passed the 2024 Philippine Bar out of roughly 10,500 examinees, a 37.84% rate. They study on no budget and pick their first paid tool right after they pass. A free, no-signup research surface with real citations captures them before Anycase (PHP 599/month for its education tier) or Jur.ph does.

**The paralegal and legal researcher.** Does first-pass research and drafts reports for a supervising lawyer. Needs source traceability, a report they can export, and version history to iterate. Today they get DOCX and Markdown export and a version history that lives only in their browser.

---

## 4. What ships today (version 0.5.2)

An honest inventory matters more than a flattering one, because the requirements in Section 8 are corrections to this list, not additions to a wishlist.

The app serves 14 pages and 5 API routes under `/api` (`analytics`, `document-text`, `rag-proxy`, `version`, `readiness`), plus `ai.txt` and `llms.txt` discovery endpoints, across roughly 61 React components. Two chat modes exist: General for research, Compliance for document review, each with 4 suggested prompt cards ([empty-state.tsx](../src/components/chat/empty-state.tsx)).

Research runs against the bundled corpus: 271 authorities across 13 source categories, wired to 45 compliance-framework packs and 181 curated authority relations that connect a statute to its amendments and guidance. Sources skew to primary law; 230 of the 271 corpus records cite Lawphil, the rest cite the National Privacy Commission, the Bureau of Internal Revenue, the SEC, Bangko Sentral, the DOLE, the AMLC, & eight other official bodies. Every source carries a verification date, defaulting to 2026-06-25. Standard local research returns up to 6 matches; Deep Search returns up to 10 and can add up to 12 cross-references.

Compliance mode accepts up to 3 files per session, each capped at 5MB, in PDF, Word (`.doc`/`.docx`), Markdown, or plain text. Scanned image-only PDFs fail, because no OCR is bundled. Output is a report with a compliance score from 0 to 100 ([schema.sql:259](../database/schema.sql)), findings color-coded green, amber, or red, & a practical checklist. Reports export to Markdown and DOCX. There is no PDF export.

The gap that matters most is in the data layer. The schema defines 6 tables: `profiles`, `chats`, `messages`, `documents`, `compliance_reports`, and `search_history`. The app writes to `chats`, `messages`, and `documents`. It never writes to `compliance_reports` or `search_history`; a repository-wide search for `from('compliance_reports')` returns zero call sites. Compliance reports and their entire version history persist to browser `localStorage` under the key `compliance-storage` ([compliance-store.ts:102](../src/lib/store/compliance-store.ts)). The flagship feature's output is not in the database, even though a table with row-level security, four indexes, & a 0-to-100 CHECK constraint was built to hold it. Clear the browser, lose the report.

Quality gates are the opposite story; they are unusually strong for a hackathon-stage app. Twenty-five `check:*` scripts gate releases, including five local-RAG gates that test retrieval quality, answer quality, source freshness, sub-second performance, & corpus governance. Governance (`check:local-rag:governance`) fails the build on an orphan record, a missing source, a future verification date, or an unmarked coverage gap. Testing above that layer is thin: an end-to-end Playwright smoke suite, Chromium only, and no unit-test framework.

---

## 5. Competitive landscape

The market splits into three tiers, and LexInsights competes in a different way against each.

| Tier | Named players | Pricing signal | Target buyer | Where LexInsights stands |
|---|---|---|---|---|
| Philippine-native legal AI | Intellegal (launched Jun 2026, Technese Legaltech Inc., Makati), Anycase (claims 5,000+ users, 90,000+ resources), Jur.ph, AregLaw | Anycase PHP 999/mo Pro, PHP 599/mo Edu, 15 free credits; Jur.ph PHP 399 (1-mo) to PHP 167/mo (annual) | PH lawyers, students | Direct rivals. They own research; none own document compliance scoring |
| Legacy PH legal databases | CD Asia / CD Technologies (est. 1994; Supreme Court decisions in full text from 1901) | Enterprise subscription | Firms, courts | Depth benchmark. 271 authorities is small against a 1901-onward corpus |
| Global legal AI | Harvey (~USD 11B valuation Mar 2026, ~USD 300M ARR, 142,000+ lawyers, 1,500+ customers), Thomson Reuters CoCounsel (Casetext acquired for USD 650M, 2023), Lexis+ AI, Westlaw | USD 150-400/user/mo; USD 10,000-20,000+/yr stacks; Harvey enterprise-only | BigLaw, large in-house | Priced out of the PH SME/solo market. Not Philippine-native |
| Horizontal AI | ChatGPT, Claude, Gemini, Perplexity | Free to USD 20/mo; Perplexity Max USD 200/mo | Everyone | The real incumbent. Ubiquitous, Taglish-fluent, and the source of the hallucination problem |

The honest reading of this table has two edges. LexInsights has a genuine, unclaimed position: it is the only Philippine-native tool that scores a document for compliance against local frameworks rather than just answering research questions, and the only one that runs with no provider attached. The fair criticism is equally concrete: a 271-authority corpus is small next to Anycase's claimed 90,000+ resources and tiny next to CD Asia's Supreme Court archive back to 1901. Depth is the credibility risk, and Section 8 treats it as one.

The horizontal tier is the competitor that actually matters. Beating Intellegal is a product problem; displacing the reflex to "just ask ChatGPT" is a habit problem, and habits are harder. The wedge is the one thing ChatGPT structurally cannot promise: every answer traces to a named Philippine authority or says, out loud, that it found none.

---

## 6. Positioning and differentiators

LexInsights wins on three claims it can prove, not on being a cheaper Harvey.

**It grounds answers in named Philippine authorities, or admits it can't.** The corpus is 271 authorities with 181 curated relations, and local mode is deterministic template generation with no model in the loop. A tool that cannot invent a citation because it has no generative step in local mode is a different risk category from one that hallucinates 17% to 58% of the time. This is the anti-Mata-v.-Avianca position, and it is defensible in code.

**It scores documents, not just answers questions.** Every rival in the Philippine tier does research. None takes a PDF and returns a 0-to-100 compliance score with green/amber/red findings mapped to 45 frameworks. That is the product's moat, and it points straight at the SME compliance persona nobody else serves.

**It runs when the provider is down.** `local-providerless` is the default mode, not a fallback bolted on later ([.env.example:19](../.env.example)). When a remote RAG endpoint times out, the app degrades to local research instead of a spinner. For a user on Philippine connectivity, "works offline-ish and stays cheap" is a feature, not a compromise.

The weaknesses are real and stated here so requirements can target them: corpus depth (271 vs 90,000+), no server-side persistence of the flagship compliance report, no PDF export, no matter/case organization, & lexical retrieval that nails exact citations but can miss a semantically-phrased query with no matching keyword.

---

## 7. Goals, non-goals, and success metrics

**Goals for the next cycle.**
- Make the compliance report a durable, attributable, exportable artifact a professional can rely on.
- Make citation traceability a guarantee, not a best-effort behavior.
- Turn the SC disclosure regime (A.M. No. 25-11-28-SC) from a risk into a shipped feature.
- Grow the corpus and tell users honestly what it does and does not cover.

**Non-goals.**
- Not becoming a legal-advice engine. The README disclaimer holds: LexInsights "is not a lawyer, law firm, court, regulator, or official government source" ([README.md:12](../README.md)).
- Not chasing BigLaw or enterprise seats; that is Harvey's market and its price point.
- Not adding OCR, multi-language UI, or real-time collaboration this cycle. They are real, but they are not P0 or P1.

**Success metrics.** Each is measurable and tied to a current baseline.

| Metric | Baseline (0.5.2) | Target |
|---|---|---|
| Compliance reports persisted server-side | 0% (localStorage only) | 100% |
| Answers that either link a source or show an explicit "no authority found" state | Not enforced | 100% of responses |
| Compliance reports exportable as PDF | No | Yes |
| Corpus authorities | 271 | 400+, with visible coverage and last-updated metadata |
| p95 local research latency | Sub-second (per `check:local-rag:performance`) | Hold sub-second as corpus grows |
| AI-use disclosure artifact attachable to a report | None | Shipped, one click |

---

## 8. Requirements

Requirements are ordered P0 (build first; the product is not trustworthy without them), P1 (build next; they widen the moat), and P2 (build when P0 and P1 are done). Each carries a rationale grounded in the current code and an acceptance test.

### P0-1. Persist compliance reports, findings, and version history server-side with an audit trail

The flagship feature's output lives in `localStorage` and nowhere else. `compliance_reports` exists in [schema.sql:252](../database/schema.sql) with RLS, four indexes, a foreign key to `documents`, and a score CHECK constraint, and the application never inserts a single row into it. Version history is a zustand store persisted to the browser ([compliance-store.ts:102](../src/lib/store/compliance-store.ts)); clear site data and every prior report version is gone. A compliance officer cannot rely on a verdict that vanishes with a cache flush, and a lawyer cannot produce an audit trail that never left the browser.

Findings and checklist items are stored only as Markdown text inside the report body, so nothing is queryable. Normalize them into their own rows so a report can be filtered, counted, & audited.

*Acceptance:* every generated compliance report writes a row to `compliance_reports` on creation; each saved version writes an immutable row to a new `report_versions` table with `user_id`, `created_at`, and a change note; findings persist to a normalized `report_findings` table with severity (green/amber/red), the cited authority, and the checklist item; a report survives clearing browser storage and reloads from Supabase.

### P0-2. Guarantee citation traceability with an explicit "no authority found" state

Citation rendering already exists ([legal-citation.tsx](../src/components/chat/legal-citation.tsx)), but nothing guarantees that every claim in an answer links to one of the 271 authorities, and nothing forces an honest empty result when the corpus has no match. This guarantee is the whole product thesis. Stanford measured 17% to 34% hallucination in the paid tools; the defense is not a better model, it's a contract that a claim without a source is either linked or labeled unsupported.

Shipping this costs something, and that cost is the point: the tool will visibly say "I found no authority for this" more often than ChatGPT will, because ChatGPT fills the gap with an invented case. Choosing the honest empty state over a confident fabrication is the reason a lawyer can file work that touched this tool.

*Acceptance:* every assistant response in both modes either renders at least one inline citation resolving to a corpus authority, or renders an explicit "no supporting authority in the local corpus" notice; a golden-query test asserts the no-match state for a query with no corpus support; no response presents an unlinked statute number as if it were sourced.

### P0-3. AI-use disclosure and provenance export for court-bound work

A.M. No. 25-11-28-SC (resolved 18 February 2026) requires plain-language disclosure of AI use in court-bound work and holds the filer personally responsible. No Philippine competitor has built for this. LexInsights already captures the raw material every disclosure needs: provider mode, fallback status, matched authorities, retrieval diagnostics, & per-source verification dates. Assemble it into a disclosure block a user can attach to a report or filing.

This is the requirement that turns a regulatory obligation into a feature nobody else offers. It maps a rule the target user must follow onto data the app already has.

*Acceptance:* a compliance report can emit a disclosure artifact stating that AI-assisted research was used, which mode (`local-providerless` or remote), which authorities were cited with their verification dates, and the standing reminder to verify against official sources; the artifact exports with the report; wording is reviewed against the text of A.M. No. 25-11-28-SC.

### P1-1. PDF export for compliance reports

Reports export to Markdown and DOCX only ([compliance-canvas.tsx](../src/components/chat/compliance-canvas.tsx)). Regulators, NPC filings, & courts expect PDF. This is a documented gap in the product's own output formats, it is low-effort, and it removes a reason for a professional user to route the report through a second tool.

*Acceptance:* a compliance report exports to PDF with the same color-coded findings, checklist, and citations as the DOCX export; the PDF includes the P0-3 disclosure block.

### P1-2. Expand and version the corpus with visible coverage metadata

271 authorities is the depth risk named in Section 5. The fix is two-part: grow the corpus toward 400+ and, more importantly, tell users what is and is not covered. The corpus already tracks per-source verification dates and a coverage map; surface them. A user who sees "this framework is covered, last verified 2026-06-25, these date ranges are not" trusts a small honest corpus more than a large silent one.

*Acceptance:* the Help & Resources surface shows corpus size, framework coverage, and last-verified dates per source category; adding an authority still passes `check:local-rag:governance`; the corpus reaches 400+ authorities without regressing sub-second p95 latency.

### P1-3. Matter and project workspace

Compliance is capped at 3 files per session ([compliance-upload.ts](../src/lib/utils/compliance-upload.ts)) with no way to group documents or reports. An SME compliance officer reviews a matter, not a file. Add a matter container that groups uploaded documents, their reports, & version history under one heading, with tagging. This is the natural expansion of the compliance moat competitors do not have.

*Acceptance:* a user can create a matter, attach multiple documents and their reports to it, tag it, and reopen it later with all reports and versions intact (which depends on P0-1 landing first).

### P2-1. Education and student tier with a visible entitlement surface

3,962 people passed the 2024 Bar, and rivals monetize students directly (Anycase Edu at PHP 599/month, Jur.ph annual at PHP 167/month). The app currently gives users no client-side view of their limits; guardrails exist only server-side (30 requests/60s on `rag-proxy` POST, 12/60s on `document-text`). Ship a visible free/student tier with a clear entitlement display so the funnel that starts free has a reason to convert.

*Acceptance:* an authenticated user sees their tier, remaining quota, and what a paid tier adds; a student verification path grants the education tier.

### P2-2. Framework-specific report templates

Compliance produces one generic report format today. The corpus already carries 45 framework packs; use them to select a template so an RA 10173 privacy review reads differently from an RA 9160 AML review. Framework-specific output sharpens quality & reinforces the compliance-over-research positioning.

*Acceptance:* generating a report against a detected framework selects a matching template with framework-specific sections and checklist items; the template maps to one of the 45 bundled frameworks.

### P2-3. Progress indication for extraction and deep search

Document extraction runs on a 15,000ms timeout and RAG proxy POSTs can run to 300,000ms, with no progress feedback. Deep Search and multi-file runs feel broken when they are merely slow. Add real progress so users wait instead of abandon.

*Acceptance:* document extraction and Deep Search show step-level progress; a run approaching its timeout shows time-remaining rather than a static spinner.

---

## 9. Release plan

Three phases, ordered so trust lands before growth.

**Phase 1 (P0). Trust foundation.** Server-side persistence with an audit trail (P0-1), the citation-traceability guarantee (P0-2), and the AI-use disclosure export (P0-3). The theme is: a professional can rely on the output and defend it under A.M. No. 25-11-28-SC. Nothing else ships until a report survives a cache clear and every answer is sourced or honestly empty.

**Phase 2 (P1). Widen the moat.** PDF export (P1-1), corpus growth with visible coverage (P1-2), and the matter workspace (P1-3). The theme is: deepen the one thing no competitor has, which is document-level compliance, & blunt the corpus-depth attack with honesty plus volume.

**Phase 3 (P2). Grow the funnel.** Student tier and entitlements (P2-1), framework templates (P2-2), and progress UX (P2-3). The theme is: convert the free and student traffic the 2024 Bar cohort represents.

---

## 10. Risks and mitigations

| Risk | Concrete form | Mitigation |
|---|---|---|
| Hallucination liability | One fabricated PH citation under the A.M. No. 25-11-28-SC disclosure regime is reputational ruin; RAG tools still hallucinate 17-34% (Stanford, 2025) | P0-2 traceability guarantee; deterministic local mode with no model in the loop |
| Corpus-depth attack | 271 authorities vs Anycase's claimed 90,000+ and CD Asia's 1901-onward archive | P1-2 growth to 400+ plus visible coverage disclosure; compete on compliance scoring, not archive size |
| Well-funded PH rivals | Intellegal (launched Jun 2026) and Anycase could add a compliance module and out-resource a four-person team | Ship the compliance moat and disclosure feature before they do; P0 and P1 are the defensible ground |
| Horizontal AI habit | Free ChatGPT is the real incumbent and Taglish-fluent | Lead every surface with the traceability guarantee ChatGPT structurally cannot make |
| Infra maturity | End-to-end Playwright only, Chromium only, no unit tests, no DB migration tooling | Add unit coverage and migrations alongside P0-1's schema work, not after |
| Data-durability trust gap | Guest and report data is browser-bound with no cloud backup | P0-1 removes the largest instance; state a data-retention posture publicly |

---

## 11. Open questions and assumptions

- Does `profiles` get populated by a Clerk webhook, or is it, like `compliance_reports`, a provisioned-but-unused table? The application has no `from('profiles')` write path in `src`; confirm before P0-1 builds on it.
- What is the intended retention window for a persisted compliance report, given the RA 10173 posture the product markets? P0-1 needs a retention answer, not just a table.
- Is the remote RAG upstream (`devkada.resqlink.org`) a maintained dependency or a demo relic? It shapes how much the disclosure block must distinguish local from remote provenance.
- The compliance score is a 0-to-100 integer with no user-facing rubric. Should the rubric be published, so a score is defensible, or kept internal? This affects P0-3's disclosure wording.

---

## 12. Appendix: verified numbers and sources

Numbers about the product were read directly from the repository on 2026-07-08. Numbers about the market and competitors were gathered by web research on the same date and should be re-verified before external use, because valuations, launch dates, and pricing move.

**Product (read from repo):** 271 corpus authorities, 13 source categories, 45 compliance frameworks, 181 authority relations, 6 database tables (2 unused: `compliance_reports`, `search_history`), 5MB upload limit, 3 files per compliance session, compliance score 0-100, 3 finding severities, 6 standard / 10 deep search matches, up to 12 cross-references, Markdown + DOCX export (no PDF), 14 pages, 5 `/api` routes, ~61 components, 25 `check:*` gates, version 0.5.2, Next.js 16.2.9, React 19.2.7, Clerk 7.5.2, Supabase 2.80.0, rate limits 30/60s (rag-proxy POST) and 12/60s (document-text), RAG POST timeout 300,000ms, extraction timeout 15,000ms.

**Market and regulation (web research, 2026-07-08):** GPT-4 legal hallucination ~58%, Llama 2 88% (Dahl et al., "Large Legal Fictions," JLA 2024); Lexis+ AI >17%, Westlaw AI-Assisted >34% (Magesh et al., Stanford, 2025); ~1,450 AI-fabricated-citation court cases (Charlotin DB, Jul 2026); *Mata v. Avianca* USD 5,000 sanction, 22 Jun 2023; A.M. No. 25-11-28-SC (PH SC AI Governance Framework, 18 Feb 2026); RA 10173 signed 15 Aug 2012, effective 8 Sep 2012, NPC admin fines up to PHP 5,000,000/act, criminal PHP 500,000-4,000,000; 2024 PH Bar 3,962 passers / 37.84% / ~10,500 examinees.

**Competitors (web research, 2026-07-08):** Intellegal (launched Jun 2026, Technese Legaltech Inc., Makati); Anycase (PHP 999/mo Pro, PHP 599/mo Edu, 15 free credits, claims 5,000+ users and 90,000+ resources); Jur.ph (PHP 399 one-month to PHP 167/mo annual); CD Asia (est. 1994, SC decisions from 1901); Harvey (~USD 11B valuation Mar 2026, ~USD 300M ARR, 142,000+ lawyers, 1,500+ customers); Thomson Reuters CoCounsel (Casetext acquired USD 650M, 2023; standalone retired 31 Mar 2025); Westlaw/Lexis stacks USD 10,000-20,000+/yr, USD 150-400/user/mo; ChatGPT/Claude/Gemini/Perplexity free to USD 20/mo, Perplexity Max USD 200/mo.
