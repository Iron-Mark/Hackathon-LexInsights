import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/seo'

const RELEASE_LAST_MODIFIED = new Date('2026-07-01T00:00:00+08:00')
const LEGAL_LAST_MODIFIED = new Date('2026-06-27T00:00:00+08:00')

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: RELEASE_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: RELEASE_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: LEGAL_LAST_MODIFIED,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: LEGAL_LAST_MODIFIED,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
  ]
}
