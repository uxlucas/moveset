import { expect, test, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow, trackErrors } from './helpers'

const card = (page: Page, slug: string) => page.locator(`[data-testid="term-card"][data-slug="${slug}"]`)
const demo = (page: Page, slug: string) => page.locator(`main [data-demo="${slug}"]`)
const scroller = (page: Page, slug: string) => demo(page, slug).locator('[data-scroller]')
const prompt = (page: Page) => page.getByRole('main').locator('pre').first()
const option = (page: Page, control: string, name: string) =>
  page.getByRole('group', { name: control }).getByRole('button', { name, exact: true })

for (const { slug, name } of [
  { slug: 'parallax', name: 'Parallax' },
  { slug: 'scroll-snap', name: 'Scroll Snap' },
]) {
  test(`${name}: the card links to its entry`, async ({ page }) => {
    await page.goto('/')
    await expect(card(page, slug).getByRole('link', { name })).toHaveAttribute('href', `/terms/${slug}`)
  })

  test(`${name}: the entry page renders`, async ({ page }) => {
    const errors = trackErrors(page)
    await page.goto(`/terms/${slug}`)
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
    await expect(scroller(page, slug)).toBeVisible()
    await expectNoHorizontalOverflow(page)
    expect(errors).toEqual([])
  })
}

test.describe('Parallax', () => {
  test('controls rewrite the prompt', async ({ page }) => {
    await page.goto('/terms/parallax')
    await expect(prompt(page)).toContainText('Ratio, set once as `--ratio` on the layer: `0.4` (0.4px per 1px scrolled)')
    await expect(prompt(page)).toContainText('(60%), so n × (1 − ratio) px after n px')
    await expect(prompt(page)).toContainText('Visible while the layer peeks above the panel (first 40vh of scroll)')
    await expect(prompt(page)).not.toContainText('far')
    await option(page, 'Back layer speed', '0.2×').click()
    await expect(prompt(page)).toContainText('(80%), so n × (1 − ratio) px')
    await expect(prompt(page)).not.toContainText('`0.4`')
    await option(page, 'Layers', '3').click()
    await expect(prompt(page)).toContainText('Ratios, set once as `--ratio` per layer: far `0.1`, back `0.2`')
    await expect(prompt(page)).toContainText('(90% far, 80% back)')
    await expect(prompt(page)).not.toContainText('One layer')
  })

  test('the blocks still show at the bottom of the scroll, and the still frame keeps them whole', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/terms/parallax')
    const el = scroller(page, 'parallax')
    // Share of a block's height on screen above the front panel, and whether its top is inside the window.
    const view = () =>
      el.evaluate(async (s) => {
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
        const top = s.getBoundingClientRect().top
        const block = s.querySelector<HTMLElement>('[data-layer="back"] .rounded-md')!.getBoundingClientRect()
        const panel = s.querySelector<HTMLElement>('[data-layer="front"]')!.getBoundingClientRect()
        const shown = Math.max(0, Math.min(block.bottom, panel.top) - Math.max(block.top, top))
        return { shown: shown / block.height, whole: block.top >= top, covered: panel.top < block.bottom }
      })
    for (const speed of ['0.2×', '0.4×', '0.6×']) {
      await option(page, 'Back layer speed', speed).click()
      // Still frame: the blocks are whole and the panel already overlaps them.
      const still = await view()
      expect(still.whole).toBe(true)
      expect(still.covered).toBe(true)
      await el.evaluate((s) => {
        s.scrollTop = s.scrollHeight
      })
      expect((await view()).shown).toBeGreaterThanOrEqual(speed === '0.2×' ? 0.25 : 0.3)
      // Each depth has its own still frame, so the next click moves back to it.
    }
  })

  test('the back layer moves scroll × ratio on screen, both ways', async ({ page }) => {
    // Reduced motion keeps the demo on its still frame, so the scroll position is ours to set.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/terms/parallax')
    await expect(demo(page, 'parallax')).toHaveAttribute('data-playing', 'false')
    const el = scroller(page, 'parallax')
    const measure = (layer: string, top: number) =>
      el.evaluate(
        async (s, [layer, top]) => {
          const box = s.querySelector<HTMLElement>(`[data-layer="${layer}"]`)!
          s.scrollTop = top as number
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
          const m = new DOMMatrix(getComputedStyle(box).transform)
          return { screen: box.getBoundingClientRect().top - s.getBoundingClientRect().top, translate: m.f }
        },
        [layer, top] as const,
      )

    for (const [speed, layers, checks] of [
      ['0.4×', '2', [['back', 0.4]]],
      ['0.2×', '3', [['back', 0.2], ['far', 0.1]]],
    ] as const) {
      await option(page, 'Back layer speed', speed).click()
      await option(page, 'Layers', layers).click()
      for (const [layer, ratio] of checks) {
        const start = await measure(layer, 0)
        const down = await measure(layer, 100)
        // On screen it has moved up 100 × ratio; its transform pushes it down the rest of the way.
        expect(Math.abs(down.screen - start.screen - -100 * ratio)).toBeLessThanOrEqual(1)
        expect(Math.abs(down.translate - 100 * (1 - ratio))).toBeLessThanOrEqual(1)
        const back = await measure(layer, 0)
        expect(Math.abs(back.screen - start.screen)).toBeLessThanOrEqual(1)
      }
    }
    // The front panel moves at full speed.
    const front = await el.evaluate(async (s) => {
      const panel = s.querySelector<HTMLElement>('[data-layer="front"]')!
      s.scrollTop = 0
      await new Promise((r) => requestAnimationFrame(r))
      const a = panel.getBoundingClientRect().top
      s.scrollTop = 100
      await new Promise((r) => requestAnimationFrame(r))
      return a - panel.getBoundingClientRect().top
    })
    expect(Math.abs(front - 100)).toBeLessThanOrEqual(1)
  })

  test("no text line straddles the hero's bottom edge, on the card or the entry page", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    // At the bottom of the scroll the hero's bottom edge is the window's bottom edge; the panel text is clipped there.
    const straddling = (el: ReturnType<typeof scroller>) =>
      el.evaluate(async (s) => {
        s.scrollTop = s.scrollHeight
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
        const edge = s.querySelector<HTMLElement>('[data-hero]')!.getBoundingClientRect().bottom
        return [...s.querySelectorAll<HTMLElement>('[data-layer="front"] .rounded-full')]
          .map((line) => line.getBoundingClientRect())
          .filter((r) => r.top < edge && r.bottom > edge).length
      })
    await page.goto('/')
    const cardScroller = card(page, 'parallax').locator('[data-scroller]')
    await cardScroller.scrollIntoViewIfNeeded()
    expect(await straddling(cardScroller)).toBe(0)
    await page.goto('/terms/parallax')
    expect(await straddling(scroller(page, 'parallax'))).toBe(0)
  })
})

