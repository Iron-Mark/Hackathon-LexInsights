# Security Policy

LexInsights is a public Philippine legal compliance assistant project. Please report suspected vulnerabilities privately and avoid posting exploit details in public issues.

## Reporting

Use one of these maintainer entry points to request a private reporting channel. If GitHub private vulnerability reporting is enabled for the repository, prefer that path.

- Maintainer portfolio: https://www.marksiazon.dev
- Repository issues: https://github.com/Iron-Mark/Hackathon-LexInsights/issues

Include a short description, affected route or component, reproduction steps, and expected impact. Do not include sensitive personal data, secrets, or real legal client material in reports.

Expected handling:

- Acknowledge actionable reports as soon as maintainers can review them.
- Triage severity by exploitability, affected data, affected users, and production exposure.
- Keep exploit details private until a fix or mitigation is available.
- Credit reporters when requested and appropriate.
- Do not access, modify, delete, or exfiltrate data that is not needed to prove the issue.

## Production Expectations

- Keep `.env*` files, `.vercel`, and provider secrets out of git.
- Keep `ENABLE_DIAGNOSTIC_ROUTES=false` or unset in public production deployments.
- Treat `/api/readiness` and `/api/version` as operational diagnostics, not as legal or user data endpoints.
- Use providerless local research as the public default unless a remote RAG provider is intentionally configured and monitored.
- Keep request validation, upload size limits, document signature checks, CSP, and HSTS enabled for public deployments.
- Follow [Incident Response](docs/operations/INCIDENT-RESPONSE.md) for security, privacy, availability, and data-handling incidents.

## Legal And Data Notice

LexInsights is not a lawyer, law firm, court, regulator, or official government source. Security reports should not include privileged, confidential, personal, or sensitive personal information unless there is a lawful basis and a safe reporting channel has been agreed.
