import type { Metadata } from 'next'

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
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/chat?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
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
