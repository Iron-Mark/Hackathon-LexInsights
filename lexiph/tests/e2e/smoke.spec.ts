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
    const response = await request.get('/api/readiness')
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
      'supabase.dns',
      'rag.direct_health',
      'rag.proxy_health',
    ]))

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
})
