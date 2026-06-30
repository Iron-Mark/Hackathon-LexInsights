# RAG QA

LexInsights uses providerless local RAG as the public default. The quality gates below keep that local corpus from drifting as source records, answer behavior, and provenance UI evolve.

## Source Freshness

```powershell
npm run check:local-rag:sources
```

This offline check validates that every corpus record has source metadata and coverage metadata, uses HTTPS, stays on a reviewed source host, has a valid non-future catalog or verification date, and keeps minimum provenance-note coverage. It also prints the split between `verified` and `seeded` records so public UI and maintainers do not overstate source freshness.

This check does not call live government sites. Keep it deterministic for CI.

For opt-in live URL status review, run the standalone live audit directly:

```powershell
node scripts/check-local-rag-source-live.mjs --sample 10
```

The live audit reads `AUTHORITY_SOURCES`, checks each selected URL with `HEAD`, falls back to a small `GET` request when needed, enforces bounded timeout and concurrency, and prints a summary with failed source IDs. Use `--limit <n>` or `--sample <n>` for safe runs, plus `--timeout-ms <n>`, `--concurrency <n>`, and `--report <path>` when you need a JSON report. Direct runs exit nonzero when selected URLs fail; use `--allow-failures` for report-only sampling. Do not wire this script into `check:local` or CI because official sites can block, throttle, redirect, or temporarily fail.

## Answer Quality

```powershell
npm run check:local-rag:answers
```

This gate runs a fixed set of realistic Philippine legal research prompts through `runLocalResearch` with deep search enabled. Each case asserts completion, local-providerless mode, confidence threshold, required authorities, forbidden authorities where relevant, expected answer fragments, unknown-citation handling, and HTTPS source metadata on top matches.

The prompt cases live in `tests/fixtures/rag-golden/answer-quality-cases.json`. The fixture schema is documented in `tests/fixtures/rag-golden/README.md`; update that fixture when adding or tuning answer-quality scenarios.

Use this check for answer drift. Keep broad retrieval coverage in `check:local-rag:golden`, performance budgets in `check:local-rag:performance`, and corpus relationship integrity in `check:local-rag:governance`.

## Citation Trust

Citation UI should distinguish these states:

- `verified` means the source record is marked verified by local metadata.
- `seeded` means the source is cataloged in the bundled corpus but needs official verification before operational reliance.
- Unknown citations must not show invented titles, links, verification dates, evidence anchors, or source tiers.

When adding a new corpus record, update the corpus entry, authority source metadata, evidence anchors where useful, authority relations, coverage map, and at least one relevant RAG quality gate.
