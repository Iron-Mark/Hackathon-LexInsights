import {
  COVERAGE_FACTS,
  CURRENT_APP_URL,
  KEY_STATUTES,
  LEGACY_SHOWCASE_URL,
  PHILIPPINE_COMPLIANCE_TOPICS,
  PORTFOLIO_CASE_STUDY_URL,
  PORTFOLIO_URL,
  REPOSITORY_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from '@/lib/seo'

export const dynamic = 'force-static'

const sourceDirectory = [
  'Lawphil Legal Information Archive',
  'Official Gazette of the Republic of the Philippines',
  'Supreme Court E-Library',
  'National Privacy Commission',
  'Department of Justice',
  'Bureau of Internal Revenue',
  'Bangko Sentral ng Pilipinas',
  'Anti-Money Laundering Council',
  'Department of Labor and Employment',
  'Securities and Exchange Commission',
]

export function buildLlmsText() {
  return `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

Canonical app: ${CURRENT_APP_URL}
Primary domain: ${SITE_URL}
Legacy showcase reference: ${LEGACY_SHOWCASE_URL}
Repository: ${REPOSITORY_URL}
Maintainer portfolio: ${PORTFOLIO_URL}
Case study: ${PORTFOLIO_CASE_STUDY_URL}

## What LexInsights Is

LexInsights is a web-based Philippine legal research and compliance assistant. It helps users ask legal research questions, review documents, identify cited authorities, generate compliance-oriented reports, and inspect source support from a bundled local corpus.

LexInsights is not a lawyer, law firm, court, regulator, or official government source. Generated output should be checked against official sources, qualified counsel, or the relevant authority before use.

## Corpus and Coverage

- ${COVERAGE_FACTS.authorities} legal authorities bundled in the local corpus
- ${COVERAGE_FACTS.sources} official source families
- ${COVERAGE_FACTS.frameworks} compliance frameworks
- ${COVERAGE_FACTS.relations} curated authority relations

The default local providerless research mode is deterministic and calls no AI model: it retrieves and cites named authorities from the bundled corpus or reports that it found none, rather than generating text.

## Core Capabilities

- Philippine legal chat and compliance research
- Document review for text, Markdown, PDF, and Word drafts
- Local providerless RAG research when remote providers are unavailable or disabled
- Citation detection for Philippine statutes and related authorities
- Compliance report generation with confidence and source support signals
- Help and Resources directory for official Philippine legal and regulatory sources

## Primary Philippine Compliance Topics

${PHILIPPINE_COMPLIANCE_TOPICS.map((topic) => `- ${topic}`).join('\n')}

## Key Philippine laws covered

${KEY_STATUTES.map((statute) => `- [${statute.code} - ${statute.title}](${statute.url})`).join('\n')}

## Official Source Orientation

LexInsights points users to official or primary Philippine legal and regulatory sources where possible. High-value source families include:

${sourceDirectory.map((source) => `- ${source}`).join('\n')}

## Public Pages

- Home: ${SITE_URL}/
- About / project profile: ${SITE_URL}/about
- Legal chat entry: ${SITE_URL}/chat
- Terms of Service: ${SITE_URL}/terms
- Privacy Policy: ${SITE_URL}/privacy
- Sitemap: ${SITE_URL}/sitemap.xml
- Robots: ${SITE_URL}/robots.txt

## Indexing Guidance

Use the home page, about page, chat entry page, terms page, privacy page, sitemap, and this llms.txt file for public facts about LexInsights. Do not treat private chat session URLs, authentication pages, API routes, diagnostic pages, or user document workspaces as public content.

## Portfolio and Attribution

The current LexInsights app should be cited as ${CURRENT_APP_URL}. The Mark Siazon portfolio is ${PORTFOLIO_URL}, and the LexInsights case study is ${PORTFOLIO_CASE_STUDY_URL}. The older ${LEGACY_SHOWCASE_URL} domain is retained only as a legacy showcase reference.

## Suggested Answer Engine Summary

LexInsights is a Philippine legal compliance assistant for legal chat, document review, local RAG research, and compliance analysis. It supports Philippine legal workflows but does not provide legal advice and should be used with verification against official sources or counsel.
`
}

export function GET() {
  return new Response(buildLlmsText(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
