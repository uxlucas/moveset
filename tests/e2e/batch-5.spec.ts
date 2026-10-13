import { expect, test, type Locator, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow, trackErrors } from './helpers'

const card = (page: Page, slug: string) => page.locator(`[data-testid="term-card"][data-slug="${slug}"]`)
const demo = (page: Page, slug: string) => page.locator(`main [data-demo="${slug}"]`)
const prompt = (page: Page) => page.getByRole('main').locator('pre').first()
const option = (page: Page, control: string, name: string) =>
  page.getByRole('group', { name: control }).getByRole('button', { name, exact: true })

/** A mouse on desktop; a real touch (through CDP) on mobile, so `touch-action` and touch pointer events are in play. */
async function pointerOn(page: Page, target: Locator, isMobile: boolean) {
  const box = (await target.boundingBox())!
  const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  const cdp = isMobile ? await page.context().newCDPSession(page) : null
  return {
    down: async () => {
      if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [at] })
      else {
        await page.mouse.move(at.x, at.y)
        await page.mouse.down()
      }
    },
    up: async () => {
      if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      else await page.mouse.up()
    },
  }
}

for (const { slug, name, subject } of [
  { slug: 'duration', name: 'Duration', subject: '[data-duration-item]' },
  { slug: 'overshoot', name: 'Overshoot', subject: '[data-overshoot-chip]' },
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

test.describe('Duration', () => {
  const exitSwitch = (page: Page) => page.getByRole('switch', { name: 'Exits 25% faster' })
  const verdicts = (page: Page) =>
    demo(page, 'duration').locator('[data-duration-column]').evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.verdict))

  test('controls rewrite the prompt and the verdicts', async ({ page }) => {
    await page.goto('/terms/duration')
    await expect(prompt(page)).toContainText('Time this dropdown.')
    await expect(prompt(page)).toContainText('--duration-4: 300ms; --ease-out: cubic-bezier(0.23, 1, 0.32, 1)`.')
    await expect(prompt(page)).toContainText('press `--duration-1` on `--ease-out`')
    await expect(prompt(page)).toContainText('This dropdown: open 200ms (`var(--duration-2)`), close 150ms (`calc(var(--duration-2) * 0.75)`)')
    await expect(prompt(page)).toContainText('`transform-origin` at the trigger; `var(--ease-out)`.')
    await expect(prompt(page)).toContainText('Exits of overlays (menus, tooltips, dialogs, sheets, toasts): enter × 0.75, `calc(var(--duration-N) * 0.75)`. Hover and press are symmetric.')
    await expect(prompt(page)).toContainText('`transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}`, `exit={{ …, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }}`')
    await expect(prompt(page)).toContainText('Used 100+ times a day, or driven by the keyboard inside a component (arrow-key highlight, shortcut toggles): no animation.')
    await expect(prompt(page)).toContainText('Arrow-key highlight inside the menu: instant.')
    await expect(prompt(page)).not.toContainText('This tooltip')
    await expect(prompt(page)).not.toContainText('ease-drawer')
    await expect(prompt(page)).not.toContainText('Backdrop')
    await expect(prompt(page)).not.toContainText('the house default is enter × 0.75')
    expect(await verdicts(page)).toEqual(['right', 'slow', 'too slow'])

    await option(page, 'Element', 'Tooltip').click()
    await expect(prompt(page)).toContainText('This tooltip: open 150ms (`var(--duration-1)`), close 112.5ms (`calc(var(--duration-1) * 0.75)`)')
    await expect(prompt(page)).toContainText('`transform: scale(0.97)`')
    await expect(prompt(page)).not.toContainText('This dropdown')
    await expect(prompt(page)).not.toContainText('Arrow-key highlight')
    await expect(demo(page, 'duration').getByText('tooltip range 125–200ms')).toBeVisible()
    expect(await verdicts(page)).toEqual(['right', 'slow', 'too slow'])

    await option(page, 'Element', 'Sheet').click()
    await expect(prompt(page)).toContainText('This sheet: open 300ms (`var(--duration-4)`), close 225ms (`calc(var(--duration-4) * 0.75)`)')
    await expect(prompt(page)).toContainText('from the bottom edge; `var(--ease-drawer)` (`cubic-bezier(0.32, 0.72, 0, 1)`).')
    await expect(prompt(page)).toContainText('Backdrop, if any: `opacity` on the same open and close durations and curve.')
    await expect(prompt(page)).toContainText('ease: [0.32, 0.72, 0, 1] }}`, `exit={{ …, transition: { duration: 0.225, ease: [0.32, 0.72, 0, 1] } }}`')
    await expect(prompt(page)).toContainText('Reduced motion: no slide, `opacity` only (CSS: `transition-property: opacity`, closed `opacity: 0`, `transform: none`)')
    await expect(prompt(page)).not.toContainText('scale(0.9')
    await expect(prompt(page)).not.toContainText('`var(--ease-out)`.')
    // The same three numbers, judged against a bigger element: 150ms is now too quick for it.
    await expect.poll(() => verdicts(page)).toEqual(['abrupt', 'right', 'too slow'])

    await exitSwitch(page).click()
    await expect(exitSwitch(page)).toHaveAttribute('aria-checked', 'false')
    await expect(prompt(page)).toContainText('Exits of overlays (menus, tooltips, dialogs, sheets, toasts): same as the enter (the house default is enter × 0.75).')
    await expect(prompt(page)).toContainText('close 300ms (`var(--duration-4)`)')
    await expect(prompt(page)).toContainText('transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] } }}`')
    await expect(prompt(page)).not.toContainText('calc(var(--duration-N) * 0.75)')
    await expect(prompt(page)).not.toContainText('close 225ms')
    await exitSwitch(page).click()
    await expect(prompt(page)).toContainText('close 225ms')
  })

  test('each column runs its own duration open; closed it runs 0.75× with the toggle on, 1× with it off', async ({ page }) => {
    // Reduced motion keeps the demo on its still frame (all open), so the cycle never flips the items behind the test.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/terms/duration')
    await expect(demo(page, 'duration')).toHaveAttribute('data-playing', 'false')
    const durations = () =>
      demo(page, 'duration').evaluate((root) => {
        const items = [...root.querySelectorAll<HTMLElement>('[data-duration-item]')]
        const read = () => items.map((el) => parseFloat(getComputedStyle(el).transitionDuration) * 1000)
        const open = read()
        items.forEach((el) => (el.dataset.open = 'false'))
        const closed = read()
        items.forEach((el) => (el.dataset.open = 'true'))
        return { ms: items.map((el) => Number(el.dataset.ms)), open, closed }
      })
    for (const element of ['Dropdown', 'Tooltip', 'Sheet']) {
      await option(page, 'Element', element).click()
      for (const on of [true, false]) {
        if ((await page.getByRole('switch', { name: 'Exits 25% faster' }).getAttribute('aria-checked')) !== String(on)) {
          await page.getByRole('switch', { name: 'Exits 25% faster' }).click()
        }
        await expect.poll(async () => (await durations()).closed[0]).toBeCloseTo(on ? 112.5 : 150, 1)
        const d = await durations()
        expect(d.ms).toEqual([150, 300, 500])
        d.open.forEach((ms, i) => expect(ms).toBeCloseTo(d.ms[i], 1))
        d.closed.forEach((ms, i) => expect(ms).toBeCloseTo(d.ms[i] * (on ? 0.75 : 1), 1))
      }
    }
  })

  test('playing, all three open at the same instant and land in order of their durations', async ({ page }) => {
    await page.goto('/terms/duration')
    await expect(demo(page, 'duration')).toHaveAttribute('data-playing', 'true')
    await page.getByRole('button', { name: 'Replay' }).click()
    const landed = await demo(page, 'duration').evaluate(async (root) => {
      const frame = () => new Promise((r) => requestAnimationFrame(r))
      const items = [...root.querySelectorAll<HTMLElement>('[data-duration-item]')]
      // The replay closes them first; wait for the open.
      while (items.some((el) => el.dataset.open === 'true')) await frame()
      while (items.some((el) => el.dataset.open !== 'true')) await frame()
      const start = performance.now()
      const at: (number | null)[] = items.map(() => null)
      while (at.some((t) => t === null) && performance.now() - start < 1500) {
        items.forEach((el, i) => {
          if (at[i] === null && Number(getComputedStyle(el).opacity) >= 0.97) at[i] = performance.now() - start
        })
        await frame()
      }
      return at
    })
    const [a, b, c] = landed as number[]
    expect(a).toBeLessThan(b)
    expect(b).toBeLessThan(c)
    expect(c - a).toBeGreaterThan(150)
    expect(c).toBeLessThan(600)
  })

  const frame = (page: Page, ms: number, kind = 'dropdown') => demo(page, 'duration').getByRole('button', { name: `${ms}ms ${kind}`, exact: true })
  const hint = (page: Page) => demo(page, 'duration').locator('p[aria-hidden]')
  const stage = (page: Page) => demo(page, 'duration').locator('[data-taken-over]')
  /** data-open of the three items, by column. */
  const opens = (page: Page) =>
    demo(page, 'duration').locator('[data-duration-item]').evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.open))
  /** The computed transition-duration of one item, in ms. */
  const durationOf = (page: Page, ms: number) =>
    demo(page, 'duration')
      .locator(`[data-duration-item][data-ms="${ms}"]`)
      .evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration) * 1000)

  type Opened = { t: number; o: number }[]
  /** From the next pointerdown or click on, records the item's opacity every frame until it is fully opaque. */
  const recordOpen = (page: Page, ms: number) =>
    demo(page, 'duration')
      .locator(`[data-duration-item][data-ms="${ms}"]`)
      .evaluate((el) => {
        const rec: Opened = []
        ;(window as unknown as { rec: Opened }).rec = rec
        const start = () => {
          const t0 = performance.now()
          const tick = () => {
            const o = Number(getComputedStyle(el).opacity)
            rec.push({ t: performance.now() - t0, o })
            if (o < 0.999 && performance.now() - t0 < 1500) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
        window.addEventListener('pointerdown', start, { once: true, capture: true })
        window.addEventListener('keydown', start, { once: true, capture: true })
      })
  const recorded = (page: Page) => page.evaluate(() => (window as unknown as { rec: Opened }).rec)

  test('held, a frame opens its own element at its duration and the other two stay closed; let go, it closes at its exit duration', async ({ page, isMobile }) => {
    await page.goto('/terms/duration')
    await expect(demo(page, 'duration')).toHaveAttribute('data-playing', 'true')
    await expect(hint(page)).toHaveText('Hold a frame to play it')
    await expect(frame(page, 150)).toBeVisible()
    await expect(frame(page, 500)).toBeVisible()
    await recordOpen(page, 300)
    const pointer = await pointerOn(page, frame(page, 300), isMobile)
    await pointer.down()
    await expect(hint(page)).toHaveText('Let go to close it')
    await expect(frame(page, 300)).toHaveAttribute('aria-pressed', 'true')
    await expect(stage(page)).toHaveAttribute('data-taken-over', 'true')
    expect(await opens(page)).toEqual(['false', 'true', 'false'])
    expect(await durationOf(page, 300)).toBeCloseTo(300, 1)
    await page.waitForTimeout(600)
    const rec = await recorded(page)
    // It faded in over its own duration: in-between frames, never a jump, fully there between 150ms and 300ms (+slack).
    expect(rec.some((f) => f.o > 0.05 && f.o < 0.95)).toBe(true)
    for (let i = 1; i < rec.length; i++) expect(rec[i].o).toBeGreaterThanOrEqual(rec[i - 1].o - 0.001)
    const landed = rec.find((f) => f.o >= 0.999)!
    expect(landed.t).toBeGreaterThan(150)
    expect(landed.t).toBeLessThan(450)
    // Still held: the other two have not been opened by the cycle.
    expect(await opens(page)).toEqual(['false', 'true', 'false'])
    await pointer.up()
    await expect(frame(page, 300)).toHaveAttribute('aria-pressed', 'false')
    await expect(hint(page)).toHaveText('Hold a frame to play it')
    expect(await opens(page)).toEqual(['false', 'false', 'false'])
    expect(await durationOf(page, 300)).toBeCloseTo(225, 1)
    // The stage rests as the visitor left it.
    await page.waitForTimeout(300)
    expect(await opens(page)).toEqual(['false', 'false', 'false'])
    await expect(stage(page)).toHaveAttribute('data-taken-over', 'true')
    await expect(frame(page, 300)).toHaveAttribute('aria-pressed', 'false')
  })

  test('a hold ends the running cycle; Replay hands the stage back to it', async ({ page, isMobile }) => {
    await page.goto('/terms/duration')
    await expect(demo(page, 'duration')).toHaveAttribute('data-playing', 'true')
    const pointer = await pointerOn(page, frame(page, 150), isMobile)
    // The replay closes all three for 775ms before opening them. Hold during that beat.
    await page.getByRole('button', { name: 'Replay' }).click()
    await expect.poll(() => opens(page)).toEqual(['false', 'false', 'false'])
    await pointer.down()
    await expect(stage(page)).toHaveAttribute('data-taken-over', 'true')
    expect(await opens(page)).toEqual(['true', 'false', 'false'])
    // Past the moment the cycle would have opened all three: it did not.
    await page.waitForTimeout(1300)
    expect(await opens(page)).toEqual(['true', 'false', 'false'])
    await pointer.up()
    await expect.poll(() => opens(page)).toEqual(['false', 'false', 'false'])
    await expect(stage(page)).toHaveAttribute('data-taken-over', 'true')
    // Replay: a new cycle, all three open together again, and the buttons report it.
    await page.getByRole('button', { name: 'Replay' }).click()
    await expect(stage(page)).toHaveAttribute('data-taken-over', 'false')
    await expect.poll(() => opens(page), { timeout: 3000 }).toEqual(['true', 'true', 'true'])
    await expect(frame(page, 150)).toHaveAttribute('aria-pressed', 'true')
  })

  test('from the keyboard, Enter opens the frame (and it still animates) and Space closes it', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard')
    await page.goto('/terms/duration')
    await option(page, 'Element', 'Tooltip').click()
    await expect(demo(page, 'duration')).toHaveAttribute('data-playing', 'true')
    await expect(frame(page, 500, 'tooltip')).toBeVisible()
    await frame(page, 500, 'tooltip').focus()
    await recordOpen(page, 500)
    await page.keyboard.press('Enter')
    await expect(frame(page, 500, 'tooltip')).toHaveAttribute('aria-pressed', 'true')
    await expect(stage(page)).toHaveAttribute('data-taken-over', 'true')
    expect(await opens(page)).toEqual(['false', 'false', 'true'])
    expect(await durationOf(page, 500)).toBeCloseTo(500, 1)
    // The house focus ring, in the accent.
    const ring = await frame(page, 500, 'tooltip').evaluate((el) => {
      const s = getComputedStyle(el)
      // The accent, resolved by the same engine, so the two serialise alike.
      const probe = document.body.appendChild(document.createElement('span'))
      probe.style.color = 'var(--accent)'
      const accent = getComputedStyle(probe).color
      probe.remove()
      return { style: s.outlineStyle, width: s.outlineWidth, color: s.outlineColor, accent }
    })
    expect(ring.style).toBe('solid')
    expect(ring.width).toBe('2px')
    expect(ring.color).toBe(ring.accent)
    await page.waitForTimeout(700)
    const rec = await recorded(page)
    // Opening from the keyboard animates like a pointer open: in-between frames, landing after 300ms.
    expect(rec.some((f) => f.o > 0.05 && f.o < 0.95)).toBe(true)
    expect(rec.find((f) => f.o >= 0.999)!.t).toBeGreaterThan(300)
    await page.keyboard.press('Space')
    await expect(frame(page, 500, 'tooltip')).toHaveAttribute('aria-pressed', 'false')
    expect(await opens(page)).toEqual(['false', 'false', 'false'])
    expect(await durationOf(page, 500)).toBeCloseTo(375, 1)
    await page.keyboard.press('Enter')
    await expect(frame(page, 500, 'tooltip')).toHaveAttribute('aria-pressed', 'true')
  })

  /** The computed transform of one item. */
  const transformOf = (page: Page, ms: number) =>
    demo(page, 'duration').locator(`[data-duration-item][data-ms="${ms}"]`).evaluate((el) => getComputedStyle(el).transform)

  test('with reduced motion, the still frame stays and a hold fades the element over its duration without moving it', async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/terms/duration')
    await expect(demo(page, 'duration')).toHaveAttribute('data-playing', 'false')
    expect(await opens(page)).toEqual(['true', 'true', 'true'])
    await recordOpen(page, 500)
    const pointer = await pointerOn(page, frame(page, 500), isMobile)
    await pointer.down()
    await expect(frame(page, 500)).toHaveAttribute('aria-pressed', 'true')
    expect(await opens(page)).toEqual(['false', 'false', 'true'])
    // No scale while it fades in.
    expect(await transformOf(page, 500)).toBe('none')
    await page.waitForTimeout(700)
    const rec = await recorded(page)
    expect(rec.some((f) => f.o > 0.05 && f.o < 0.95)).toBe(true)
    expect(rec.find((f) => f.o >= 0.999)!.t).toBeGreaterThan(300)
    await pointer.up()
    await expect(frame(page, 500)).toHaveAttribute('aria-pressed', 'false')
    expect(await opens(page)).toEqual(['false', 'false', 'false'])
    // Closed and held, it does not slide off either.
    expect(await transformOf(page, 500)).toBe('none')

    // The sheet: no slide under reduced motion, a fade in place over the same durations.
    await option(page, 'Element', 'Sheet').click()
    await expect(frame(page, 500, 'sheet')).toBeVisible()
    // The control change hands the stage back: all three open and reported as pressed, not taken over any more.
    await expect(stage(page)).toHaveAttribute('data-taken-over', 'false')
    for (const ms of [150, 300, 500]) await expect(frame(page, ms, 'sheet')).toHaveAttribute('aria-pressed', 'true')
    await recordOpen(page, 500)
    const sheet = await pointerOn(page, frame(page, 500, 'sheet'), isMobile)
    await sheet.down()
    await expect(frame(page, 500, 'sheet')).toHaveAttribute('aria-pressed', 'true')
    expect(await transformOf(page, 500)).toBe('none')
    await page.waitForTimeout(700)
    const sheetRec = await recorded(page)
    expect(sheetRec.some((f) => f.o > 0.05 && f.o < 0.95)).toBe(true)
    expect(sheetRec.find((f) => f.o >= 0.999)!.t).toBeGreaterThan(300)
    await sheet.up()
    await expect(frame(page, 500, 'sheet')).toHaveAttribute('aria-pressed', 'false')
    expect(await transformOf(page, 500)).toBe('none')
    await expect.poll(() => demo(page, 'duration').locator('[data-duration-item][data-ms="500"]').evaluate((el) => getComputedStyle(el).opacity)).toBe('0')
  })

  test('on touch, a vertical swipe that starts on a frame scrolls the page and ends the hold', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch')
    await page.goto('/terms/duration')
    await expect(demo(page, 'duration')).toHaveAttribute('data-playing', 'true')
    await expect(frame(page, 300)).toBeVisible()
    const box = (await frame(page, 300).boundingBox())!
    const before = await page.evaluate(() => window.scrollY)
    const cdp = await page.context().newCDPSession(page)
    const x = box.x + box.width / 2
    const y = box.y + box.height / 2
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    for (let i = 1; i <= 12; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 20 }] })
      await page.waitForTimeout(16)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 100)
    // The touch opened the element, then the browser took the gesture as a scroll and cancelled the pointer: closed.
    await expect(frame(page, 300)).toHaveAttribute('aria-pressed', 'false')
    await expect(stage(page)).toHaveAttribute('data-taken-over', 'true')
  })

  test('the card on the index has no buttons in its frames', async ({ page }) => {
    await page.goto('/')
    await expect(card(page, 'duration').locator('[data-duration-frame]')).toHaveCount(3)
    await expect(card(page, 'duration').locator('button')).toHaveCount(0)
  })
})

