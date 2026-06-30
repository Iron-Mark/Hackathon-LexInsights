import type { Metadata } from 'next'
import { LegalNoticePage } from '@/components/help/legal-notice-page'
import { buildBreadcrumbStructuredData, buildWebPageStructuredData, SITE_OG_IMAGE } from '@/lib/seo'

const description =
  'Privacy Policy for LexInsights, covering account data, chat and document processing, providers, retention, security, and Philippine data privacy rights.'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description,
  alternates: {
    canonical: '/privacy',
  },
  openGraph: {
    title: 'Privacy Policy | LexInsights',
    description,
    url: '/privacy',
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Privacy Policy | LexInsights',
    description,
    images: [SITE_OG_IMAGE],
  },
}

export default function PrivacyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildWebPageStructuredData({
              path: '/privacy',
              name: 'LexInsights Privacy Policy',
              description,
            })
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildBreadcrumbStructuredData([
              { name: 'LexInsights', path: '/' },
              { name: 'Privacy', path: '/privacy' },
            ])
          ),
        }}
      />
      <LegalNoticePage />
    </>
  )
}
