import { expect, test, type Page } from '@playwright/test'

type PublicPageExpectation = {
  path: string
  heading: RegExp | string
  jsonLdTypes: string[]
}

const publicPages: PublicPageExpectation[] = [
  {
    path: '/about',
    heading: 'About LexInsights',
    jsonLdTypes: ['AboutPage', 'BreadcrumbList', 'Organization', 'WebSite', 'SoftwareApplication'],
  },
  {
    path: '/terms',
    heading: 'Terms of Service',
    jsonLdTypes: ['WebPage', 'BreadcrumbList', 'Organization', 'WebSite', 'SoftwareApplication'],
  },
  {
    path: '/privacy',
    heading: 'Privacy Policy',
    jsonLdTypes: ['WebPage', 'BreadcrumbList', 'Organization', 'WebSite', 'SoftwareApplication'],
  },
]

const expectedSitemapPaths = ['/', '/about', '/chat', '/terms', '/privacy']
const excludedSitemapPathPatterns = [/^\/api(\/|$)/, /^\/auth(\/|$)/, /^\/documents(\/|$)/, /^\/test-rag$/, /^\/test-document$/]

function collectJsonLdTypes(value: unknown): string[] {
  if (!value || typeof value !== 'object') {
    return []
  }

  const record = value as Record<string, unknown>
  const ownTypes = Array.isArray(record['@type'])
    ? record['@type'].filter((type): type is string => typeof type === 'string')
    : typeof record['@type'] === 'string'
      ? [record['@type']]
      : []

  return [
    ...ownTypes,
    ...Object.values(record).flatMap((child) => (
      Array.isArray(child)
        ? child.flatMap(collectJsonLdTypes)
        : collectJsonLdTypes(child)
    )),
  ]
}

function extractXmlValues(xml: string, tagName: string) {
  return Array.from(xml.matchAll(new RegExp(`<${tagName}>([^<]+)</${tagName}>`, 'g')), (match) => match[1])
}

async function readDiscoveryMetadata(page: Page) {
  return page.evaluate(() => {
    const jsonLd = Array.from(document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]'))
      .map((script) => JSON.parse(script.textContent || '{}') as unknown)

    return {
      canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href,
      description: document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content,
      ogTitle: document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content,
      ogDescription: document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content,
      ogUrl: document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.content,
      ogImage: document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content,
      twitterCard: document.querySelector<HTMLMetaElement>('meta[name="twitter:card"]')?.content,
      jsonLd,
    }
  })
}

async function expectNoMobileHorizontalOverflow(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 })

  await expect.poll(async () => page.evaluate(() => ({
    bodyScrollWidth: document.body.scrollWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }))).toEqual(expect.objectContaining({
    bodyScrollWidth: expect.any(Number),
    documentScrollWidth: expect.any(Number),
    viewportWidth: 390,
  }))

  const layout = await page.evaluate(() => ({
    bodyScrollWidth: document.body.scrollWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }))

  expect(Math.ceil(layout.bodyScrollWidth)).toBeLessThanOrEqual(layout.viewportWidth + 1)
  expect(Math.ceil(layout.documentScrollWidth)).toBeLessThanOrEqual(layout.viewportWidth + 1)
}

