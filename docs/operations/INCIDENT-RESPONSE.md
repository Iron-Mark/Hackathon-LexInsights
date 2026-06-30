# Incident Response

Use this runbook for LexInsights security, privacy, availability, or data-handling incidents. It is operational guidance for the project team, not legal advice.

## Intake

1. Capture the report privately when possible.
2. Assign an owner, timestamp, affected environment, affected routes, and suspected data classes.
3. Preserve evidence without copying more user content, prompts, uploaded documents, tokens, or personal data than necessary.
4. Stop active abuse first: disable affected credentials, rotate exposed secrets, block abusive origins, or disable the affected route.

## Classification

Classify impact across these tracks:

- Security: unauthorized access, secret exposure, account/session issue, dependency vulnerability, injection, route abuse, or supply-chain issue.
- Privacy: personal information, sensitive personal information, uploaded documents, chat content, account metadata, or browser-local fallback data.
- Availability: outage, degraded provider, failed deployment, broken PWA, or storage/provider interruption.
- Integrity: incorrect deployment, stale source corpus, broken RAG citation metadata, or corrupted saved chats.

## PH Privacy And ICT Coordination

For incidents involving personal data, assess breach-notification duties under the Data Privacy Act, NPC breach-management issuances, and the facts of the incident. Track whether notification to affected data subjects, the National Privacy Commission, service providers, or organizational stakeholders may be required.

For cyber incidents that may involve public ICT systems, serious attacks, fraud, unauthorized access, malware, or infrastructure compromise, assess whether DICT, National CERT/NCERT coordination, law-enforcement, provider, or hosting-provider escalation is appropriate.

Document the assessment, including why notification was or was not required, who approved it, and what official channels were used.

## Response Checklist

- Freeze relevant logs and deployment metadata.
- Rotate exposed keys and revoke affected sessions.
- Patch the route, dependency, configuration, or deployment source.
- Add or update regression tests before closing the incident when feasible.
- Review whether public diagnostics exposed more than intended.
- Review whether browser-local caches or fallback chat stores need cleanup guidance.
- Communicate user-facing facts without exposing exploit instructions or private data.
- Complete a post-incident review with root cause, blast radius, remediation, and follow-up owners.

## Logging Rules

Logs and reports should avoid raw prompts, uploaded document contents, full personal data, secrets, tokens, Supabase keys, Clerk identifiers beyond what is necessary, and privileged legal material. Prefer request IDs, route names, coarse timestamps, status codes, bounded sizes, and redacted error categories.
