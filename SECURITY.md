# Security Policy

LexInsights is a public Philippine legal compliance assistant project. Please report suspected vulnerabilities privately and avoid posting exploit details in public issues.

## Reporting

Use one of these public maintainer entry points to request a private reporting channel:

- Maintainer portfolio: https://www.marksiazon.dev
- Repository issues: https://github.com/Iron-Mark/Hackathon-LexInsights/issues

Include a short description, affected route or component, reproduction steps, and expected impact. Do not include sensitive personal data, secrets, or real legal client material in reports.

## Production Expectations

- Keep `.env*` files, `.vercel`, and provider secrets out of git.
- Keep `ENABLE_DIAGNOSTIC_ROUTES=false` or unset in public production deployments.
- Treat `/api/readiness` and `/api/version` as operational diagnostics, not as legal or user data endpoints.
- Use providerless local research as the public default unless a remote RAG provider is intentionally configured and monitored.

## Legal And Data Notice

LexInsights is not a lawyer, law firm, court, regulator, or official government source. Security reports should not include privileged, confidential, personal, or sensitive personal information unless there is a lawful basis and a safe reporting channel has been agreed.
