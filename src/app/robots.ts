import type { MetadataRoute } from 'next'

import { PUBLIC_ROUTES, SITE_URL } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: PUBLIC_ROUTES,
      disallow: [
        '/api/',
        '/auth/callback',
        '/auth/login',
        '/auth/signup',
        '/auth/verify-email',
        '/chat/*',
        '/documents',
        '/test-document',
        '/test-rag',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
