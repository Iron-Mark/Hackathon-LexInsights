import { expect, test, type Page } from '@playwright/test'

function chatInput(page: Page) {
  return page.getByRole('textbox', { name: /Ask about (PH law|Philippine law|Philippine legal compliance)/ })
}

test.describe('offline recovery and local data controls', () => {
  test('offline chat send shows a retryable recovery state', async ({ page, context }) => {
    test.setTimeout(60_000)
    const query = 'What is RA 9003?'

    await page.goto('/chat')
    await expect(chatInput(page)).toBeVisible()

    await context.setOffline(true)
    await chatInput(page).fill(query)
    await page.keyboard.press('Enter')

    const recovery = page.locator('[data-send-recovery="true"]').filter({ hasText: query })
    await expect(recovery).toBeVisible()
    await expect(recovery).toContainText('Message not sent')
    await expect(recovery).toContainText('You are offline')
    await expect(recovery.getByRole('button', { name: 'Retry' })).toBeVisible()

    await context.setOffline(false)
    await recovery.getByRole('button', { name: 'Retry' }).click()

    await expect(recovery).toBeHidden()
    await expect(page.locator('[data-revealing="false"]').filter({ hasText: 'Short answer:' })).toBeVisible({
      timeout: 45_000,
    })
  })

  test('clear local data removes private browser state and preserves theme', async ({ page }) => {
    await page.goto('/chat')
    await expect(chatInput(page)).toBeVisible()

    await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    await page.evaluate(() => {
      window.localStorage.setItem('rag-storage', JSON.stringify({ state: { queryHistory: ['private'] } }))
      window.localStorage.setItem('compliance-storage', JSON.stringify({ state: { versions: ['draft'] } }))
      window.localStorage.setItem('rag_cache_resilience', JSON.stringify({ response: 'cached' }))
      window.localStorage.setItem('lexinsights_guest_chats_v1', JSON.stringify({ version: 1, chats: ['guest'], messages: {} }))
      window.localStorage.setItem('lexinsights_supabase_fallback_chats_v1', JSON.stringify({ version: 1, chats: ['fallback'], messages: {} }))
    })

    await page.getByRole('button', { name: 'Help & Resources' }).click()
    await page.getByRole('tab', { name: 'Terms & Privacy' }).click()
    await page.getByRole('button', { name: 'Clear local data' }).click()
    await page.getByRole('button', { name: 'Clear now' }).click()

    await expect(page.getByText('Local chats, uploaded document selections, compliance drafts, and research caches were cleared.')).toBeVisible()

    const remainingState = await page.evaluate(() => ({
      theme: window.localStorage.getItem('lexinsights-theme'),
      rag: window.localStorage.getItem('rag-storage'),
      compliance: window.localStorage.getItem('compliance-storage'),
      ragCache: window.localStorage.getItem('rag_cache_resilience'),
      guest: window.localStorage.getItem('lexinsights_guest_chats_v1'),
      fallback: window.localStorage.getItem('lexinsights_supabase_fallback_chats_v1'),
    }))

    expect(remainingState).toEqual({
      theme: 'dark',
      rag: null,
      compliance: null,
      ragCache: null,
      guest: null,
      fallback: null,
    })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })
})
