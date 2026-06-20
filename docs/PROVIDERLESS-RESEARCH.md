# Providerless Research

LexInSight can answer basic Philippine legal research questions and review plain text or Markdown drafts even when the remote RAG backend or an AI provider is unavailable.

The implementation lives in [local-legal-research.ts](../lexiph/src/lib/services/local-legal-research.ts). The normal service entry points in [rag-api.ts](../lexiph/src/lib/services/rag-api.ts) try the configured provider first, then return local providerless output on timeout, network failure, or upstream error.

## Runtime Behavior

- Standard research still calls the configured RAG endpoint first.
- Deep Search still uses the same service contract, but local mode expands cross-references instead of downloading PDFs or calling an AI provider.
- Draft checking works locally for plain text and Markdown files. PDF and Word files still require backend-side text extraction before review.
- Responses include `provider_mode`, `fallback_used`, `fallback_reason`, and `confidence_score` when available.
- The UI shows a local-mode notice and keeps storing research responses in chat history.

## Local Research Algorithm

The providerless research path is deterministic:

1. Normalize the query, strip punctuation, remove common stop words, and extract Republic Act numbers.
2. Expand terms through legal-topic triggers such as waste, privacy, workplace safety, fire safety, DRRM, air, water, LGU authority, corporate governance, harassment, and electronic records.
3. Score the bundled corpus with BM25-style term ranking plus boosts for exact RA numbers, statute aliases, short titles, and topic phrases.
4. Return the top matches with source links, matched terms, practical checklists, and common gaps.
5. Generate Markdown through templates only. Local mode does not call an AI model.

## Draft Checker Algorithm

The providerless draft checker uses structural and topic-specific heuristics:

- Checks for legal authority, purpose, scope, definitions, responsible office, operative duties, monitoring, budget, effectivity, and due process.
- Flags red findings when penalties appear without notice, hearing, appeal, or reconsideration safeguards.
- Adds topic checks for privacy, solid waste, workplace safety, fire safety, DRRM, water quality, air quality, and digital records.
- Computes a conservative compliance score from green, amber, and red findings.

This catches common drafting gaps. It does not determine legality, validity, or enforceability.

## Bundled Corpus

The local corpus intentionally stays small and auditable:

- [RA 9003 - Ecological Solid Waste Management Act of 2000](https://lawphil.net/statutes/repacts/ra2001/ra_9003_2001.html)
- [RA 10173 - Data Privacy Act of 2012](https://privacy.gov.ph/data-privacy-act/)
- [RA 11058 - Occupational Safety and Health Standards Act](https://lawphil.net/statutes/repacts/ra2018/ra_11058_2018.html)
- [RA 9514 - Fire Code of the Philippines of 2008](https://lawphil.net/statutes/repacts/ra2008/ra_9514_2008.html)
- [RA 7160 - Local Government Code of 1991](https://lawphil.net/statutes/repacts/ra1991/ra_7160_1991.html)
- [RA 10121 - Philippine Disaster Risk Reduction and Management Act of 2010](https://lawphil.net/statutes/repacts/ra2010/ra_10121_2010.html)
- [RA 8749 - Philippine Clean Air Act of 1999](https://www.lawphil.net/statutes/repacts/ra1999/ra_8749_1999.html)
- [RA 9275 - Philippine Clean Water Act of 2004](https://lawphil.net/statutes/repacts/ra2004/ra_9275_2004.html)
- [RA 11232 - Revised Corporation Code of the Philippines](https://lawphil.net/statutes/repacts/ra2019/ra_11232_2019.html)
- [RA 11313 - Safe Spaces Act](https://lawphil.net/statutes/repacts/ra2019/ra_11313_2019.html)
- [RA 8792 - Electronic Commerce Act of 2000](https://lawphil.net/statutes/repacts/ra2000/ra_8792_2000.html)

## Limits

Providerless mode does not search live government sites, new issuances, court decisions, local ordinances, amendments, or facts outside the query or draft text. Treat it as a resilient research aid and drafting checklist. Verify all outputs against current official sources and qualified legal counsel before making compliance decisions.
