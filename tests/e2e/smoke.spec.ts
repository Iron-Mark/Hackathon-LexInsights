import { expect, test, type Page } from '@playwright/test'

const protectedRoutes = ['/documents']
const isManagedLocalWebServer = !process.env.PLAYWRIGHT_BASE_URL
const diagnosticsExpected = isManagedLocalWebServer || process.env.ENABLE_DIAGNOSTIC_ROUTES === 'true'
const authRouteHeading = /Sign in to LexInsights|Account sign-in is unavailable/
const signupRouteHeading = /Create your LexInsights account|Account sign-in is unavailable/

function authAction(page: Page, name: 'Sign in' | 'Sign up') {
  return page
    .getByRole('button', { name, exact: true })
    .or(page.getByRole('link', { name, exact: true }))
    .first()
}

function chatInput(page: Page) {
  return page.getByRole('textbox', { name: /Ask about (PH law|Philippine law|Philippine legal compliance)/ })
}

function chatHistory(page: Page) {
  return page.getByRole('navigation', { name: 'Chat history' })
}

function collapseChatHistoryButton(page: Page) {
  return chatHistory(page).getByRole('button', { name: 'Collapse chat history' })
}

test.describe('LexInsights smoke checks', () => {
  test('public entry routes render', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('LexInsights').first()).toBeVisible()
    await expect(authAction(page, 'Sign in')).toBeVisible()
    await expect(authAction(page, 'Sign up')).toBeVisible()
    await expect(chatInput(page)).toBeVisible()
    const brandMetadata = await page.evaluate(() => ({
      iconHrefs: Array.from(
        document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
      ).map((link) => link.href),
      openGraphImage: document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content,
      twitterImage: document.querySelector<HTMLMetaElement>('meta[name="twitter:image"]')?.content,
    }))

    expect(brandMetadata.iconHrefs).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\/favicon\.ico$/),
      ])
    )
    expect(brandMetadata.openGraphImage).toMatch(/\/og\/lexinsights-og\.png$/)
    expect(brandMetadata.twitterImage).toMatch(/\/og\/lexinsights-og\.png$/)
    await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible()
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.getByRole('button', { name: 'Switch to light mode' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.getByRole('button', { name: 'Help & Resources' }).click()
    await expect(page.getByRole('dialog', { name: 'Help & Resources' })).toBeVisible()
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

    await expect(page.getByText('LexInsights').first()).toBeVisible()
    await expect(authAction(page, 'Sign in')).toBeVisible()
    await expect(chatInput(page)).toBeVisible()
    await expect(collapseChatHistoryButton(page)).toBeVisible()
    await collapseChatHistoryButton(page).click()
    await expect(collapseChatHistoryButton(page)).toBeHidden()

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

  test('mobile web app opens on the assistant without layout overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/chat')

    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), there/ })).toBeVisible()
    await expect(chatInput(page)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open sidebar menu' })).toBeVisible()
    await expect.poll(async () => {
      return page.evaluate(() => {
        const history = document.querySelector<HTMLElement>('[aria-label="Chat history"]')

        return Math.round(history?.getBoundingClientRect().right ?? 999)
      })
    }).toBeLessThanOrEqual(1)

    const initialLayout = await page.evaluate(() => {
      const history = document.querySelector<HTMLElement>('[aria-label="Chat history"]')
      const main = document.querySelector<HTMLElement>('main')
      const menuButton = document.querySelector<HTMLElement>('[aria-label="Open sidebar menu"]')

      return {
        historyRight: history?.getBoundingClientRect().right ?? null,
        mainLeft: main?.getBoundingClientRect().left ?? null,
        menuTop: menuButton?.getBoundingClientRect().top ?? null,
        menuLeft: menuButton?.getBoundingClientRect().left ?? null,
        hasHorizontalOverflow:
          document.documentElement.scrollWidth > window.innerWidth ||
          document.body.scrollWidth > window.innerWidth,
      }
    })

    expect(initialLayout.historyRight).not.toBeNull()
    expect(initialLayout.historyRight as number).toBeLessThanOrEqual(1)
    expect(initialLayout.mainLeft).toBe(0)
    expect(initialLayout.menuTop as number).toBeGreaterThanOrEqual(0)
    expect(initialLayout.menuLeft as number).toBeGreaterThanOrEqual(0)
    expect(initialLayout.hasHorizontalOverflow).toBe(false)

    await page.getByRole('button', { name: 'Open sidebar menu' }).click()
    await expect(collapseChatHistoryButton(page)).toBeVisible()
    await page.evaluate(() => {
      const installPromptEvent = new Event('beforeinstallprompt', { cancelable: true })

      Object.assign(installPromptEvent, {
        prompt: () => Promise.resolve(),
        userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
      })

      window.dispatchEvent(installPromptEvent)
    })
    await expect(page.getByRole('button', { name: 'Install LexInsights' })).toBeVisible()
    await collapseChatHistoryButton(page).click()
    await expect.poll(async () => {
      return page.evaluate(() => {
        const history = document.querySelector<HTMLElement>('[aria-label="Chat history"]')

        return Math.round(history?.getBoundingClientRect().right ?? 999)
      })
    }).toBeLessThanOrEqual(1)
  })

  test('chat citations open saved local provenance without changing normal links', async ({ page }) => {
    const chatId = 'guest_citation_smoke'

    await page.addInitScript((seedChatId) => {
      const now = '2026-06-25T00:00:00.000Z'

      window.localStorage.setItem('lexinsight_guest_chats_v1', JSON.stringify({
        version: 1,
        chats: [
          {
            id: seedChatId,
            title: 'Citation smoke',
            mode: 'general',
            created_at: now,
            updated_at: now,
            user_id: 'guest-local',
            message_count: 2,
            last_message_preview: 'RA 11898 citation smoke',
          },
        ],
        messages: {
          [seedChatId]: [
            {
              id: 'guest_citation_user',
              role: 'user',
              content: 'Explain RA 11898 and RA 999999.',
              created_at: now,
            },
            {
              id: 'guest_citation_assistant',
              role: 'assistant',
              content: 'RA 11898 is the Extended Producer Responsibility law. See [Official Gazette](https://www.officialgazette.gov.ph/) for official issuances. R.A. No. 11898 should expose saved provenance. Multiple citations stay interactive: RA 11898, RA 11898, and RA 11898. RA 999999 should not invent details.',
              created_at: now,
              metadata: {
                ragResponse: {
                  status: 'completed',
                  query: 'Explain RA 11898 and RA 999999.',
                  summary: 'RA 11898 is the Extended Producer Responsibility law.',
                  search_queries_used: ['RA 11898'],
                  documents_found: 1,
                  provider_mode: 'local-providerless',
                  confidence_score: 0.95,
                  retrieval_metadata: {
                    result_limit: 5,
                    total_candidates: 1,
                    top_score: 12.5,
                    score_threshold: 1.5,
                    citation_numbers: ['11898', '999999'],
                    known_citation_numbers: ['11898'],
                    unknown_citation_numbers: ['999999'],
                  },
                  matched_documents: [
                    {
                      title: 'RA 11898 - Extended Producer Responsibility Act of 2022',
                      statute: 'RA 11898',
                      source_name: 'Official Gazette',
                      source_url: 'https://www.officialgazette.gov.ph/2022/07/23/republic-act-no-11898/',
                      relevance_score: 0.95,
                      matched_terms: ['explicit citation: RA 11898'],
                      support_level: 'direct',
                      authority_type: 'statute',
                      source_tier: 'official',
                      source_last_verified: '2026-06-01',
                      provenance_status: 'verified',
                      evidence_anchors: [
                        {
                          label: 'EPR obligations',
                          supports: ['obligations'],
                          note: 'Identifies EPR registration and recovery obligations.',
                        },
                      ],
                      related_authorities: [
                        {
                          statute: 'RA 9003',
                          title: 'Ecological Solid Waste Management Act of 2000',
                          relation_type: 'amends',
                          label: 'Amends solid waste law',
                        },
                      ],
                      supporting_fields: ['citation', 'summary'],
                    },
                  ],
                },
              },
            },
          ],
        },
      }))
    }, chatId)

    await page.goto(`/chat/${chatId}`)

    const assistantMessage = page
      .locator('[data-chat-content]')
      .filter({ hasText: 'Extended Producer Responsibility law' })
      .last()

    await expect(assistantMessage).toBeVisible()
    await expect(assistantMessage.getByRole('link', { name: 'Official Gazette' })).toHaveAttribute(
      'href',
      'https://www.officialgazette.gov.ph/'
    )

    const knownCitation = assistantMessage
      .getByRole('button', { name: 'Open citation details for RA 11898' })
      .first()
    await expect(assistantMessage.getByRole('button', { name: 'Open citation details for RA 11898' })).toHaveCount(5)

    await expect(knownCitation).toBeVisible()
    await knownCitation.focus()
    await expect(page.locator('[data-citation-preview="11898"]').first()).toBeVisible()

    await page.keyboard.press('Enter')

    const knownDialog = page.getByRole('dialog', { name: 'RA 11898' })
    await expect(knownDialog).toBeVisible()
    await expect(knownDialog).toContainText('Extended Producer Responsibility Act of 2022')
    await expect(knownDialog).toContainText('official')
    await expect(knownDialog).toContainText('Verified 2026-06-01')
    await expect(knownDialog).toContainText('Matched Signals')
    await expect(knownDialog).toContainText('explicit citation: RA 11898')
    await expect(knownDialog).toContainText('EPR obligations')
    await expect(knownDialog.getByRole('link', { name: /Open official source/ })).toHaveAttribute(
      'href',
      'https://www.officialgazette.gov.ph/2022/07/23/republic-act-no-11898/'
    )
    await page.keyboard.press('Escape')
    await expect(knownDialog).toBeHidden()

    await page.setViewportSize({ width: 390, height: 844 })

    const unknownCitation = assistantMessage
      .getByRole('button', { name: 'Open citation details for RA 999999' })
      .first()
    await unknownCitation.click()

    const unknownDialog = page.getByRole('dialog', { name: 'RA 999999' })
    await expect(unknownDialog).toBeVisible()
    await expect(unknownDialog).toContainText('does not have it in the bundled providerless corpus')
    await expect(unknownDialog).toContainText('should not invent provenance')

    const mobileDialogLayout = await unknownDialog.evaluate((dialog) => {
      const box = dialog.getBoundingClientRect()

      return {
        bottomGap: Math.round(window.innerHeight - box.bottom),
        widthFits: box.width <= window.innerWidth,
        hasHorizontalOverflow:
          document.documentElement.scrollWidth > window.innerWidth ||
          document.body.scrollWidth > window.innerWidth,
      }
    })

    expect(mobileDialogLayout.bottomGap).toBeLessThanOrEqual(8)
    expect(mobileDialogLayout.widthFits).toBe(true)
    expect(mobileDialogLayout.hasHorizontalOverflow).toBe(false)
  })

  test('service worker serves mobile offline fallback after install', async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/chat')

    await expect(chatInput(page)).toBeVisible()

    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })

      await navigator.serviceWorker.ready

      if (!navigator.serviceWorker.controller) {
        await new Promise<void>((resolve) => {
          navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })
          registration.active?.postMessage({ type: 'SKIP_WAITING' })
        })
      }
    })

    await context.setOffline(true)
    await page.goto('/offline-smoke-route', { waitUntil: 'domcontentloaded', timeout: 10_000 })

    await expect(page.getByRole('heading', { name: 'You are offline' })).toBeVisible()
    await expect(page.getByText('Offline mode')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Return home' })).toBeVisible()

    await context.setOffline(false)
  })

  test('public chat answers end-to-end without external AI', async ({ page }) => {
    test.setTimeout(120_000)
    const query = 'Explain RA 9003 Solid Waste Management Act'

    await page.goto('/')
    await chatInput(page).fill(query)
    await page.keyboard.press('Enter')

    await expect(page.getByRole('main').getByText(query, { exact: true })).toBeVisible()
    await expect(page.getByRole('status', { name: /Thinking|Checking legal context|Drafting answer/ })).toBeVisible()
    await expect(page.locator('[data-revealing="true"]').first()).toBeVisible()

    const completedAssistantMessage = page
      .locator('[data-revealing="false"]')
      .filter({ hasText: 'Short answer:' })

    await expect(completedAssistantMessage).toBeVisible({ timeout: 75_000 })
    await expect(page.getByRole('heading', { name: 'Answer' })).toBeVisible()
    await expect(completedAssistantMessage.getByText('Ecological Solid Waste Management Act of 2000').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Run deep research' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send standard message' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mode: General' })).toBeVisible()
    await page.getByRole('button', { name: 'Mode: General' }).click()
    await page.getByRole('menuitemradio', { name: /Compliance/ }).click()
    await expect(page.getByRole('button', { name: 'Upload compliance document', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mode: Compliance' })).toBeVisible()
    const complianceReport = page.locator('article[aria-label="Compliance report content"]')
    await expect(complianceReport).toBeVisible()
    const canvasCitation = complianceReport
      .getByRole('button', { name: 'Open citation details for RA 9003' })
      .first()
    await expect(canvasCitation).toBeVisible()
    await canvasCitation.click()
    const canvasCitationDialog = page.getByRole('dialog', { name: 'RA 9003' })
    await expect(canvasCitationDialog).toBeVisible()
    await expect(canvasCitationDialog).toContainText('Ecological Solid Waste Management Act of 2000')
    await page.keyboard.press('Escape')
    await expect(canvasCitationDialog).toBeHidden()
    await page.getByRole('button', { name: 'Mode: Compliance' }).click()
    await page.getByRole('menuitemradio', { name: /General/ }).click()
    const wordDownloadPromise = page.waitForEvent('download')
    await completedAssistantMessage.getByRole('button', { name: 'Download as Word (.docx)' }).click()
    const wordDownload = await wordDownloadPromise
    expect(wordDownload.suggestedFilename()).toMatch(/^response-\d+\.docx$/)

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
          message.content.includes('# Answer')
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

    await expect(page.getByRole('heading', { name: 'Account sign-in is unavailable' })).toBeVisible()
    await expect(page.getByText('Add the Clerk publishable and secret keys')).toBeVisible()
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
        providerMode: expect.any(String),
        externalChecks: expect.any(String),
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
    expect(JSON.stringify(body)).not.toContain('https://devkada.resqlink.org')
    expect(JSON.stringify(body)).not.toContain('supabase.co')
  })

  test('version endpoint exposes deployment metadata without backend secrets', async ({ request }) => {
    const response = await request.get('/api/version?expectedSha=local-test')
    const body = await response.json()

    expect(response.status()).toBe(200)
    expect(body).toEqual(
      expect.objectContaining({
        app: 'LexInsights',
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
    expect(body.source).not.toHaveProperty('branch')
    expect(body.source).not.toHaveProperty('repoOwner')
    expect(body.source).not.toHaveProperty('repoSlug')
    expect(body.deployment).toEqual({ details: 'restricted' })
  })

  test('PWA manifest and service worker are install-ready', async ({ request }) => {
    const manifestResponse = await request.get('/manifest.webmanifest')
    const manifest = await manifestResponse.json()

    expect(manifestResponse.status()).toBe(200)
    expect(manifest).toEqual(
      expect.objectContaining({
        name: 'LexInsights',
        short_name: 'LexInsights',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        id: '/',
        lang: 'en-PH',
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
    expect(manifest.shortcuts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Start a legal chat',
          url: '/chat',
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
          app: 'LexInsights',
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
            endpointPath: '/api/research/health',
            requestId: expect.any(String),
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
          endpointPath: '/api/research/health',
          requestId: expect.any(String),
        }),
      })
    )
    expect(JSON.stringify(body)).not.toContain('https://example.com')
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
          endpointPath: '/missing-rag-upstream',
          requestId: expect.any(String),
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
    await expect(page.getByRole('heading', { name: 'Local Ranking Diagnostics' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Matched Sources' })).toBeVisible()
    await expect(page.getByText('Candidates:')).toBeVisible()
    await expect(page.getByText('Source types:')).toBeVisible()
    await expect(page.getByText('direct support', { exact: true })).toBeVisible()

    const summary = page.locator('pre').filter({ hasText: '# Answer' })
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
