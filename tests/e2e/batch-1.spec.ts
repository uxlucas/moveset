import { expect, test, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow, trackErrors } from './helpers'

const card = (page: Page, slug: string) => page.locator(`[data-testid="term-card"][data-slug="${slug}"]`)
const demo = (page: Page, slug: string) => page.locator(`main [data-demo="${slug}"]`)
const scroller = (page: Page, slug: string) => demo(page, slug).locator('[data-scroller]')
const prompt = (page: Page) => page.getByRole('main').locator('pre').first()
const option = (page: Page, control: string, name: string) =>
  page.getByRole('group', { name: control }).getByRole('button', { name, exact: true })

for (const { slug, name } of [
  { slug: 'scroll-triggered', name: 'Scroll-triggered' },
  { slug: 'scroll-linked', name: 'Scroll-linked' },
]) {
  test(`${name}: the card links to its entry`, async ({ page }) => {
    await page.goto('/')
    await expect(card(page, slug).getByRole('link', { name })).toHaveAttribute('href', `/terms/${slug}`)
  })

  test(`${name}: the entry page renders`, async ({ page }) => {
    const errors = trackErrors(page)
    await page.goto(`/terms/${slug}`)
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
    await expect(demo(page, slug).locator('[data-scroller]')).toBeVisible()
    await expectNoHorizontalOverflow(page)
    expect(errors).toEqual([])
  })
}

test.describe('Scroll-triggered', () => {
  test('controls rewrite the prompt', async ({ page }) => {
    await page.goto('/terms/scroll-triggered')
    await expect(prompt(page)).toContainText('Timing: 500ms with `var(--ease-out)` on both properties.')
    await option(page, 'Duration', '800ms').click()
    await expect(prompt(page)).toContainText('Timing: 800ms with `var(--ease-out)`')
    await option(page, 'Easing', 'Spring').click()
    await expect(prompt(page)).toContainText('a spring with bounce 0.2 over 800ms')
    await page.getByRole('switch', { name: 'Stagger' }).click()
    await expect(prompt(page)).toContainText('Cards that enter together all start at the same moment. No stagger.')
  })

  test('tiles reveal once and stay revealed when scrolling back up', async ({ page }) => {
    await page.goto('/terms/scroll-triggered')
    await expect(demo(page, 'scroll-triggered')).toHaveAttribute('data-playing', 'true')
    const el = scroller(page, 'scroll-triggered')
    await el.hover()
    await page.mouse.wheel(0, 40)
    await expect(el).toHaveAttribute('data-taken-over', 'true')
    // Scroll down in steps, as a reader would, so every tile passes through the viewport.
    await el.evaluate(async (s) => {
      while (s.scrollTop + s.clientHeight < s.scrollHeight - 1) {
        s.scrollTop += 60
        await new Promise((r) => setTimeout(r, 60))
      }
    })
    const states = () => el.locator('[data-tile]').evaluateAll((tiles) => tiles.map((t) => (t as HTMLElement).dataset.in))
    await expect.poll(states).toEqual(Array(12).fill('true'))
    await el.evaluate((s) => {
      s.scrollTop = 0
    })
    await page.waitForTimeout(300)
    expect(await states()).toEqual(Array(12).fill('true'))
  })

  test('a control change restarts the cycle like Replay, leaving nothing scrolled past hidden', async ({ page }) => {
    await page.goto('/terms/scroll-triggered')
    await expect(demo(page, 'scroll-triggered')).toHaveAttribute('data-playing', 'true')
    const el = scroller(page, 'scroll-triggered')
    await el.hover()
    await page.mouse.wheel(0, 40)
    await expect(el).toHaveAttribute('data-taken-over', 'true')
    await el.evaluate((s) => {
      s.scrollTop = s.scrollHeight
    })
    await option(page, 'Easing', 'Ease-in-out').click()
    await expect(el).toHaveAttribute('data-taken-over', 'false')
    const hiddenAbove = () =>
      el.evaluate((s) => {
        const top = s.getBoundingClientRect().top
        return [...s.querySelectorAll<HTMLElement>('[data-tile]')].filter((t) => t.getBoundingClientRect().bottom < top && t.dataset.in !== 'true').length
      })
    expect(await hiddenAbove()).toBe(0)
    await page.waitForTimeout(2500)
    expect(await hiddenAbove()).toBe(0)
  })
})

test.describe('Scroll-linked', () => {
  test('controls rewrite the prompt', async ({ page }) => {
    await page.goto('/terms/scroll-linked')
    await expect(prompt(page)).toContainText('Add a reading progress bar that follows the scroll position of the page.')
    await option(page, 'Effect', 'Fade').click()
    await expect(prompt(page)).toContainText('Fade this figure in as the page scrolls')
    await option(page, 'Range', 'Element in view').click()
    await expect(prompt(page)).toContainText('`animation-range: entry`')
  })

  test('the bar follows the scroll position both ways', async ({ page }) => {
    // Reduced motion keeps the demo on its still frame, so the scroll position is ours to set.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/terms/scroll-linked')
    await expect(demo(page, 'scroll-linked')).toHaveAttribute('data-playing', 'false')
    const el = scroller(page, 'scroll-linked')
    const scaleX = () =>
      el.locator('[data-progress-bar]').evaluate((bar) => {
        const m = getComputedStyle(bar).transform.match(/^matrix\(([^,]+)/)
        return m ? Number(m[1]) : 1
      })
    const scrollTo = (fraction: number) =>
      el.evaluate((s, f) => {
        s.scrollTop = (s.scrollHeight - s.clientHeight) * f
      }, fraction)

    await scrollTo(0.5)
    await expect.poll(scaleX).toBeCloseTo(0.5, 1)
    await scrollTo(0)
    await expect.poll(scaleX).toBe(0)
  })

  test('the still frame shows a figure half way through its own range', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/terms/scroll-linked')
    await option(page, 'Effect', 'Fade').click()
    await option(page, 'Range', 'Element in view').click()
    const figure = scroller(page, 'scroll-linked').locator('[data-figure]')
    await expect.poll(() => figure.evaluate((f) => Number(getComputedStyle(f).opacity))).toBeCloseTo(0.5, 1)
  })
})

test('the two scroll terms have a compare page', async ({ page }) => {
  const response = await page.goto('/compare/scroll-linked-vs-scroll-triggered')
  expect(response?.status()).toBe(200)
  await expect(page.locator('[data-demo="scroll-triggered"]')).toBeVisible()
  await expect(page.locator('[data-demo="scroll-linked"]')).toBeVisible()
})
