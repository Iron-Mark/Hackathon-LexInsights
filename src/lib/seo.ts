import type { Metadata } from 'next'

import { DEMO_VIDEO, EVENT_GALLERY } from './event-media'

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lexiph.vercel.app'
export const SITE_NAME = 'LexInsights'
export const SITE_TITLE = 'LexInsights - Philippine Legal Compliance Assistant'
export const SITE_DESCRIPTION =
  'LexInsights is a Philippine legal research and compliance assistant for legal chat, document review, local RAG research, and compliance analysis.'
export const SITE_OG_IMAGE = '/og/lexinsights-og.png'

export const CURRENT_APP_URL = SITE_URL
export const LEGACY_SHOWCASE_URL = 'https://lexinsights.vercel.app'
export const REPOSITORY_URL = 'https://github.com/Iron-Mark/Hackathon-LexInsights'
export const PORTFOLIO_URL = 'https://www.marksiazon.dev'
export const PORTFOLIO_CASE_STUDY_URL = 'https://www.marksiazon.dev/projects/lexinsights'
// CodeKada 2025 pitch/demo video, hosted on YouTube. The Facebook event link
// does not host the recording, so these are the canonical links to it.
export const DEMO_VIDEO_ID = 'Mqj4ABPXUS8'
export const DEMO_VIDEO_URL = `https://www.youtube.com/watch?v=${DEMO_VIDEO_ID}`
export const DEMO_VIDEO_EMBED_URL = `https://www.youtube.com/embed/${DEMO_VIDEO_ID}`
export const DEMO_VIDEO_THUMBNAIL_URL = `https://i.ytimg.com/vi/${DEMO_VIDEO_ID}/maxresdefault.jpg`

export const PHILIPPINE_COMPLIANCE_TOPICS = [
  'data privacy',
  'cybercrime',
  'anti-money laundering',
  'child online safety',
  'consumer protection',
  'labor and employment',
  'tax and finance',
  'corporate governance',
  'environmental compliance',
  'public procurement',
]

export const PUBLIC_ROUTES = ['/', '/about', '/chat', '/terms', '/privacy', '/llms.txt', '/ai.txt']

export const NO_INDEX_ROBOTS: Metadata['robots'] = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
}

export function absoluteUrl(path = '/') {
  return new URL(path, SITE_URL).toString()
}

export function buildBaseStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: absoluteUrl('/logo/LOGO-0.5-woBG.svg'),
        sameAs: [REPOSITORY_URL, PORTFOLIO_URL, PORTFOLIO_CASE_STUDY_URL],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        inLanguage: 'en-PH',
        publisher: {
          '@id': `${SITE_URL}/#organization`,
        },
        description: SITE_DESCRIPTION,
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE_URL}/#app`,
        name: SITE_NAME,
        alternateName: 'Philippine legal compliance assistant',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: SITE_URL,
        termsOfService: absoluteUrl('/terms'),
        privacyPolicy: absoluteUrl('/privacy'),
        description: SITE_DESCRIPTION,
        inLanguage: 'en-PH',
        isAccessibleForFree: true,
        areaServed: {
          '@type': 'Country',
          name: 'Philippines',
        },
        publisher: {
          '@id': `${SITE_URL}/#organization`,
        },
        featureList: [
          'Philippine legal chat',
          'Document review',
          'Local providerless RAG research',
          'Compliance report generation',
          'Citation and source support',
        ],
      },
    ],
  }
}

export const COVERAGE_FACTS = {
  authorities: 271,
  sources: 13,
  frameworks: 45,
  // Curated authority relations (distinct source/target/type triples, excluding
  // the auto-generated per-framework workflow edges). Matches the value derived
  // in local-research-data/coverage-summary.ts so all surfaces agree.
  relations: 180,
}

export const FAQ_ITEMS: Array<{ question: string; answer: string }> = [
  {
    question: 'Is LexInsights legal advice?',
    answer:
      'No. LexInsights is a research aid, not a lawyer, law firm, court, regulator, or official government source. Verify output against official sources and qualified counsel.',
  },
  {
    question: 'Is LexInsights free to use?',
    answer:
      'Yes. It is guest-first with free entry, and its default local providerless research runs without an external AI provider.',
  },
  {
    question: 'What Philippine laws does LexInsights cover?',
    answer:
      'A bundled corpus of 271 legal authorities across 13 official source families and 45 compliance frameworks, including RA 10173 (Data Privacy Act), RA 10175 (Cybercrime Prevention Act), and RA 9160 (AMLA).',
  },
  {
    question: 'Does LexInsights invent or hallucinate citations?',
    answer:
      'In its default local providerless mode it uses deterministic retrieval with no generative model, so it cites named authorities from its corpus or reports that it found none.',
  },
  {
    question: 'What is the Data Privacy Act of 2012 (RA 10173)?',
    answer:
      'The Philippine law governing the processing of personal information, enforced by the National Privacy Commission (NPC).',
  },
  {
    question: 'Can I rely on LexInsights output for court filings?',
    answer:
      'Only as a research aid. The Philippine Supreme Court framework A.M. No. 25-11-28-SC requires disclosure of AI use and keeps the filer responsible for the work.',
  },
]

