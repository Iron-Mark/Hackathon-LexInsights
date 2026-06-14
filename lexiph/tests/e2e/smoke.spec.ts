import { expect, test } from '@playwright/test'

const protectedRoutes = ['/chat', '/documents']

test.describe('LexInSight smoke checks', () => {
  test('public entry routes render', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('LexInSight').first()).toBeVisible()

    await page.goto('/auth/login')
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()

    await page.goto('/test-rag')
    await expect(page.getByRole('heading', { name: 'RAG API Test Page' })).toBeVisible()
  })

  for (const route of protectedRoutes) {
    test(`${route} redirects unauthenticated users to login`, async ({ page }) => {
      await page.goto(route)

      await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
      await expect(page).toHaveURL(/\/auth\/login/)
    })
  }

  test('readiness endpoint exposes backend blocker state without secrets', async ({ request }) => {
    const response = await request.get('/api/readiness?timeoutMs=2000')
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

  test('RAG proxy returns structured blocker errors without secrets', async ({ request }) => {
    const response = await request.get('/api/rag-proxy?endpoint=/api/research/health&timeoutMs=1000')
    const body = await response.json()

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
})
