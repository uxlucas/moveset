import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, trackErrors } from './helpers'

const cards = (page: import('@playwright/test').Page) => page.getByTestId('term-card')

test('intro shows the skill command and copies it', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'clipboard permissions are chromium-only')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await expect(page.getByText('npx skills add uxlucas/moveset')).toBeVisible()
  await page.getByRole('button', { name: 'Copy install command' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Copied' })).toHaveCount(1)
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('npx skills add uxlucas/moveset')
})

test('copy failure says so instead of showing a check', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Copy install command' }).click()
  await expect(page.getByText("Couldn't copy")).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copy install command' }).locator('[data-icon="check"]')).toHaveCount(0)
})

test('shows all 47 cards, drafts without links', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/')
  await expect(cards(page)).toHaveCount(47)
  await expect(cards(page).filter({ hasText: 'Parallax' }).getByRole('link')).toHaveCount(0)
  await expectNoHorizontalOverflow(page)
  expect(errors).toEqual([])
})

test.describe('search', () => {
  test('finds a term by name', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('searchbox', { name: 'Search terms' }).fill('parallax')
    await expect(cards(page)).toHaveCount(1)
    await expect(cards(page)).toContainText('Parallax')
  })

  for (const query of ['  Scroll Linked ', 'scroll-linked', 'SCROLL linked']) {
    test(`tolerates messy input: "${query}"`, async ({ page }) => {
      await page.goto('/')
      await page.getByRole('searchbox', { name: 'Search terms' }).fill(query)
      await expect(cards(page).filter({ hasText: 'Scroll-linked' })).toHaveCount(1)
    })
  }

  test('says when nothing matches', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('searchbox', { name: 'Search terms' }).fill('zzzz')
    await expect(cards(page)).toHaveCount(0)
    await expect(page.getByText('Nothing matches “zzzz”. Try describing what it does.')).toBeVisible()
  })

  test('slash focuses search and Escape clears it', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard shortcut')
    await page.goto('/')
    await page.keyboard.press('/')
    const box = page.getByRole('searchbox', { name: 'Search terms' })
    await expect(box).toBeFocused()
    await box.fill('toast')
    await box.press('Escape')
    await expect(box).toHaveValue('')
  })
})

test('category pills filter the grid', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('group', { name: 'Filter by category' }).getByRole('button', { name: 'Gestures' }).click()
  await expect(cards(page)).toHaveCount(6)
  // Scoped to main: the desktop sidebar has its own category headings.
  const main = page.getByRole('main')
  await expect(main.getByRole('heading', { level: 2, name: 'Gestures' })).toBeVisible()
  await expect(main.getByRole('heading', { level: 2, name: 'Scroll' })).toHaveCount(0)
})

test('about page loads', async ({ page }) => {
  await page.goto('/about')
  await expect(page.getByRole('heading', { level: 1, name: 'About' })).toBeVisible()
})
