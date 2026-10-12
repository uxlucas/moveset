import { expect, test, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow, trackErrors } from './helpers'

const scroller = (page: Page) => page.locator('main [data-demo="sticky"] [data-scroller]')
const offsetOption = (page: Page, label: string) => page.getByRole('group', { name: 'Top offset' }).getByRole('button', { name: label })

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
  await offsetOption(page, '24px').click()
  await expect(prompt).toContainText('top: 24px')
  await expect(page.getByText('each header pins directly under the 24px bar')).toBeVisible()
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
  await offsetOption(page, '24px').click()
  // Takeover listeners attach only while the demo is playing.
  await expect(page.locator('main [data-demo="sticky"]')).toHaveAttribute('data-playing', 'true')
  await scroller(page).hover()
  await page.mouse.wheel(0, 120)
  await expect(scroller(page)).toHaveAttribute('data-taken-over', 'true')
  await scroller(page).evaluate((el) => {
    el.scrollTop = 160
  })
  await expect(scroller(page).locator('[data-sticky-header][data-stuck="true"]').first()).toBeVisible()
  // The stuck flag follows an IntersectionObserver, so it can trail the scroll by a frame or two.
  await expect
    .poll(() =>
      scroller(page).evaluate((el) => {
        const top = el.getBoundingClientRect().top
        const stuck = [...el.querySelectorAll<HTMLElement>('[data-sticky-header][data-stuck="true"]')].map((h) => h.getBoundingClientRect().top - top)
        return Math.min(...stuck.map((d) => Math.abs(d - 24)))
      }),
    )
    .toBeLessThanOrEqual(1)
})

test('stuck state follows one-step jumps both ways', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/terms/sticky')
  const header = (letter: string) => scroller(page).locator(`[data-section="${letter}"] [data-sticky-header]`)
  const jump = (y: number) =>
    scroller(page).evaluate((el, top) => {
      el.scrollTop = top
    }, y)
  await jump(0)
  await expect(header('A')).toHaveAttribute('data-stuck', 'false')
  await expect(header('B')).toHaveAttribute('data-stuck', 'false')
  // One write from the top to past B's natural top: B pins, A is pushed fully out.
  const pastB = await scroller(page).evaluate((el) => el.querySelector<HTMLElement>('[data-section="B"]')!.offsetTop + 40)
  await jump(pastB)
  await expect(header('B')).toHaveAttribute('data-stuck', 'true')
  await expect(header('A')).toHaveAttribute('data-stuck', 'false')
  await jump(0)
  await expect(header('B')).toHaveAttribute('data-stuck', 'false')
  await expect(header('A')).toHaveAttribute('data-stuck', 'false')
  // From out of view below straight to pinned: the case a sentinel never sees.
  const pastD = await scroller(page).evaluate((el) => el.querySelector<HTMLElement>('[data-section="D"]')!.offsetTop + 40)
  await jump(pastD)
  await expect(header('D')).toHaveAttribute('data-stuck', 'true')
  // From half under the bottom edge straight to pinned.
  const straddle = await scroller(page).evaluate((el) => el.querySelector<HTMLElement>('[data-section="C"]')!.offsetTop - el.clientHeight + 10)
  const pastC = await scroller(page).evaluate((el) => el.querySelector<HTMLElement>('[data-section="C"]')!.offsetTop + 40)
  await jump(straddle)
  await expect(header('C')).toHaveAttribute('data-stuck', 'false')
  await jump(pastC)
  await expect(header('C')).toHaveAttribute('data-stuck', 'true')
  await expect(header('D')).toHaveAttribute('data-stuck', 'false')
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
  for (let i = 0; i < 5; i++) {
    await replay.click()
    await expect(scroller(page)).toHaveAttribute('data-active', '1')
  }
  await expect(scroller(page)).toHaveAttribute('data-active', '1')
})

test('drafts have no page and are never linked as prev/next', async ({ page }) => {
  const published = await page.goto('/terms/sticky')
  expect(published?.status()).toBe(200)
  const response = await page.goto('/terms/parallax')
  expect(response?.status()).toBe(404)
  // Sticky is 4th in Scroll and Parallax (3rd) is a draft, so the previous link skips over it.
  await page.goto('/terms/sticky')
  const nav = page.getByRole('navigation', { name: 'Previous and next' })
  await expect(nav.getByRole('link')).toHaveCount(1)
  await expect(nav.getByRole('link')).toHaveText('← Scroll-linked')
})

test('a compare pair with a draft side has no page', async ({ page }) => {
  const response = await page.goto('/compare/pinned-horizontal-scroll-vs-sticky')
  expect(response?.status()).toBe(404)
})
