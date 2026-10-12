import { expect, test, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow, trackErrors } from './helpers'

const scroller = (page: Page) => page.locator('main [data-demo="sticky"] [data-scroller]')

test('entry sections appear in the specified order', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/terms/sticky')
  await expect(page.getByRole('heading', { level: 1, name: 'Sticky' })).toBeVisible()
  const h2s = await page.getByRole('main').getByRole('heading', { level: 2 }).allTextContents()
  expect(h2s).toEqual(['Use when', 'Avoid when', 'Prompt', 'Code', 'Accessibility', 'Related', 'Often confused with'])
  await expectNoHorizontalOverflow(page)
  expect(errors).toEqual([])
})

test('controls rewrite the prompt and the checklist', async ({ page }) => {
  await page.goto('/terms/sticky')
  const prompt = page.getByRole('main').locator('pre').first()
  await expect(prompt).toContainText('top: 0px')
  const slider = page.getByLabel('Top offset')
  await slider.focus()
  await slider.press('ArrowRight')
  await slider.press('ArrowRight')
  await expect(prompt).toContainText('top: 8px')
  await expect(page.getByText('each header pins directly under the 8px bar')).toBeVisible()
  await page.getByRole('switch', { name: 'Shadow when stuck' }).click()
  await expect(prompt).toContainText("Don't change the header's style when it is stuck.")
})

test('copy as prompt copies prompt, checklist and link', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/terms/sticky')
  await page.getByRole('button', { name: 'Copy as prompt' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('# Sticky')
  expect(text).toContain('## Acceptance checklist')
  expect(text).toContain('https://moveset.lucaslima.design/terms/sticky')
})

test('the demo really sticks at the chosen offset', async ({ page }) => {
  await page.goto('/terms/sticky')
  await page.getByLabel('Top offset').focus()
  await page.getByLabel('Top offset').press('ArrowRight')
  await page.getByLabel('Top offset').press('ArrowRight')
  // Takeover listeners attach only while the demo is playing.
  await expect(page.locator('main [data-demo="sticky"]')).toHaveAttribute('data-playing', 'true')
  await scroller(page).hover()
  await page.mouse.wheel(0, 120)
  await expect(scroller(page)).toHaveAttribute('data-taken-over', 'true')
  await scroller(page).evaluate((el) => {
    el.scrollTop = 160
  })
  await expect(scroller(page).locator('[data-sticky-header][data-stuck="true"]').first()).toBeVisible()
  const gap = await scroller(page).evaluate((el) => {
    const top = el.getBoundingClientRect().top
    const stuck = [...el.querySelectorAll<HTMLElement>('[data-sticky-header]')].map((h) => h.getBoundingClientRect().top - top)
    return Math.min(...stuck.map((d) => Math.abs(d - 8)))
  })
  expect(gap).toBeLessThanOrEqual(1)
})

test('scrolling the demo takes over; replay hands it back', async ({ page }) => {
  await page.goto('/terms/sticky')
  await expect(page.locator('main [data-demo="sticky"]')).toHaveAttribute('data-playing', 'true')
  await scroller(page).hover()
  await page.mouse.wheel(0, 100)
  await expect(scroller(page)).toHaveAttribute('data-taken-over', 'true')
  await page.getByRole('button', { name: 'Replay' }).click()
  await expect(scroller(page)).toHaveAttribute('data-taken-over', 'false')
})

test('rapid replay never stacks animations', async ({ page }) => {
  await page.goto('/terms/sticky')
  const replay = page.getByRole('button', { name: 'Replay' })
  for (let i = 0; i < 5; i++) await replay.click()
  await expect(scroller(page)).toHaveAttribute('data-active', '1')
})

test('drafts have no page and are never linked as prev/next', async ({ page }) => {
  const response = await page.goto('/terms/parallax')
  expect(response?.status()).toBe(404)
  await page.goto('/terms/sticky')
  const nav = page.getByRole('navigation', { name: 'Previous and next' })
  await expect(nav.getByRole('link')).toHaveCount(0)
})

test('a compare pair with a draft side has no page', async ({ page }) => {
  const response = await page.goto('/compare/pinned-horizontal-scroll-vs-sticky')
  expect(response?.status()).toBe(404)
})
