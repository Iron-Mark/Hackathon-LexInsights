import { expect, test, type Page } from '@playwright/test'

const protectedRoutes = ['/documents']
const isManagedLocalWebServer = !process.env.PLAYWRIGHT_BASE_URL
const diagnosticsExpected = isManagedLocalWebServer || process.env.ENABLE_DIAGNOSTIC_ROUTES === 'true'
const authRouteHeading = /Sign in to LexInSight|Clerk setup required/
const signupRouteHeading = /Create your LexInSight account|Clerk setup required/

function authAction(page: Page, name: 'Sign in' | 'Sign up') {
  return page
    .getByRole('button', { name, exact: true })
    .or(page.getByRole('link', { name, exact: true }))
    .first()
}

test.describe('LexInSight smoke checks', () => {
  test('public entry routes render', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('LexInSight').first()).toBeVisible()
    await expect(authAction(page, 'Sign in')).toBeVisible()
    await expect(authAction(page, 'Sign up')).toBeVisible()
    await expect(page.getByPlaceholder('Ask me anything about Philippine legal compliance...')).toBeVisible()
    await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible()
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.getByRole('button', { name: 'Switch to light mode' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.getByRole('button', { name: 'Help & Resources' }).click()
    await expect(page.getByRole('dialog', { name: 'Philippine Government Resources' })).toBeVisible()
    await expect(page.getByText('Official Gazette - Laws and Issuances')).toBeVisible()
    await page.keyboard.press('Escape')

    await page.goto('/auth/login')
    await expect(page.getByRole('heading', { name: authRouteHeading })).toBeVisible()

    await page.goto('/auth/login/sso-callback?sign_in_fallback_redirect_url=/chat')
    await expect(page.getByRole('heading', { name: authRouteHeading })).toBeVisible()

    await page.goto('/auth/signup/sso-callback?sign_up_fallback_redirect_url=/chat')
    await expect(page.getByRole('heading', { name: signupRouteHeading })).toBeVisible()

    if (diagnosticsExpected) {
      await page.goto('/test-rag')
      await expect(page.getByRole('heading', { name: 'RAG API Test Interface' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Connect WebSocket' })).toBeVisible()

      await page.goto('/test-document')
      await expect(page.getByRole('heading', { name: 'Document Compliance Test Page' })).toBeVisible()
    }
  })

  test('chat is available to signed-out visitors with local guest history', async ({ page }) => {
    await page.goto('/chat')

    await expect(page.getByText('LexInSight').first()).toBeVisible()
    await expect(authAction(page, 'Sign in')).toBeVisible()
    await expect(page.getByPlaceholder('Ask me anything about Philippine legal compliance...')).toBeVisible()

    await page.getByRole('button', { name: /^New Chat$/ }).click()
    await expect(page).toHaveURL(/\/chat\/guest_/)

    const guestPayload = await page.evaluate(() => window.localStorage.getItem('lexinsight_guest_chats_v1'))
    expect(guestPayload).toBeTruthy()
    expect(JSON.parse(guestPayload || '{}')).toEqual(
      expect.objectContaining({
        version: 1,
        chats: expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringMatching(/^guest_/),
            user_id: 'guest-local',
          }),
        ]),
      })
    )
  })

  test('public chat answers end-to-end without external AI', async ({ page }) => {
    const query = 'Explain RA 9003 Solid Waste Management Act'

    await page.goto('/')
    await page.getByPlaceholder('Ask me anything about Philippine legal compliance...').fill(query)
    await page.keyboard.press('Enter')

    await expect(page.getByRole('main').getByText(query, { exact: true })).toBeVisible()
    await expect(page.getByRole('status', { name: /Thinking|Checking legal context|Drafting answer/ })).toBeVisible()
    await expect(page.locator('[data-revealing="true"]').first()).toBeVisible()

    const completedAssistantMessage = page
      .locator('[data-revealing="false"]')
      .filter({ hasText: 'Providerless Local Research Brief' })

    await expect(completedAssistantMessage).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'Providerless Local Research Brief' })).toBeVisible()
    await expect(page.getByText('Ecological Solid Waste Management Act of 2000')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Run deep research' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send standard message' })).toBeVisible()

    const guestPayloadHandle = await page.waitForFunction(() => {
      const raw = window.localStorage.getItem('lexinsight_guest_chats_v1')

      if (!raw) {
        return null
      }

      const payload = JSON.parse(raw) as {
        messages?: Record<string, Array<{ role: string; content: string }>>
      }
      const messageLists = Object.values(payload.messages || {})

      return messageLists.some((messages) => (
        Array.isArray(messages) &&
        messages.some((message) => message.role === 'user') &&
        messages.some((message) => (
          message.role === 'assistant' &&
          message.content.includes('Providerless Local Research Brief')
        ))
      ))
        ? raw
        : null
    })
    const guestPayload = JSON.parse(String(await guestPayloadHandle.jsonValue())) as {
      chats: Array<{ id: string; user_id: string }>
      messages: Record<string, Array<{ role: string; content: string }>>
    }

    expect(guestPayload.chats[0]).toEqual(
      expect.objectContaining({
        id: expect.stringMatching(/^guest_/),
        user_id: 'guest-local',
      })
    )
    expect(Object.values(guestPayload.messages).some((messages) => messages.length >= 2)).toBe(true)
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

    if (anonKeyFormatCheck) {
      expect(anonKeyFormatCheck).toEqual(
        expect.objectContaining({
          name: 'supabase.anon_key_format',
          status: expect.any(String),
        })
      )
    }

    if (anonKeyFormatCheck?.status === 'pass') {
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

  test('PWA manifest and service worker are install-ready', async ({ request }) => {
    const manifestResponse = await request.get('/manifest.webmanifest')
    const manifest = await manifestResponse.json()

    expect(manifestResponse.status()).toBe(200)
    expect(manifest).toEqual(
      expect.objectContaining({
        name: 'LexInSight',
        short_name: 'LexInSight',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#FFFFFF',
        theme_color: '#3F33BD',
      })
    )
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        }),
        expect.objectContaining({
          src: '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        }),
        expect.objectContaining({
          src: '/icons/maskable-512x512.png',
          sizes: '512x512',
          purpose: 'maskable',
        }),
      ])
    )

    const serviceWorkerResponse = await request.get('/sw.js')
    const serviceWorker = await serviceWorkerResponse.text()

    expect(serviceWorkerResponse.status()).toBe(200)
    expect(serviceWorkerResponse.headers()['content-type']).toContain('application/javascript')
    expect(serviceWorkerResponse.headers()['cache-control']).toContain('no-cache')
    expect(serviceWorkerResponse.headers()['service-worker-allowed']).toBe('/')
    expect(serviceWorkerResponse.headers()['x-content-type-options']).toBe('nosniff')
    expect(serviceWorker).toContain("self.addEventListener('install'")
    expect(serviceWorker).toContain("self.addEventListener('fetch'")
    expect(serviceWorker).toContain("event.request.mode === 'navigate'")
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

  test('RAG backend failure returns providerless local research', async ({ page }) => {
    test.skip(!diagnosticsExpected, 'Diagnostic routes are disabled for this server.')

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
    await page.getByRole('button', { name: 'Test RAG' }).click()

    await expect(page.getByText('Providerless local mode generated this result.')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'API Response' })).toBeVisible()

    const summary = page.locator('pre').filter({ hasText: '# Providerless Local Research Brief' })
    await expect(summary).toContainText('RA 9003')
    await expect(summary).toContainText('Ecological Solid Waste Management Act of 2000')
  })

  test('Markdown document upload returns compliance analysis', async ({ page }) => {
    test.skip(!diagnosticsExpected, 'Diagnostic routes are disabled for this server.')

    await page.goto('/test-document')
    await page.setInputFiles('#document-upload', {
      name: 'sample-barangay-registry.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from(`# Barangay Resident Registry Ordinance

## Purpose
Create a registry of residents for local services.

## Requirements
All residents shall submit name, address, phone number, government ID number, and health status.

## Penalties
Failure to submit shall be fined PHP 5,000 and may result in suspension of barangay clearance.

## Reporting
The barangay office shall submit monthly registry reports.`),
    })

    await page.getByRole('button', { name: 'Analyze Document' }).click()

    await expect(page.getByRole('heading', { name: 'Compliance Analysis Complete' })).toBeVisible()
    await expect(page.getByText('Browser text/Markdown')).toBeVisible()
    await expect(page.getByText('Score')).toBeVisible()
    await expect(page.getByText('Red', { exact: true })).toBeVisible()
  })
})
