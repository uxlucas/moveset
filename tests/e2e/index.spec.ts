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

test('intro says what it is and who made it', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('A visual dictionary of design engineering terms.')).toBeVisible()
  await expect(page.getByText(/Brought to you by/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Lucas Lima' })).toHaveAttribute('href', 'https://lucaslima.design')
})

test('category headings show the written count and a one-line description', async ({ page }) => {
  await page.goto('/')
  const main = page.getByRole('main')
  // Relies on review mode (NEXT_PUBLIC_SHOW_REVIEW=1, set in .env.development): Parallax and Scroll Snap are in
  // review and count as written next to the three published terms. A build without review mode shows "3 / 8".
  const scroll = main.getByRole('heading', { level: 2, name: 'Scroll' })
  await expect(scroll).toContainText('5 / 8')
  await expect(scroll).toHaveAccessibleName(/5 of 8 written/)
  await expect(main.getByText('Motion that scrolling drives or triggers.')).toBeVisible()
})

test('shows all 47 cards, drafts without links', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/')
  await expect(cards(page)).toHaveCount(47)
  await expect(cards(page).filter({ hasText: 'Scroll Fade' }).getByRole('link')).toHaveCount(0)
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
    const box = page.getByRole('searchbox', { name: 'Search terms' })
    // The shortcut listener attaches on hydration, which can lag behind `load` when workers are busy.
    await expect(async () => {
      await page.keyboard.press('/')
      await expect(box).toBeFocused({ timeout: 500 })
    }).toPass()
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

test('every filter pill is fully visible on desktop (no clipping)', async ({ page, isMobile }) => {
  test.skip(isMobile, 'mobile scrolls the pills sideways')
  await page.goto('/')
  const mainBox = await page.getByRole('main').boundingBox()
  const pills = page.getByRole('group', { name: 'Filter by category' }).getByRole('button')
  await expect(pills).toHaveCount(8)
  for (const pill of await pills.all()) {
    const box = await pill.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(mainBox!.x)
    expect(box!.x + box!.width).toBeLessThanOrEqual(mainBox!.x + mainBox!.width)
  }
})

test('about page loads', async ({ page }) => {
  await page.goto('/about')
  await expect(page.getByRole('heading', { level: 1, name: 'About' })).toBeVisible()
})
