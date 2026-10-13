import { expect, test, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow, trackErrors } from './helpers'

const card = (page: Page, slug: string) => page.locator(`[data-testid="term-card"][data-slug="${slug}"]`)
const demo = (page: Page, slug: string) => page.locator(`main [data-demo="${slug}"]`)
const prompt = (page: Page) => page.getByRole('main').locator('pre').first()
const option = (page: Page, control: string, name: string) =>
  page.getByRole('group', { name: control }).getByRole('button', { name, exact: true })

for (const { slug, name, subject } of [
  { slug: 'spring', name: 'Spring', subject: '[data-spring-card]' },
  { slug: 'stagger', name: 'Stagger', subject: '[data-stagger-item]' },
]) {
  test(`${name}: the card links to its entry`, async ({ page }) => {
    await page.goto('/')
    await expect(card(page, slug).getByRole('link', { name })).toHaveAttribute('href', `/terms/${slug}`)
  })

  test(`${name}: the entry page renders`, async ({ page }) => {
    const errors = trackErrors(page)
    await page.goto(`/terms/${slug}`)
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
    await expect(demo(page, slug).locator(subject).first()).toBeVisible()
    await expectNoHorizontalOverflow(page)
    expect(errors).toEqual([])
  })
}

test.describe('Spring', () => {
  test('controls rewrite the prompt', async ({ page }) => {
    await page.goto('/terms/spring')
    await expect(prompt(page)).toContainText('`{ type: "spring", duration: 0.5, bounce: 0 }`, settled by 500ms')
    await expect(prompt(page)).toContainText('`{ type: "spring", stiffness: 341, damping: 36.9, mass: 1 }`')
    await expect(prompt(page)).toContainText('Bounce 0: never passes the target.')
    await expect(prompt(page)).toContainText('velocity: x.getVelocity()')
    await expect(prompt(page)).not.toContainText('Comparison only')
    await expect(prompt(page)).not.toContainText('cubic-bezier')

    await option(page, 'Bounce', '0.2').click()
    await expect(prompt(page)).toContainText('bounce: 0.2 }')
    await expect(prompt(page)).toContainText('stiffness: 324, damping: 28.8, mass: 1')
    await expect(prompt(page)).toContainText('passes the target by about 1.5% once')
    await expect(prompt(page)).not.toContainText('never passes the target')

    await option(page, 'Duration', '0.8s').click()
    await expect(prompt(page)).toContainText('`{ type: "spring", duration: 0.8, bounce: 0.2 }`, settled by 800ms')
    await expect(prompt(page)).toContainText('stiffness: 126, damping: 18, mass: 1')
    await expect(prompt(page)).toContainText('`transition: transform 800ms linear(…)`')
    await expect(prompt(page)).not.toContainText('500ms')

    await option(page, 'Bounce', '0.4 (playful)').click()
    await expect(prompt(page)).toContainText('about 9.5%; above the 0.3 cap')
    await expect(prompt(page)).toContainText('stiffness: 190, damping: 16.6, mass: 1')

    await option(page, 'Compare', 'Ease-out').click()
    await expect(prompt(page)).toContainText('Comparison only: a twin card below on `cubic-bezier(0.23, 1, 0.32, 1)` (ease-out), 800ms')
    await expect(demo(page, 'spring').locator('[data-twin-card]')).toHaveCount(1)
    await option(page, 'Compare', 'None').click()
    await expect(prompt(page)).not.toContainText('Comparison only')
    await expect(demo(page, 'spring').locator('[data-twin-card]')).toHaveCount(0)
  })

  test('clicked mid-move, the card carries its speed into the turn; the ease-out twin reverses at once', async ({ page }) => {
    await page.goto('/terms/spring')
    await option(page, 'Compare', 'Ease-out').click()
    await expect(demo(page, 'spring')).toHaveAttribute('data-playing', 'true')
    const result = await demo(page, 'spring').evaluate(async (root) => {
      const frame = () => new Promise((r) => requestAnimationFrame(r))
      const springCard = root.querySelector<HTMLElement>('[data-spring-card]')!
      const twin = root.querySelector<HTMLElement>('[data-twin-card]')!
      const x = (el: HTMLElement) => el.getBoundingClientRect().left - el.parentElement!.getBoundingClientRect().left
      const travel = springCard.parentElement!.clientWidth - springCard.offsetWidth
      // A pointer click (detail 1); element.click() reports detail 0, like Enter or Space, and jumps.
      const tap = () => springCard.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
      // Take over (the timeline then leaves the card alone) and jump it home with keyboard-style clicks, so the
      // move under test starts from rest at A: the first child of the track is the slot at A.
      springCard.click()
      if (springCard.dataset.side === 'b') springCard.click()
      const home = x(springCard.parentElement!.firstElementChild as HTMLElement)
      for (let still = 0; still < 3; ) {
        await frame()
        still = Math.abs(x(springCard) - home) < 0.5 ? still + 1 : 0
      }
      // Off toward B. Catch it well out, still moving fast, then click it back (on the frame clock, not wall time).
      tap()
      let prev = { s: x(springCard), t: x(twin) }
      let step = { s: 0, t: 0 }
      for (;;) {
        await frame()
        const now = { s: x(springCard), t: x(twin) }
        step = { s: now.s - prev.s, t: now.t - prev.t }
        prev = now
        if (now.s > travel * 0.35) break
      }
      tap()
      const after: { s: number; t: number }[] = []
      for (let i = 0; i < 4; i++) {
        await frame()
        const now = { s: x(springCard), t: x(twin) }
        after.push({ s: now.s - prev.s, t: now.t - prev.t })
        prev = now
      }
      return { before: step, after, side: springCard.dataset.side, taken: root.querySelector<HTMLElement>('[data-taken-over]')!.dataset.takenOver }
    })
    expect(result.side).toBe('a')
    expect(result.taken).toBe('true')
    // It was heading for B at speed.
    expect(result.before.s).toBeGreaterThan(2)
    // No jump: no step after the click is larger than the step before it.
    for (const { s } of result.after) expect(Math.abs(s)).toBeLessThanOrEqual(result.before.s + 1)
    // Momentum: the first frame after the click still moves toward B, slower than before.
    expect(result.after[0].s).toBeGreaterThan(0)
    expect(result.after[0].s).toBeLessThan(result.before.s)
    // Then a monotonic approach to A: the velocity toward A rises every frame (it slows, turns, speeds up).
    for (let i = 1; i < result.after.length; i++) expect(-result.after[i].s).toBeGreaterThan(-result.after[i - 1].s)
    // The ease-out twin, sent back at the same instant, reverses on the very next frame.
    expect(result.before.t).toBeGreaterThan(0)
    expect(result.after[0].t).toBeLessThan(0)
  })

  test('activated from the keyboard, the card jumps with no in-between frames', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard')
    await page.goto('/terms/spring')
    // Once playing, so the cycle's start (which hands control back to the timeline) can't land after the press.
    await expect(demo(page, 'spring')).toHaveAttribute('data-playing', 'true')
    const springCard = demo(page, 'spring').locator('[data-spring-card]')
    await springCard.focus()
    await page.keyboard.press('Enter')
    await expect(demo(page, 'spring').locator('[data-taken-over]')).toHaveAttribute('data-taken-over', 'true')
    const side = await springCard.getAttribute('data-side')
    const positions = await springCard.evaluate(async (el: HTMLElement) => {
      const frame = () => new Promise((r) => requestAnimationFrame(r))
      const x = () => el.getBoundingClientRect().left - el.parentElement!.getBoundingClientRect().left
      const before = x()
      // element.click() reports detail 0, exactly like Enter or Space on a button.
      el.click()
      const seen = [before]
      for (let i = 0; i < 3; i++) {
        await frame()
        seen.push(x())
      }
      return seen
    })
    expect(side).not.toBeNull()
    // From one end to the other in a single step, then still.
    expect(Math.abs(positions[1] - positions[0])).toBeGreaterThan(50)
    expect(positions[2]).toBeCloseTo(positions[1], 1)
    expect(positions[3]).toBeCloseTo(positions[1], 1)
  })
})

