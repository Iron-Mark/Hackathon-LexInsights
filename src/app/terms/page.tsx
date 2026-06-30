import type { Metadata } from 'next'
import { LegalNoticePage } from '@/components/help/legal-notice-page'
import { buildBreadcrumbStructuredData, buildWebPageStructuredData, SITE_OG_IMAGE } from '@/lib/seo'

const description =
  'Terms of Service for LexInsights, covering public use, generated output, user content, acceptable use, and Philippine governing law.'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description,
  alternates: {
    canonical: '/terms',
  },
  openGraph: {
    title: 'Terms of Service | LexInsights',
    description,
    url: '/terms',
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Terms of Service | LexInsights',
    description,
    images: [SITE_OG_IMAGE],
  },
}

export default function TermsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildWebPageStructuredData({
              path: '/terms',
              name: 'LexInsights Terms of Service',
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
              { name: 'Terms', path: '/terms' },
            ])
          ),
        }}
      />
      <LegalNoticePage
        title="Terms of Service"
        eyebrow="Public service terms"
        description="Rules for accessing LexInsights, submitting user content, reviewing generated output, acceptable use, availability, and Philippine governing law."
      />
    </>
  )
}