test.describe('public discovery smoke checks', () => {
  for (const publicPage of publicPages) {
    test(`${publicPage.path} exposes crawlable discovery metadata`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 })
      const response = await page.goto(publicPage.path, { waitUntil: 'domcontentloaded' })

      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: publicPage.heading, level: 1 })).toBeVisible()

      const metadata = await readDiscoveryMetadata(page)
      const canonicalUrl = new URL(metadata.canonical || '')
      const ogUrl = new URL(metadata.ogUrl || '')
      const ogImage = new URL(metadata.ogImage || '')
      const jsonLdTypes = new Set(metadata.jsonLd.flatMap(collectJsonLdTypes))

      expect(canonicalUrl.pathname).toBe(publicPage.path)
      expect(canonicalUrl.hash).toBe('')
      expect(ogUrl.pathname).toBe(publicPage.path)
      expect(ogImage.pathname).toBe('/og/lexinsights-og.png')
      expect(metadata.description).toEqual(expect.stringContaining('LexInsights'))
      expect(metadata.ogTitle).toEqual(expect.stringContaining('LexInsights'))
      expect(metadata.ogDescription).toEqual(expect.stringContaining('LexInsights'))
      expect(metadata.twitterCard).toBe('summary_large_image')

      for (const type of publicPage.jsonLdTypes) {
        expect(jsonLdTypes).toContain(type)
      }

      await expectNoMobileHorizontalOverflow(page)
    })
  }

  test('robots, llms, and ai text routes expose public discovery policy', async ({ request }) => {
    const robotsResponse = await request.get('/robots.txt')
    const robots = await robotsResponse.text()

    expect(robotsResponse.status()).toBe(200)
    expect(robotsResponse.headers()['content-type']).toContain('text/plain')
    expect(robots).toContain('User-Agent: *')
    expect(robots).toContain('Allow: /about')
    expect(robots).toContain('Allow: /terms')
    expect(robots).toContain('Allow: /privacy')
    expect(robots).toContain('Allow: /llms.txt')
    expect(robots).toContain('Allow: /ai.txt')
    expect(robots).toContain('Disallow: /api/')
    expect(robots).toContain('Disallow: /auth/login')
    expect(robots).toContain('Sitemap: ')
    expect(robots).toContain('/sitemap.xml')

    const llmsResponse = await request.get('/llms.txt')
    const llms = await llmsResponse.text()

    expect(llmsResponse.status()).toBe(200)
    expect(llmsResponse.headers()['content-type']).toContain('text/plain')
    expect(llms).toContain('# LexInsights')
    expect(llms).toContain('## What LexInsights Is')
    expect(llms).toContain('## Public Pages')
    expect(llms).toContain('/about')
    expect(llms).toContain('/terms')
    expect(llms).toContain('/privacy')

    const aiResponse = await request.get('/ai.txt', { maxRedirects: 0 })
    const ai = await aiResponse.text()

    expect(aiResponse.status()).toBe(200)
    expect(aiResponse.headers()['content-type']).toContain('text/plain')
    expect(ai).toContain('# LexInsights')
    expect(ai).toContain('## What LexInsights Is')
    expect(ai).toContain('## Public Pages')
  })

  test('sitemap lists stable public URLs without dynamic lastmod values', async ({ request }) => {
    const firstResponse = await request.get('/sitemap.xml')
    const firstSitemap = await firstResponse.text()
    const secondResponse = await request.get('/sitemap.xml')
    const secondSitemap = await secondResponse.text()

    expect(firstResponse.status()).toBe(200)
    expect(firstResponse.headers()['content-type']).toMatch(/xml/)
    expect(secondResponse.status()).toBe(200)
    expect(secondSitemap).toBe(firstSitemap)

    const locs = extractXmlValues(firstSitemap, 'loc')
    const paths = locs.map((loc) => new URL(loc).pathname)

    expect(paths).toEqual(expectedSitemapPaths)

    for (const pattern of excludedSitemapPathPatterns) {
      expect(paths.some((path) => pattern.test(path))).toBe(false)
    }

    const lastModifiedValues = extractXmlValues(firstSitemap, 'lastmod')

    if (lastModifiedValues.length > 0) {
      expect(lastModifiedValues).toHaveLength(locs.length)
    }

    const now = Date.now()
    const nearNowWindowMs = 15 * 60 * 1000

    for (const lastModified of lastModifiedValues) {
      const timestamp = Date.parse(lastModified)

      expect(Number.isNaN(timestamp)).toBe(false)
      expect(timestamp).toBeLessThanOrEqual(now + 60_000)
      expect(Math.abs(now - timestamp)).toBeGreaterThan(nearNowWindowMs)
    }
  })
})
