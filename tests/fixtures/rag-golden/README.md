# RAG Golden Fixtures

Fixtures in this directory hold deterministic local RAG QA inputs. They are data files only; the scripts define the assertions and runtime behavior.

## `answer-quality-cases.json`

Top-level fields:

- `schemaVersion`: Fixture schema version. Use `1` for the current format.
- `cases`: Non-empty array of answer-quality cases.

Case fields:

- `id`: Unique stable identifier used in assertion messages.
- `query`: Prompt sent to `runLocalResearch` with deep search enabled.
- `expectedStatutes`: Non-empty list of statute or authority labels that must appear in matched documents.
- `requiredFragments`: Non-empty list of case-insensitive text fragments that must appear in the generated summary.
- `minConfidence`: Minimum accepted `confidence_score`, from `0` to `1`.
- `forbiddenStatutes`: Optional list of statute or authority labels that must not appear in matched documents.
- `expectedUnknownCitations`: Optional list of citation numbers that must appear in `retrieval_metadata.unknown_citation_numbers`.

Keep cases broad enough to catch answer drift, but avoid turning this fixture into the exhaustive corpus coverage suite. Use `scripts/check-local-rag-golden-self-test.mjs` for wide retrieval coverage.
