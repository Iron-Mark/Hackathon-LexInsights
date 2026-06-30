import { expect, test } from '@playwright/test'

type AnalyticsPayload = {
  event?: string
  metadata?: Record<string, unknown>
}

function parseAnalyticsPayload(raw: string | null): AnalyticsPayload {
  if (!raw) {
    return {}
  }

  try {
    return JSON.parse(raw) as AnalyticsPayload
  } catch {
    return {}
  }
}

async function waitForEvent(events: AnalyticsPayload[], eventName: string) {
  await expect.poll(() => events.some((event) => event.event === eventName)).toBe(true)
  return events.find((event) => event.event === eventName)
}

test('privacy-safe analytics tracks public page, help, source, and chat-start events', async ({ context, page }) => {
  const events: AnalyticsPayload[] = []

  await page.route('**/api/analytics', async (route) => {
    events.push(parseAnalyticsPayload(route.request().postData()))
    await route.fulfill({ status: 204, body: '' })
  })

  await page.route('**/api/rag-proxy**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        summary: 'Test summary',
        documents: [],
        confidence_score: 0,
        processing_time: 1,
      }),
    })
  })

  context.on('page', async (popup) => {
    await popup.close().catch(() => undefined)
  })

  await page.goto('/chat', { waitUntil: 'domcontentloaded' })

  const pageView = await waitForEvent(events, 'page_view')
  expect(pageView?.metadata).toMatchObject({
    path: '/chat',
    source: 'app_router',
  })

  await page.getByRole('button', { name: 'Help & Resources' }).click()
  await page.getByRole('dialog').waitFor({ state: 'visible' })

  const helpOpen = await waitForEvent(events, 'help_resources_open')
  expect(helpOpen?.metadata).toMatchObject({
    component: 'help_resources',
    source: 'sidebar_control',
  })

  await page.getByRole('button', { name: /Lawphil Legal Information Archive/i }).click()

  const sourceClick = await waitForEvent(events, 'source_link_click')
  expect(sourceClick?.metadata).toMatchObject({
    category: 'Primary Law',
    component: 'help_resources',
    resourceId: 'lawphil',
  })

  await page.keyboard.press('Escape')
  await page.getByPlaceholder('Ask about Philippine law...').fill('What does RA 9775 require?')
  await page.getByRole('button', { name: 'Send message' }).click()

  const chatStart = await waitForEvent(events, 'chat_start')
  expect(chatStart?.metadata).toMatchObject({
    path: '/chat',
    source: 'chat_submit',
  })

  for (const event of events) {
    const serialized = JSON.stringify(event)

    expect(serialized).not.toContain('What does RA 9775 require?')
    expect(serialized).not.toContain('query')
    expect(serialized).not.toContain('file')
    expect(serialized).not.toContain('content')
  }
})

test('analytics endpoint accepts allowlisted events and rejects unsupported events', async ({ request }) => {
  const accepted = await request.post('/api/analytics', {
    data: {
      event: 'page_view',
      metadata: {
        path: '/chat',
        source: 'api_test',
        viewport: 'desktop',
      },
    },
  })

  expect(accepted.status()).toBe(204)
  expect(accepted.headers()['x-request-id']).toEqual(expect.any(String))

  const rejected = await request.post('/api/analytics', {
    data: {
      event: 'prompt_text',
      metadata: {
        path: '/chat/secret-session',
        query: 'Should not be accepted',
      },
    },
  })
  const body = await rejected.json()

  expect(rejected.status()).toBe(400)
  expect(body.error.type).toBe('unsupported_event')
  expect(JSON.stringify(body)).not.toContain('Should not be accepted')
})
