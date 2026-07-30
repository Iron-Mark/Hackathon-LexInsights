# LexInsights Competitive Battlecard

| Field | Value |
|---|---|
| For | LexInsights (`lexiph.vercel.app`), version 0.5.2 |
| Date | 2026-07-30 |
| Status | Draft for review |
| Companion docs | [Competitive Brief](./COMPETITIVE-BRIEF.md), [PRD](./PRD.md) |
| Research freshness | Competitor pricing, funding, and launch dates researched 2026-07-08; re-verify before external use. Product claims re-verified against the repo 2026-07-30 |

A one-page reference for positioning LexInsights against the tools a Philippine lawyer, SME, or student actually considers. Numbers are here so a claim can be checked, not taken on faith. Update it the day a competitor ships a compliance feature, because that is the day the middle section changes.

## LexInsights in one paragraph

LexInsights answers Philippine legal questions & scores uploaded documents for compliance against 45 frameworks, from a bundled corpus of 305 authorities that runs with no AI provider attached. Local mode is deterministic template generation; it calls no model, so it has no generative step in which to invent a case name. Target users are price-sensitive solo & small-firm lawyers, SME compliance officers, and law students. Entry is guest-first and free. The one thing it does that no Philippine-native rival does: take a PDF and return a 0-to-100 score with green, amber, or red findings mapped to named statutes. The report exports to Markdown, DOCX, or PDF, each with an A.M. No. 25-11-28-SC AI-use disclosure block appended, and a signed-in user's reports persist server-side with version history.

---

## Versus Anycase (closest Philippine-native rival)

**Their pitch.** An AI legal research assistant for Philippine lawyers and students, marketed on scale: it claims 5,000+ users and a library of 90,000+ resources. Pricing is public: PHP 999/month Pro, PHP 599/month for the education tier, and 15 free credits over two weeks.

**Where they genuinely win.** Corpus breadth. 90,000+ claimed resources dwarfs a 305-authority bundle, and a paid education tier at PHP 599 already courts the student funnel. Say so plainly; a battlecard that pretends the rival is weak gets a rep laughed out of the room.

**Where they're weak.** They do research, not document compliance. There's no evidence of a feature that ingests a company's policy and scores it against RA 10173 or RA 9160. Their scale claim is also a metered subscription, not a free-at-entry product.

**Our counter.** LexInsights owns the compliance-scoring job Anycase doesn't sell, and it runs providerless so it degrades to local research instead of a spinner when a backend times out. The corpus is smaller by design and honest about it; every one of the 305 authorities carries a source and a verification date (34 added 2026-07-30 carry seeded provenance pending live verification), and Help & Resources publishes per-family counts with last-verified dates.

| If the prospect says | Respond with |
|---|---|
| "Anycase has 90,000+ resources; you have 305." | "For research breadth, true. But Anycase answers questions; it doesn't take your data privacy manual and score it green/amber/red against RA 10173. That's the job LexInsights is built for, and it's free to try without a login." |
| "Anycase already has a student tier." | "At PHP 599 a month. LexInsights is free at entry with real citations, so a bar reviewee pays nothing to check a statute." |

**Landmine to set:** "When you upload a company policy, do you get a compliance score and findings, or just an answer you still have to interpret?"

---

## Versus Intellegal (newest Philippine-native rival)

**Their pitch.** Verifiable AI legal research and document review built for Philippine law, positioned citation-first: every claim traces to a source. Operated by Technese Legaltech Inc. in Makati; launched publicly June 2026.

**Where they genuinely win.** Citation-first positioning is the right one, and they have the press coverage & company backing of a funded launch, not a four-person hackathon team. They arrived in the same lane LexInsights wants.

**Where they're weak.** They lead with contract review & research, not framework-mapped compliance scoring for SMEs, and there's no providerless story; a hosted AI tool is only as available as its backend.

**Our counter.** Same citation-first thesis, plus two things Intellegal doesn't sell: a 0-to-100 compliance score against 45 named PH frameworks, and a deterministic local mode with no model in the loop. Ground the pitch on the AI-use disclosure regime (A.M. No. 25-11-28-SC, 18 February 2026): LexInsights ships it today — every report export (Markdown, DOCX, PDF) appends a disclosure block — and Intellegal sells nothing equivalent.