test.describe('Scroll Snap', () => {
  test('controls rewrite the prompt', async ({ page }) => {
    await page.goto('/terms/scroll-snap')
    await expect(prompt(page)).toContainText('`scroll-snap-type: y mandatory`.')
    await expect(prompt(page)).toContainText('`scroll-padding-top: H`, `padding-top: H`, `padding-bottom: 48px`')
    await expect(prompt(page)).toContainText("block: 'start'")
    await option(page, 'Strictness', 'Proximity').click()
    await expect(prompt(page)).toContainText('`scroll-snap-type: y proximity` (rests on a panel only when released near one)')
    await expect(prompt(page)).not.toContainText('y mandatory')
    await option(page, 'Align', 'Center').click()
    await expect(prompt(page)).toContainText('`scroll-snap-align: center`')
    await expect(prompt(page)).toContainText('`padding-top: H + 24px`, `padding-bottom: 24px` (half of snap area height')
    await expect(prompt(page)).not.toContainText('`padding-bottom: 48px`')
  })

  test('the still frame rests on panel 3, and a stop at 1.4 panels settles on panel 2', async ({ page }) => {
    // Reduced motion keeps the demo still, and while it is still the scroller snaps with real CSS.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/terms/scroll-snap')
    await expect(demo(page, 'scroll-snap')).toHaveAttribute('data-playing', 'false')
    const el = scroller(page, 'scroll-snap')
    // Distance from a panel's top to the top of the snap area (the scroller's top plus its scroll-padding-top).
    const offsetOf = (n: number) =>
      el.evaluate((s, n) => {
        const panel = s.querySelector<HTMLElement>(`[data-panel="${n}"]`)!
        const padding = parseFloat(getComputedStyle(s).scrollPaddingTop)
        return panel.getBoundingClientRect().top - s.getBoundingClientRect().top - padding
      }, n)
    await expect.poll(() => offsetOf(3).then(Math.abs)).toBeLessThanOrEqual(1)
    await expect(el).toHaveCSS('scroll-snap-type', 'y mandatory')
    await el.evaluate((s) => {
      const stride = s.querySelector<HTMLElement>('[data-panel="2"]')!.offsetTop - s.querySelector<HTMLElement>('[data-panel="1"]')!.offsetTop
      s.scrollTop = 1.4 * stride
      s.dispatchEvent(new Event('scrollend'))
    })
    await expect.poll(() => offsetOf(2).then(Math.abs)).toBeLessThanOrEqual(1)

    await option(page, 'Strictness', 'Proximity').click()
    // proximity is the default strictness, so the computed value drops it.
    await expect(el).toHaveCSS('scroll-snap-type', 'y')
  })

  test('snapping is off while the demo drives the scroll and on once the visitor takes over', async ({ page }) => {
    await page.goto('/terms/scroll-snap')
    await expect(demo(page, 'scroll-snap')).toHaveAttribute('data-playing', 'true')
    const el = scroller(page, 'scroll-snap')
    await expect(el).toHaveCSS('scroll-snap-type', 'none')
    await el.hover()
    await page.mouse.wheel(0, 60)
    await expect(el).toHaveAttribute('data-taken-over', 'true')
    await expect(el).toHaveCSS('scroll-snap-type', 'y mandatory')
  })
})