test.describe('Overshoot', () => {
  test('controls rewrite the prompt', async ({ page }) => {
    await page.goto('/terms/overshoot')
    await expect(prompt(page)).toContainText('Give this element a slight overshoot when it arrives.')
    await expect(prompt(page)).toContainText('between its start (`translateX(0)`) and its target (`translateX(240px)`, the travel)')
    await expect(prompt(page)).toContainText('`cubic-bezier(0.34, 1.3, 0.64, 1)`: 3% of the travel past the target; settled on the target by 300ms from the first animated frame.')
    await expect(prompt(page)).toContainText('Return: 225ms `cubic-bezier(0.23, 1, 0.32, 1)` (ease-out), no overshoot.')
    await expect(prompt(page)).toContainText('`animate={{ x }}`, `initial={false}`,')
    await expect(prompt(page)).toContainText('never `opacity` (it clamps at 1)')
    await expect(prompt(page)).toContainText('CSS: set `data-instant` from `event.detail === 0`, `[data-instant] { transition-property: none }` after the placed rule, plus `@media (prefers-reduced-motion: reduce)`; Motion: `useReducedMotion()`, `duration: 0` chosen in the same render as `x`.')
    await expect(prompt(page)).not.toContainText('spring')
    await expect(prompt(page)).not.toContainText('cartoon')
    await expect(prompt(page)).not.toContainText('product range')
    await expect(prompt(page)).not.toContainText('Comparison only')

    await option(page, 'Amount', '15% (cartoon)').click()
    await expect(prompt(page)).toContainText('`cubic-bezier(0.34, 1.72, 0.64, 1)`: 15% of the travel past the target (cartoon; product UI stays at 2 to 5%)')
    await expect(prompt(page)).not.toContainText('1.3, 0.64')

    await option(page, 'Amount', '0').click()
    await expect(prompt(page)).toContainText('Move this element into place, with no overshoot.')
    await expect(prompt(page)).toContainText('`var(--ease-out)` (`cubic-bezier(0.23, 1, 0.32, 1)`): it never passes the target')
    await expect(prompt(page)).not.toContainText('of the travel past the target')

    await option(page, 'Amount', '8% (strong)').click()
    await expect(prompt(page)).toContainText('`cubic-bezier(0.34, 1.5, 0.64, 1)`: 8% of the travel past the target (above the 2 to 5% product range)')
    await option(page, 'Source', 'Spring').click()
    await expect(prompt(page)).toContainText('`{ type: "spring", duration: 0.3, bounce: 0.37 }` (over the house 0.3 bounce cap): about 7.8% of the travel past the target')
    await expect(prompt(page)).toContainText('`300ms linear(…)` with a point every 5ms or closer, sampled from that spring (`spring({ duration: 300, bounce: 0.37 }).next(t).value` from `motion`, last point 1)')
    await expect(prompt(page)).not.toContainText('cubic-bezier(0.34')
    await option(page, 'Amount', '3%').click()
    await expect(prompt(page)).toContainText('bounce: 0.25 }`: about 2.8% of the travel past the target')
    await expect(prompt(page)).not.toContainText('over the house')

    await option(page, 'Compare', 'No overshoot').click()
    await expect(prompt(page)).toContainText('Comparison only: a twin below on `cubic-bezier(0.23, 1, 0.32, 1)`, 300ms, same instants')
    await expect(demo(page, 'overshoot').locator('[data-overshoot-chip="twin"]')).toHaveCount(1)
    await option(page, 'Compare', 'None').click()
    await expect(prompt(page)).not.toContainText('Comparison only')
    await expect(demo(page, 'overshoot').locator('[data-overshoot-chip="twin"]')).toHaveCount(0)
  })

  // `peak`: what the prompt promises for that source. The springs land a little under the nominal amount (bounce 0.37
  // peaks at 7.8%, 0.48 at 14.8%), and the acceptance list says so.
  for (const c of [
    { amount: '3%', source: 'Back curve', peak: 0.03 },
    { amount: '15% (cartoon)', source: 'Back curve', peak: 0.15 },
    { amount: '8% (strong)', source: 'Spring', peak: 0.078 },
    { amount: '15% (cartoon)', source: 'Spring', peak: 0.148 },
    { amount: '0', source: 'Spring', peak: 0 },
  ]) {
    test(`${c.source}, ${c.amount}: the chip passes the target by the amount (±1%), settles on it, and goes home without overshoot`, async ({ page }) => {
      await page.goto('/terms/overshoot')
      await option(page, 'Amount', c.amount).click()
      await option(page, 'Source', c.source).click()
      await option(page, 'Compare', 'No overshoot').click()
      await expect(demo(page, 'overshoot')).toHaveAttribute('data-playing', 'true')
      await page.getByRole('button', { name: 'Replay' }).click()
      const r = await demo(page, 'overshoot').evaluate(async (root) => {
        const frame = () => new Promise((res) => requestAnimationFrame(res))
        const chip = root.querySelector<HTMLElement>('[data-overshoot-chip="main"]')!
        const twin = root.querySelector<HTMLElement>('[data-overshoot-chip="twin"]')!
        const x = (el: Element) => el.getBoundingClientRect().left - el.parentElement!.getBoundingClientRect().left
        const target = x(root.querySelector('[data-overshoot-target]')!)
        // The replay sends it home first (plain), then into the slot.
        while (chip.dataset.at !== 'a') await frame()
        const home: number[] = []
        while (chip.dataset.at === 'a') {
          home.push(x(chip))
          await frame()
        }
        const start = performance.now()
        const arrive: { t: number; x: number; twin: number }[] = []
        while (performance.now() - start < 700) {
          arrive.push({ t: performance.now() - start, x: x(chip), twin: x(twin) })
          await frame()
        }
        return { target, home, arrive }
      })
      const start = r.home.at(-1)!
      const travel = r.target - start
      expect(travel).toBeGreaterThan(100)
      // Home without overshoot: never below the start.
      expect(Math.min(...r.home)).toBeGreaterThanOrEqual(start - 0.5)
      const peak = Math.max(...r.arrive.map((f) => f.x))
      expect(Math.abs((peak - start) / travel - 1 - c.peak)).toBeLessThanOrEqual(0.01)
      if (c.peak === 0) expect(peak).toBeLessThanOrEqual(r.target + 0.5)
      // Settled on the target by the end of the 300ms arrival (one frame of slack), and the last frame is on it.
      for (const f of r.arrive.filter((f) => f.t > 320)) expect(Math.abs(f.x - r.target)).toBeLessThanOrEqual(0.5)
      expect(r.arrive.at(-1)!.x).toBeCloseTo(r.target, 0)
      // The plain twin, moved at the same instant, never passes the target.
      expect(Math.max(...r.arrive.map((f) => f.twin))).toBeLessThanOrEqual(r.target + 0.5)
      expect(r.arrive.at(-1)!.twin).toBeCloseTo(r.target, 0)
    })
  }

  test('with reduced motion, the still frame has the chip in its slot and nothing running', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/terms/overshoot')
    await expect(demo(page, 'overshoot')).toHaveAttribute('data-playing', 'false')
    const still = await demo(page, 'overshoot').evaluate((root) => {
      const chip = root.querySelector<HTMLElement>('[data-overshoot-chip]')!
      const slot = root.querySelector<HTMLElement>('[data-overshoot-target]')!
      return { dx: chip.getBoundingClientRect().left - slot.getBoundingClientRect().left, running: chip.getAnimations().length }
    })
    expect(Math.abs(still.dx)).toBeLessThanOrEqual(0.5)
    expect(still.running).toBe(0)
  })
})
