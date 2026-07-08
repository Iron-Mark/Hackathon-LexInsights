# LexInsights Competitive Brief

| Field | Value |
|---|---|
| Subject | LexInsights (`lexiph.vercel.app`), version 0.5.2 |
| Date | 2026-07-08 |
| Status | Draft for review |
| Companion docs | [PRD](./PRD.md), [Battlecard](./COMPETITIVE-BATTLECARD.md) |
| Research freshness | Product numbers read from the repo; market and competitor numbers web-researched 2026-07-08 and worth re-verifying before external use |

This is the analysis behind the [PRD](./PRD.md) and the [Battlecard](./COMPETITIVE-BATTLECARD.md). It maps who LexInsights competes with, where the open ground is, & what to do about it. Nearly every claim carries a number so a reader can check it.

## Executive summary

The Philippine legal-AI market has research tools and no compliance-scoring tool. Intellegal, Anycase, & Jur.ph all answer legal questions; none takes a company's document and scores it against a named Philippine framework. That gap is LexInsights' opening, and it points at a persona nobody else serves: the SME compliance officer facing RA 10173, where National Privacy Commission fines reach PHP 5,000,000 per act.

The biggest opportunity is the SME compliance lane plus a disclosure feature the Supreme Court just made mandatory (A.M. No. 25-11-28-SC, 18 February 2026). The biggest threat is corpus depth: 271 authorities is small next to Anycase's claimed 90,000+ resources and CD Asia's Supreme Court archive back to 1901, and one fabricated citation under the new disclosure regime is reputational ruin.

## Competitor profiles

**Intellegal.** A verifiable, citation-first AI legal research and document-review tool built for Philippine law, run by Technese Legaltech Inc. in Makati, launched publicly June 2026. It leads on research & contract review, not framework-mapped compliance scoring, and it has no providerless mode. It's the newest and closest rival in positioning.

**Anycase.** An AI legal research assistant for PH lawyers and students that markets on scale: 5,000+ claimed users and 90,000+ claimed resources. Pricing is public at PHP 999/month Pro, PHP 599/month education, and 15 free credits over two weeks. Its strength is breadth & an existing student funnel; its gap is the same document-compliance job the others skip.

**Jur.ph.** A PH legal research subscription priced from PHP 399 for one month down to PHP 167/month annually. A research product, not a compliance product.

**CD Asia / CD Technologies.** Established 1994, with full-text Supreme Court decisions from 1901. This is the legacy depth benchmark; LexInsights won't match the archive and shouldn't try to.

**Global tier (Harvey, CoCounsel, Lexis+ AI, Westlaw).** Harvey carried a roughly USD 11 billion valuation in March 2026 and sells enterprise seats to large firms. Westlaw runs USD 150 to USD 400 per user per month, with annual stacks of USD 10,000 to USD 20,000+. They're priced out of the PH solo & SME market, and they hallucinate too: Stanford (2025) measured Lexis+ AI above 17% and Westlaw's AI research above 34%.

**Horizontal AI (ChatGPT, Claude, Gemini, Perplexity).** Free to USD 20/month, ubiquitous, & Taglish-fluent. This is the real incumbent. It's also the source of the problem the whole category exists to solve: GPT-4 hallucinated on roughly 58% of verifiable legal questions (Dahl et al., 2024), and roughly 1,450 court cases now flag AI-fabricated citations.

## Messaging comparison

| Dimension | LexInsights | Intellegal | Anycase | ChatGPT |
|---|---|---|---|---|
| Primary claim | Providerless PH research plus document compliance scoring | Verifiable, citation-first PH research and review | Scale: 5,000+ users, 90,000+ resources | General assistant for anything |
| Target buyer | Solo/small firm, SME compliance officer, student | PH lawyers, firms | PH lawyers, students | Everyone |
| Key differentiator | 0-100 compliance score vs 45 frameworks; no model in local mode | Every claim traces to a source | Corpus breadth and a student tier | Zero friction, free |
| Pricing posture | Free at entry | Subscription | PHP 999/599 per month | Free to USD 20/mo |
| Core weakness | 271-authority corpus depth | No compliance scoring, no providerless mode | Research only, metered | Fabricates ~58% on legal questions |

## Positioning and content gaps

Two gaps sit unclaimed, and both favor LexInsights.

**Document compliance scoring for SMEs.** Every PH-native rival does research; none scores an uploaded document against RA 10173, RA 9160, or RA 10175 and returns green, amber, or red findings with a 0-to-100 score. LexInsights already ships this. The gap is that the flagship output isn't persisted server-side yet, which the PRD addresses as [P0-1](./PRD.md).

**AI-use disclosure for court-bound work.** A.M. No. 25-11-28-SC (18 February 2026) requires plain-language disclosure of AI use and puts responsibility on the filer. No competitor has built a disclosure or provenance export. LexInsights already captures the raw material (provider mode, matched authorities, per-source verification dates); assembling it is [P0-3](./PRD.md).

## Opportunities

The SME compliance officer is the widest open lane; no PH-native tool targets a persona facing PHP 5,000,000-per-act privacy fines. The student funnel is the second: 3,962 people passed the 2024 Bar out of roughly 10,500 examinees (37.84%), and a free-at-entry tool captures them before they pick a paid incumbent. The disclosure regime is the third, and it turns a legal obligation into a feature. A fourth is quieter: LexInsights already ships `/llms.txt` and `/ai.txt`, so it can be the answer-engine-cited PH legal source as more users arrive through Perplexity-style tools.

## Threats

Corpus depth is the credibility risk. 271 authorities against 90,000+ claimed and a 1901-onward archive is a real gap, and the mitigation is honesty about coverage plus growth toward 400+ ([PRD P1-2](./PRD.md)). Hallucination liability is existential: even purpose-built RAG tools miss 17% to 34%, so one bad PH citation ends trust. Funded rivals moving first is the third threat; Intellegal launched June 2026 and Anycase could add a compliance module and out-resource a four-person team. The habit of reaching for free ChatGPT is the fourth, and the only answer is the traceability guarantee a general chatbot structurally can't make.

## Recommended actions

**This cycle, ship the trust foundation.** Persist compliance reports server-side with an audit trail ([P0-1](./PRD.md)), guarantee every answer links a source or shows an explicit "no authority found" state ([P0-2](./PRD.md)), and ship the AI-use disclosure export ([P0-3](./PRD.md)). These convert the current strengths into defensible ones.

**Claim the compliance lane in the messaging.** Lead every public surface with the one job no PH rival sells: score my document against a Philippine framework. Pair it with the disclosure hook.

**Blunt the depth attack with honesty.** Publish corpus size, framework coverage, & per-source verification dates ([P1-2](./PRD.md)) so a small honest corpus reads as more trustworthy than a large silent one.

**Own the student funnel early.** A free entry tier plus a student path captures the 2024 Bar cohort before Anycase's PHP 599 education tier does ([P2-1](./PRD.md)).

**Ship PDF export.** Regulators, NPC filings, and courts expect PDF, and reports export only Markdown and DOCX today ([P1-1](./PRD.md)).