test.describe('Stagger', () => {
  test('controls rewrite the prompt', async ({ page }) => {
    await page.goto('/terms/stagger')
    await expect(prompt(page)).toContainText('60ms per step, first item first (`--n` = index)')
    await expect(prompt(page)).toContainText('animation-delay: calc(min(var(--n), 6) * 60ms)')
    await expect(prompt(page)).toContainText('delayChildren: (i) => Math.min(i, 6) * 0.06')
    await expect(prompt(page)).toContainText('no item waits more than 360ms')
    await expect(prompt(page)).not.toContainText('too slow')
    await expect(prompt(page)).not.toContainText('Comparison only')

    await option(page, 'Delay', '100ms').click()
    await expect(prompt(page)).toContainText('100ms per step (too slow; ship 30 to 80ms)')
    await expect(prompt(page)).toContainText('* 100ms)')
    await expect(prompt(page)).toContainText('Math.min(i, 6) * 0.1')
    await option(page, 'Delay', '30ms').click()
    await expect(prompt(page)).not.toContainText('too slow')
    await expect(prompt(page)).toContainText('no item waits more than 180ms')

    await option(page, 'Order', 'Reverse').click()
    await expect(prompt(page)).toContainText('last item first (`--n` = count - 1 - index)')
    await expect(prompt(page)).toContainText('Math.min(total - 1 - i, 6) * 0.03')
    await expect(prompt(page)).toContainText('staggerDirection: -1')
    await expect(prompt(page)).not.toContainText('first item first')
    await option(page, 'Order', 'Center out').click()
    await expect(prompt(page)).toContainText('middle out')
    await expect(prompt(page)).toContainText('stagger(0.03, { from: "center" })')
    await expect(prompt(page)).not.toContainText('staggerDirection')

    await option(page, 'Compare', 'All at once').click()
    await expect(prompt(page)).toContainText('Comparison only: a twin list beside it, every item at delay 0')
    await option(page, 'Compare', 'None').click()
    await expect(prompt(page)).not.toContainText('Comparison only')
  })

  test("item k's animation-delay is k × the delay, in every order; the twin's are all 0", async ({ page }) => {
    // Reduced motion keeps the demo on its still frame, so the computed values are stable.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/terms/stagger')
    await expect(demo(page, 'stagger')).toHaveAttribute('data-playing', 'false')
    const delays = (list: string) =>
      page.locator(`main [data-list="${list}"] [data-stagger-item]`).evaluateAll((els) =>
        els.map((el) => ({ n: Number((el as HTMLElement).dataset.n), delay: parseFloat(getComputedStyle(el).animationDelay) * 1000 })),
      )
    const expected = { Forward: [0, 1, 2, 3, 4, 5], Reverse: [5, 4, 3, 2, 1, 0], 'Center out': [2, 1, 0, 0, 1, 2] }
    for (const ms of [60, 30, 100]) {
      await option(page, 'Delay', `${ms}ms`).click()
      for (const [order, steps] of Object.entries(expected)) {
        await option(page, 'Order', order).click()
        await expect.poll(async () => (await delays('stagger')).map((d) => d.n)).toEqual(steps)
        for (const d of await delays('stagger')) expect(d.delay).toBeCloseTo(d.n * ms, 3)
      }
    }
    await option(page, 'Compare', 'All at once').click()
    await expect(page.locator('main [data-list="all"] [data-stagger-item]')).toHaveCount(6)
    for (const d of await delays('all')) expect(d.delay).toBe(0)
  })

  test('with reduced motion, every item is visible within one frame, with nothing animating', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/terms/stagger')
    await expect(demo(page, 'stagger')).toHaveAttribute('data-playing', 'false')
    const items = await demo(page, 'stagger').evaluate(async (root) => {
      await new Promise((r) => requestAnimationFrame(r))
      return [...root.querySelectorAll<HTMLElement>('[data-stagger-item]')].map((el) => ({
        opacity: getComputedStyle(el).opacity,
        running: el.getAnimations().length,
      }))
    })
    expect(items).toHaveLength(6)
    expect(items).toEqual(Array.from({ length: 6 }, () => ({ opacity: '1', running: 0 })))
  })

  test('playing, the items leave together and then cascade back in', async ({ page }) => {
    await page.goto('/terms/stagger')
    await expect(demo(page, 'stagger')).toHaveAttribute('data-playing', 'true')
    const stage = demo(page, 'stagger').locator('[data-phase]')
    // A replay starts a cycle at once: out first, then in.
    await page.getByRole('button', { name: 'Replay' }).click()
    await expect(stage).toHaveAttribute('data-phase', 'out')
    await expect(stage).toHaveAttribute('data-phase', 'in')
    const names = await stage.locator('[data-stagger-item]').evaluateAll((els) => els.map((el) => getComputedStyle(el).animationName))
    expect(names).toEqual(Array.from({ length: 6 }, () => 'demo-stagger-in'))
  })
})
