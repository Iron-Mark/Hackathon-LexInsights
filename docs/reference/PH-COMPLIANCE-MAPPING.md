# Philippine Compliance Mapping

This map explains how LexInsights product controls support Philippine legal research, privacy, ICT, accessibility, and public-service expectations. It is a product and operations map, not a legal determination.

## Data Privacy And NPC Readiness

- Public Terms and Privacy pages describe legal-research limits, user content, generated output, account data, chat and upload processing, retention, security, privacy rights, and maintainer contact routes.
- The bundled corpus includes RA 10173, the Data Privacy Act IRR, NPC breach-management, security, consent, registration, data-sharing, and privacy-engineering materials.
- `/api/version` and `/api/readiness` keep public diagnostic output lean, with detailed diagnostics limited to local checks or token-gated requests.
- Sign-out clears RAG, compliance, upload, guest-chat, and fallback-chat browser storage keys.
- Document uploads are capped at 5MB and server extraction now validates PDF/Word signatures before parsing.

## DICT And Cyber Incident Readiness

- The app treats providerless local research as the public default so core research remains usable without depending on a remote AI/RAG provider.
- Security headers include frame denial, `nosniff`, referrer policy, permissions policy, CSP, and HSTS.
- The incident runbook covers cyber incident classification, evidence preservation, secret rotation, service-provider escalation, and DICT/National CERT coordination assessment where applicable.
- RAG proxy requests are schema-limited and size-limited before forwarding to any remote provider.

## Accessibility And Public-Service UX

- UI guidance requires keyboard-accessible controls, adequate touch targets, visible focus states, responsive dialogs, no mobile horizontal overflow, and clear theme behavior.
- PWA checks validate manifest metadata, icons, service worker registration, service worker headers, and offline fallback.
- Browser smoke tests include mobile layout, Help resources, citation dialogs, public chat flow, offline fallback, and upload workflows.

## Legal Research Integrity

- Unknown citations are surfaced without invented source details.
- Citation dialogs show source tier, provenance state, evidence anchors, related authorities, matched signals, and official-source links when metadata exists.
- RAG source freshness and answer-quality gates run offline and are included in the full local quality gate.
- Golden, performance, governance, source, and answer checks should all be updated when the corpus changes materially.
