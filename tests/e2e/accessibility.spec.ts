import { expect, test, type Locator, type Page } from '@playwright/test'

function helpButton(page: Page) {
  return page
    .getByRole('button', { name: 'Help & Resources' })
    .or(page.getByRole('button', { name: 'Help', exact: true }))
    .first()
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(async () => {
    return page.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth && document.body.scrollWidth <= window.innerWidth
    })
  }).toBe(true)
}

async function expectMinTouchTarget(locator: Locator) {
  const box = await locator.boundingBox()

  expect(box).not.toBeNull()
  expect(box?.width).toBeGreaterThanOrEqual(44)
  expect(box?.height).toBeGreaterThanOrEqual(44)
}

test.describe('accessibility behavior', () => {
  test('Help & Resources tabs support roving keyboard navigation', async ({ page }) => {
    await page.goto('/')
    await helpButton(page).click()

    const dialog = page.getByRole('dialog', { name: 'Help & Resources' })
    const sourcesTab = dialog.getByRole('tab', { name: 'Sources' })
    const termsTab = dialog.getByRole('tab', { name: 'Terms & Privacy' })

    await expect(dialog).toBeVisible()
    await expect(sourcesTab).toHaveAttribute('aria-selected', 'true')
    await expect(sourcesTab).toHaveAttribute('aria-controls', 'help-panel-sources')
    await expect(termsTab).toHaveAttribute('aria-selected', 'false')
    await expect(termsTab).toHaveAttribute('aria-controls', 'help-panel-terms-privacy')
    await expect(dialog.locator('#help-panel-sources[role="tabpanel"]')).toBeVisible()

    await sourcesTab.focus()
    await page.keyboard.press('ArrowRight')
    await expect(termsTab).toBeFocused()
    await expect(termsTab).toHaveAttribute('aria-selected', 'true')
    await expect(dialog.locator('#help-panel-terms-privacy[role="tabpanel"]')).toBeVisible()
    await expect(sourcesTab).toHaveAttribute('tabindex', '-1')
    await expect(termsTab).toHaveAttribute('tabindex', '0')

    await page.keyboard.press('Home')
    await expect(sourcesTab).toBeFocused()
    await expect(sourcesTab).toHaveAttribute('aria-selected', 'true')

    await page.keyboard.press('End')
    await expect(termsTab).toBeFocused()
    await expect(termsTab).toHaveAttribute('aria-selected', 'true')

    await page.keyboard.press('ArrowLeft')
    await expect(sourcesTab).toBeFocused()
    await expect(sourcesTab).toHaveAttribute('aria-selected', 'true')
  })

  test('reduced-motion chat and Help dialog remain usable without overflow', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 390, height: 844 })

    await page.goto('/chat')
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), there/ })).toBeVisible()
    await expect.poll(async () => page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true)
    await expectNoHorizontalOverflow(page)

    const promptButton = page.getByRole('button', { name: /Compare RA 10173 and RA 10175/ })
    await expect(promptButton).toBeEnabled()
    await promptButton.hover()
    await expect.poll(async () => promptButton.evaluate((button) => getComputedStyle(button).transform)).toBe('none')

    await page.getByRole('button', { name: 'Open sidebar menu' }).click()
    await page.getByText('Help', { exact: true }).click()

    const dialog = page.getByRole('dialog', { name: 'Help & Resources' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('tab', { name: 'Sources' })).toHaveAttribute('aria-selected', 'true')
    await expectNoHorizontalOverflow(page)
    await expectMinTouchTarget(dialog.getByRole('button', { name: 'Close' }))
  })
})
