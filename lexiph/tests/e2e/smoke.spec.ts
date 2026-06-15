import { expect, test } from '@playwright/test'

const protectedRoutes = ['/chat', '/documents']
const isManagedLocalWebServer = !process.env.PLAYWRIGHT_BASE_URL
const ragBackendIssueUrl =
  process.env.NEXT_PUBLIC_RAG_BACKEND_ISSUE_URL ||
  'https://github.com/Iron-Mark/Hackathon-LexInsights/issues/1'
const authRouteHeading = /Sign in to LexInSight|Clerk setup required/
const signupRouteHeading = /Create your LexInSight account|Clerk setup required/

test.describe('LexInSight smoke checks', () => {
  test('public entry routes render', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('LexInSight').first()).toBeVisible()

    await page.goto('/auth/login')
    await expect(page.getByRole('heading', { name: authRouteHeading })).toBeVisible()

    await page.goto('/auth/login/sso-callback?sign_in_fallback_redirect_url=/chat')
    await expect(page.getByRole('heading', { name: authRouteHeading })).toBeVisible()

    await page.goto('/auth/signup/sso-callback?sign_up_fallback_redirect_url=/chat')
    await expect(page.getByRole('heading', { name: signupRouteHeading })).toBeVisible()

    await page.goto('/test-rag')
    await expect(page.getByRole('heading', { name: 'RAG API Test Page' })).toBeVisible()
  })

  test('missing Clerk keys show setup blocker', async ({ page }) => {
    test.skip(
      Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY),
      'Real Clerk keys are configured.'
    )

    await page.goto('/auth/login')

    await expect(page.getByRole('heading', { name: 'Clerk setup required' })).toBeVisible()
    await expect(page.getByText('Add Clerk publishable and secret keys')).toBeVisible()
  })

  for (const route of protectedRoutes) {
    test(`${route} redirects unauthenticated users to login`, async ({ page }) => {
      await page.goto(route)

      await expect(page.getByRole('heading', { name: authRouteHeading })).toBeVisible()
      await expect(page).toHaveURL(/\/auth\/login/)
    })
  }

  test('readiness endpoint exposes backend blocker state without secrets', async ({ request }) => {
    const target = isManagedLocalWebServer
      ? '/api/readiness?timeoutMs=2000&externalChecks=skip'
      : '/api/readiness?timeoutMs=2000'
    const response = await request.get(target)
    const body = await response.json()

    expect([200, 503]).toContain(response.status())
    expect(body).toEqual(
      expect.objectContaining({
        ready: expect.any(Boolean),
        checkedAt: expect.any(String),
        checks: expect.any(Array),
        summary: expect.any(String),
      })
    )

    const checkNames = body.checks.map((check: { name: string }) => check.name)

    expect(checkNames).toEqual(expect.arrayContaining([
      'supabase.url',
      'supabase.anon_key',
      'supabase.project_ref',
      'supabase.anon_key_format',
      'supabase.dns',
      'readiness.timeout_ms',
      'rag.direct_health',
      'rag.proxy_health',
    ]))

    if (isManagedLocalWebServer) {
      expect(response.status()).toBe(200)

      for (const name of ['supabase.dns', 'rag.dns', 'rag.direct_health', 'rag.proxy_health']) {
        expect(body.checks.find((check: { name: string }) => check.name === name)).toEqual(
          expect.objectContaining({
            name,
            status: 'skip',
            critical: false,
          })
        )
      }
    }

    const anonKeyFormatCheck = body.checks.find(
      (check: { name: string }) => check.name === 'supabase.anon_key_format'
    )
    expect(anonKeyFormatCheck).toEqual(
      expect.objectContaining({
        name: 'supabase.anon_key_format',
        status: expect.any(String),
      })
    )

    if (anonKeyFormatCheck.status === 'pass') {
      expect(checkNames).toContain('supabase.anon_key_project_ref')
    }

    const anonKeyCheck = body.checks.find((check: { name: string }) => check.name === 'supabase.anon_key')
    expect(anonKeyCheck).toEqual(
      expect.objectContaining({
        name: 'supabase.anon_key',
        status: expect.any(String),
      })
    )
    expect(anonKeyCheck).not.toHaveProperty('target')
    expect(anonKeyCheck).not.toHaveProperty('details')
  })

  test('version endpoint exposes deployment metadata without backend secrets', async ({ request }) => {
    const response = await request.get('/api/version?expectedSha=local-test')
    const body = await response.json()

    expect(response.status()).toBe(200)
    expect(body).toEqual(
      expect.objectContaining({
        app: 'LexInSight',
        packageVersion: expect.any(String),
        checkedAt: expect.any(String),
        source: expect.objectContaining({
          provider: expect.any(String),
          environment: expect.any(String),
        }),
        deployment: expect.any(Object),
        expected: expect.objectContaining({
          commitSha: 'local-test',
          matches: expect.any(Boolean),
        }),
      })
    )

    expect(JSON.stringify(body)).not.toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    expect(JSON.stringify(body)).not.toContain(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'ci-placeholder-not-set')
  })

  test('RAG proxy handles same-origin upstream responses without secrets', async ({ request }) => {
    const endpoint = isManagedLocalWebServer ? '/api/version?expectedSha=proxy-smoke' : '/api/research/health'
    const response = await request.get(`/api/rag-proxy?endpoint=${encodeURIComponent(endpoint)}&timeoutMs=1000`)
    const body = await response.json()

    if (isManagedLocalWebServer) {
      expect(response.status()).toBe(200)
      expect(body).toEqual(
        expect.objectContaining({
          app: 'LexInSight',
          expected: expect.objectContaining({
            commitSha: 'proxy-smoke',
            matches: expect.any(Boolean),
          }),
        })
      )
      expect(JSON.stringify(body)).not.toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY')
      expect(JSON.stringify(body)).not.toContain(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'ci-placeholder-not-set')
      return
    }

    expect([200, 502, 504]).toContain(response.status())

    if (!response.ok()) {
      expect(body).toEqual(
        expect.objectContaining({
          detail: expect.any(String),
          error: expect.objectContaining({
            type: expect.stringMatching(/^upstream_/),
            endpoint: '/api/research/health',
            upstreamOrigin: expect.any(String),
            timeoutMs: expect.any(Number),
          }),
        })
      )
      expect(body.error.timeoutMs).toBeGreaterThanOrEqual(500)
      expect(body.error.timeoutMs).toBeLessThanOrEqual(60000)
    }

    expect(JSON.stringify(body)).not.toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    expect(JSON.stringify(body)).not.toContain(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'ci-placeholder-not-set')
  })

  test('RAG proxy rejects cross-origin endpoint overrides', async ({ request }) => {
    const response = await request.get('/api/rag-proxy?endpoint=https://example.com/api/research/health')
    const body = await response.json()

    expect(response.status()).toBe(400)
    expect(body).toEqual(
      expect.objectContaining({
        detail: 'Endpoint must stay on the configured RAG API origin',
        error: expect.objectContaining({
          type: 'invalid_endpoint',
          endpoint: 'https://example.com/api/research/health',
        }),
      })
    )
    expect(JSON.stringify(body)).not.toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    expect(JSON.stringify(body)).not.toContain(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'ci-placeholder-not-set')
  })

  test('RAG proxy redacts upstream error bodies', async ({ request }) => {
    test.skip(!isManagedLocalWebServer, 'Uses the managed local app as the upstream.')

    const response = await request.get('/api/rag-proxy?endpoint=/missing-rag-upstream&timeoutMs=1000')
    const body = await response.json()
    const serializedBody = JSON.stringify(body)

    expect([404, 502, 504]).toContain(response.status())
    expect(body).toEqual(
      expect.objectContaining({
        detail: expect.any(String),
        error: expect.objectContaining({
          type: expect.stringMatching(/^upstream_/),
          endpoint: '/missing-rag-upstream',
          upstreamOrigin: expect.any(String),
          timeoutMs: expect.any(Number),
        }),
      })
    )

    if (body.error.type === 'upstream_http_error') {
      expect(body.detail).toBe(`RAG backend returned HTTP ${body.error.status}. Check server logs or readiness status.`)
    }

    expect(serializedBody).not.toContain('<html')
    expect(serializedBody).not.toContain('<!DOCTYPE')
    expect(serializedBody).not.toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    expect(serializedBody).not.toContain(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'ci-placeholder-not-set')
  })

  test('RAG backend failure shows replacement issue snackbar', async ({ page }) => {
    await page.route('**/api/rag-proxy**', async (route) => {
      await route.fulfill({
        status: 504,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'fetch failed',
          error: {
            type: 'upstream_timeout',
            endpoint: '/api/research/rag-summary',
            upstreamOrigin: 'https://devkada.resqlink.org',
            timeoutMs: 20000,
          },
        }),
      })
    })

    await page.goto('/test-rag')
    await page.getByLabel('Enter your question about Philippine legislation').fill('What is RA 9003?')
    await page.getByRole('button', { name: 'Submit Query' }).click()

    await expect(
      page.getByText('RAG backend is retired and needs replacement. Core app demo is still available.')
    ).toBeVisible()

    await expect(page.getByRole('link', { name: 'View GitHub issue' })).toHaveAttribute(
      'href',
      ragBackendIssueUrl
    )
  })
})