| If the prospect says | Respond with |
|---|---|
| "Intellegal also shows its citations." | "Good, they should. The difference is what happens with no match: LexInsights says 'no authority found' out loud instead of filling the gap. And it scores documents against 45 frameworks, which is a different product than research." |
| "Intellegal is a funded company; you're a hackathon project." | "Fair. Judge the output, not the org chart. Ask both tools the same RA 10173 question and check whether every cited section resolves to a real Lawphil page. And the output is durable: a signed-in user's compliance report persists server-side with immutable version history and survives a cleared browser — unit-tested, not hand-waved." |

**Landmine to set:** "Does the tool keep working if its AI provider is down, and does it give you an AI-use disclosure you can attach to a filing?" LexInsights answers yes to both; make the prospect ask Intellegal the same.

---

## Versus "just use ChatGPT" (the real incumbent)

**Their pitch.** There is no pitch. It's free or USD 20/month, it's already open in another tab, & it answers in fluent Taglish. This is the tool most people actually reach for, and it's the one to beat.

**Where they genuinely win.** Zero friction, general capability, and no per-jurisdiction limit. For a first draft of an email, it's fine.

**Where they're weak.** It fabricates. Dahl et al. (2024) measured GPT-4 hallucinating on roughly 58% of verifiable legal questions. The failure mode is a real-looking citation attached to a wrong or invented case, which is how *Mata v. Avianca* became a USD 5,000 sanction on 22 June 2023 over six fake cases. Roughly 1,450 court cases worldwide now flag AI-fabricated citations.

**Our counter.** LexInsights has no generative step in local mode, so it can't invent a citation the way a general chatbot does. Every answer either links to one of 305 named authorities or says it found none. Under the Supreme Court's disclosure regime, "I used a tool that can't fabricate a citation, and here's the provenance" is a defensible sentence; "I asked ChatGPT" is not.

| If the prospect says | Respond with |
|---|---|
| "ChatGPT already answers my legal questions." | "It also invents cases about 58% of the time on verifiable questions. LexInsights answers from 305 named PH authorities or tells you it has none. One of those you can file; the other got a lawyer sanctioned USD 5,000." |
| "ChatGPT is free." | "So is LexInsights at entry, and it won't hand you a citation that doesn't exist." |

**Landmine to set:** "When ChatGPT gives you a Republic Act number, how do you confirm the section it cites actually says what it claims?"

---

## Versus the incumbents we don't fight on price

**CD Asia / CD Technologies.** Established 1994, with Supreme Court decisions in full text back to 1901. This is the depth benchmark, and LexInsights won't match a 130-year archive. Don't try. Compete on the compliance-scoring workflow & the free entry point, not on archive size.

**Westlaw, Lexis+ AI, Harvey.** Priced for firms, not solos, and not hallucination-free either (pricing, valuations, and the Stanford error rates are in the [Competitive Brief](./COMPETITIVE-BRIEF.md)). The counter is one sentence: a Filipino solo or SME isn't signing a five-figure annual contract, and the paid tools aren't clean anyway.

---

## Win and loss themes

**We tend to win when** the prospect needs to score a document against a Philippine framework, is price-sensitive, values a citation they can click, or needs an AI-use disclosure for court-bound work under A.M. No. 25-11-28-SC.

**We tend to lose when** the prospect needs deep case-law archives (CD Asia's 1901-onward corpus), wants the resource breadth Anycase advertises, or already trusts a funded rival's brand over a hackathon-stage tool. The [PRD](./PRD.md)'s P0/P1 answer has shipped — server-persisted reports, the citation-traceability guarantee, the disclosure export, PDF export, visible coverage dates in Help & Resources — so what remains is growing the 305-authority corpus toward 400+ (P1-2).

## Maintenance

Review quarterly at minimum, & immediately when Intellegal or Anycase announces a compliance feature, when a PH court sanctions a lawyer over an AI citation, or when the corpus count in [PRD.md](./PRD.md) changes. Keep every number in this card matched to a checkable source.