export function buildFaqStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/#faq`,
    inLanguage: 'en-PH',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

export const KEY_STATUTES: Array<{ code: string; title: string; url: string }> = [
  {
    code: 'RA 10173',
    title: 'Data Privacy Act of 2012',
    url: 'https://privacy.gov.ph/data-privacy-act/',
  },
  {
    code: 'RA 10175',
    title: 'Cybercrime Prevention Act of 2012',
    url: 'https://lawphil.net/statutes/repacts/ra2012/ra_10175_2012.html',
  },
  {
    code: 'RA 9160',
    title: 'Anti-Money Laundering Act of 2001',
    url: 'https://www.amlc.gov.ph/laws/money-laundering/2015-10-16-02-50-56/republic-act-9160',
  },
  {
    code: 'RA 9775',
    title: 'Anti-Child Pornography Act of 2009',
    url: 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/16874',
  },
  {
    code: 'RA 9003',
    title: 'Ecological Solid Waste Management Act of 2000',
    url: 'https://lawphil.net/statutes/repacts/ra2001/ra_9003_2001.html',
  },
]

export function buildWebPageStructuredData({
  path,
  name,
  description,
}: {
  path: string
  name: string
  description: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${absoluteUrl(path)}#webpage`,
    url: absoluteUrl(path),
    name,
    description,
    inLanguage: 'en-PH',
    isPartOf: {
      '@id': `${SITE_URL}/#website`,
    },
    publisher: {
      '@id': `${SITE_URL}/#organization`,
    },
  }
}

export function buildBreadcrumbStructuredData(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

export function buildProjectStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${PORTFOLIO_URL}/#mark-siazon`,
        name: 'Mark Siazon',
        url: PORTFOLIO_URL,
        jobTitle: 'Product designer and full-stack developer',
        sameAs: [PORTFOLIO_CASE_STUDY_URL],
      },
      {
        '@type': 'AboutPage',
        '@id': `${absoluteUrl('/about')}#webpage`,
        url: absoluteUrl('/about'),
        name: 'About LexInsights',
        description:
          'Project profile for LexInsights, a Philippine legal compliance assistant with public repository, portfolio case study, and legacy showcase reference.',
        inLanguage: 'en-PH',
        isPartOf: {
          '@id': `${SITE_URL}/#website`,
        },
        about: {
          '@id': `${SITE_URL}/#app`,
        },
      },
      {
        '@type': 'SoftwareSourceCode',
        '@id': `${REPOSITORY_URL}#source-code`,
        name: 'Hackathon-LexInsights',
        codeRepository: REPOSITORY_URL,
        programmingLanguage: ['TypeScript', 'TSX'],
        runtimePlatform: 'Next.js',
        about: {
          '@id': `${SITE_URL}/#app`,
        },
        maintainer: {
          '@id': `${PORTFOLIO_URL}/#mark-siazon`,
        },
        contributor: [
          {
            '@type': 'Person',
            name: 'Jam Emmanuel Villarosa',
            sameAs: 'https://ph.linkedin.com/in/jamthedev2004',
          },
          {
            '@type': 'Person',
            name: 'Ken Patrick Garcia',
            sameAs: 'https://ph.linkedin.com/in/ken-patrick-garcia',
          },
          {
            '@type': 'Person',
            '@id': `${PORTFOLIO_URL}/#mark-siazon`,
            name: 'Mark Siazon',
            url: PORTFOLIO_URL,
          },
          {
            '@type': 'Person',
            name: 'Ashlyn Jam Torres',
            sameAs: 'https://ph.linkedin.com/in/ashlyn-torres-120354329',
          },
        ],
      },
    ],
  }
}

export function buildEventMediaStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'VideoObject',
        '@id': `${SITE_URL}/#demo-video`,
        name: DEMO_VIDEO.name,
        description: DEMO_VIDEO.description,
        thumbnailUrl: [DEMO_VIDEO_THUMBNAIL_URL, absoluteUrl(DEMO_VIDEO.thumbnail)],
        uploadDate: DEMO_VIDEO.uploadDate,
        url: DEMO_VIDEO_URL,
        embedUrl: DEMO_VIDEO_EMBED_URL,
        inLanguage: 'en-PH',
        publisher: {
          '@id': `${SITE_URL}/#organization`,
        },
        about: {
          '@id': `${SITE_URL}/#app`,
        },
      },
      {
        '@type': 'ImageGallery',
        '@id': `${SITE_URL}/#event-gallery`,
        name: 'LexInsights at CodeKada 2025',
        description:
          'Event photos of the LexInsights team building and pitching their Philippine legal compliance assistant at DevKada CodeKada 2025.',
        inLanguage: 'en-PH',
        isPartOf: {
          '@id': `${SITE_URL}/#website`,
        },
        about: {
          '@id': `${SITE_URL}/#app`,
        },
        image: EVENT_GALLERY.map((img) => ({
          '@type': 'ImageObject',
          contentUrl: absoluteUrl(img.src),
          url: absoluteUrl(img.src),
          caption: img.caption,
          description: img.alt,
          creditText: SITE_NAME,
        })),
      },
    ],
  }
}
