import { expect, test, type Locator, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow, trackErrors } from './helpers'

const card = (page: Page, slug: string) => page.locator(`[data-testid="term-card"][data-slug="${slug}"]`)
const demo = (page: Page, slug: string) => page.locator(`main [data-demo="${slug}"]`)
const prompt = (page: Page) => page.getByRole('main').locator('pre').first()
const option = (page: Page, control: string, name: string) =>
  page.getByRole('group', { name: control }).getByRole('button', { name, exact: true })
const stage = (page: Page, slug: string) => demo(page, slug).locator('[data-taken-over]')

type Frame = { t: number; o: number; m: string }
/** translateY and scale out of a computed `matrix(a, b, c, d, tx, ty)`; `none` is in place at scale 1. */
const ty = (m: string) => (m === 'none' ? 0 : Number(m.match(/matrix\(([^)]*)\)/)![1].split(',')[5]))
const sc = (m: string) => (m === 'none' ? 1 : Number(m.match(/matrix\(([^)]*)\)/)![1].split(',')[0]))
const inPlace = (m: string) => m === 'none' || m === 'matrix(1, 0, 0, 1, 0, 0)'

/**
 * From the next pointerdown or keydown on, records the element's computed opacity and transform every frame for
 * `forMs`. The listeners are on window in the capture phase, so the first frame is the state before the click lands.
 */
const startRecording = (target: Locator, forMs = 900) =>
  target.evaluate((el, forMs) => {
    const rec: Frame[] = []
    ;(window as unknown as { rec: Frame[] }).rec = rec
    let started = false
    const start = () => {
      if (started) return
      started = true
      const t0 = performance.now()
      const tick = () => {
        const s = getComputedStyle(el)
        rec.push({ t: performance.now() - t0, o: Number(s.opacity), m: s.transform })
        if (performance.now() - t0 < forMs) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }
    window.addEventListener('pointerdown', start, { once: true, capture: true })
    window.addEventListener('keydown', start, { once: true, capture: true })
    window.addEventListener('click', start, { once: true, capture: true })
  }, forMs)
const recorded = (page: Page) => page.evaluate(() => (window as unknown as { rec: Frame[] }).rec)
/** The frames from the first one whose opacity differs from the frame before: the animation proper. */
function animated(rec: Frame[]): Frame[] {
  const i = rec.findIndex((f, k) => k > 0 && Math.abs(f.o - rec[k - 1].o) > 0.001)
  return i < 0 ? [] : rec.slice(i - 1)
}
const between = (rec: Frame[]) => rec.some((f) => f.o > 0.05 && f.o < 0.95)

for (const { slug, name, subject } of [
  { slug: 'enter-and-exit', name: 'Enter and Exit', subject: '[data-toast]' },
  { slug: 'icon-swap', name: 'Icon Swap', subject: '[data-icon-swap]' },
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

  test(`${name}: the card on the index takes no input`, async ({ page }) => {
    await page.goto('/')
    await expect(card(page, slug).locator(subject)).toHaveCount(1)
    await expect(card(page, slug).locator('button')).toHaveCount(0)
  })
}

test.describe('Enter and Exit', () => {
  const toast = (page: Page) => demo(page, 'enter-and-exit').locator('[data-toast]')
  const show = (page: Page) => demo(page, 'enter-and-exit').getByRole('button', { name: 'Send' })
  const dismiss = (page: Page) => demo(page, 'enter-and-exit').getByRole('button', { name: 'Dismiss toast' })
  const exitLabel = (page: Page) => demo(page, 'enter-and-exit').locator('[data-exit-label]')
  const enterLabel = (page: Page) => demo(page, 'enter-and-exit').locator('[data-enter-label]')
  const durationOf = (page: Page) => toast(page).evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration) * 1000)
  /** Waits for the entry page's first cycle to leave the toast resting in place. */
  const settled = async (page: Page) => {
    await expect(demo(page, 'enter-and-exit')).toHaveAttribute('data-playing', 'true')
    await expect(toast(page)).toHaveAttribute('data-state', 'open')
    await expect.poll(() => toast(page).evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
  }

  test('controls rewrite the prompt and the labels', async ({ page }) => {
    await page.goto('/terms/enter-and-exit')
    await expect(prompt(page)).toContainText('Give this toast an enter and an exit.')
    await expect(prompt(page)).toContainText('Bottom centre of its `position: relative` container, 16px up.')
    await expect(prompt(page)).toContainText('Enter: `opacity` 0 to 1 and `transform: translateY(16px)` to `none`, 200ms (`var(--duration-2)`), `var(--ease-out)`.')
    await expect(prompt(page)).toContainText('Exit: `opacity` 1 to 0 and `translateY(0)` to `translateY(4px)`, toward the edge it came from, 150ms (`calc(var(--duration-2) * 0.75)`), same curve. A few pixels, never the full 16px back.')
    await expect(prompt(page)).toContainText('First paint: nothing already on screen gets an entrance.')
    // The focus return sits in the shared keyboard bullet, so both routes get it.
    await expect(prompt(page)).toContainText('(Enter on the trigger or Dismiss). Dismissed with focus inside, `trigger.focus({ preventScroll: true })` before closing.')
    await expect(prompt(page)).not.toContainText('Escape')
    await expect(prompt(page)).toContainText(
      "CSS route: keep it mounted; `data-state` on the toast. `open`: `opacity: 1; visibility: visible; transform: none`, `transition-duration: 200ms`. `closing`, the base rule: the exit target `opacity: 0; visibility: hidden; transform: translateY(4px)`, 150ms, `transition-property: opacity, transform, visibility`. `closed`, set on its own `opacity` `transitionend` (`event.target` is the toast, `propertyName === 'opacity'`): as `closing` at `translateY(16px)`, the enter origin, `transition-duration: 0ms`.",
    )
    await expect(prompt(page)).toContainText('`<AnimatePresence initial={false}>`; `initial={{ opacity: 0, y: 16 }}`, `animate={{ opacity: 1, y: 0 }}`, `transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}`, `exit={{ opacity: 0, y: 4, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }}`; it unmounts after the exit.')
    await expect(prompt(page)).toContainText('Reduced motion: `opacity` only, same durations. CSS: `transform: none` in every state; Motion: `useReducedMotion()` zeroes `y`.')
    await expect(prompt(page)).not.toContainText('the house ships')
    await expect(enterLabel(page)).toHaveText('enter 200ms, 16px')
    await expect(exitLabel(page)).toHaveText('exit 150ms, 4px')

    await option(page, 'Exit', 'Mirrored').click()
    await expect(prompt(page)).toContainText('Exit: `opacity` 1 to 0 and `translateY(0)` to `translateY(16px)`, 200ms: same curve and duration, the full travel back (`--ease-out`, not reversed; the house ships 4px over 150ms, 0.75 × the enter).')
    await expect(prompt(page)).toContainText('`closing`, the base rule: the exit target `opacity: 0; visibility: hidden; transform: translateY(16px)`, 200ms,')
    await expect(prompt(page)).toContainText('`exit={{ opacity: 0, y: 16, transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] } }}`')
    await expect(prompt(page)).not.toContainText('translateY(4px)')
    await expect(exitLabel(page)).toHaveText('exit 200ms, 16px')

    await option(page, 'Exit', 'None').click()
    await expect(prompt(page)).toContainText('Exit: no transition; it is gone in the next frame (the house ships `opacity` to 0 and 4px toward the edge over 150ms, 0.75 × the enter).')
    await expect(prompt(page)).toContainText('`closed` at once, the base rule: `opacity: 0; visibility: hidden; transform: translateY(16px)`, the enter origin, `transition-duration: 0ms`.')
    await expect(prompt(page)).toContainText('`exit={{ opacity: 0, transition: { duration: 0 } }}`')
    await expect(prompt(page)).not.toContainText('transitionend')
    await expect(exitLabel(page)).toHaveText('exit none')

    await option(page, 'Exit', 'Quiet').click()
    await option(page, 'Travel', '8px').click()
    await expect(prompt(page)).toContainText('`transform: translateY(8px)` to `none`')
    await expect(prompt(page)).toContainText('never the full 8px back.')
    await expect(prompt(page)).toContainText('`initial={{ opacity: 0, y: 8 }}`')
    await expect(prompt(page)).toContainText('`exit={{ opacity: 0, y: 4, transition: { duration: 0.15')
    // The travel is 8px everywhere; the 16px that remains is the container inset in the setup line.
    await expect(prompt(page)).not.toContainText('translateY(16px)')
    await expect(prompt(page)).not.toContainText('y: 16')
    await expect(prompt(page)).not.toContainText('full 16px')
    await expect(enterLabel(page)).toHaveText('enter 200ms, 8px')
    await expect(exitLabel(page)).toHaveText('exit 150ms, 4px')
  })

  test('the toast runs the enter duration open, the exit duration of the chosen exit closing, and none closed', async ({ page }) => {
    // Reduced motion keeps the demo on its still frame (open), so the cycle never flips the state behind the test.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/terms/enter-and-exit')
    await expect(demo(page, 'enter-and-exit')).toHaveAttribute('data-playing', 'false')
    const durations = () =>
      toast(page).evaluate((el) => {
        const read = () => parseFloat(getComputedStyle(el).transitionDuration) * 1000
        const open = read()
        el.dataset.state = 'closing'
        const closing = read()
        el.dataset.state = 'closed'
        const closed = read()
        el.dataset.state = 'open'
        return { open, closing, closed }
      })
    for (const { exit, ms } of [
      { exit: 'Quiet', ms: 150 },
      { exit: 'Mirrored', ms: 200 },
      { exit: 'None', ms: 0 },
    ]) {
      await option(page, 'Exit', exit).click()
      await expect.poll(async () => (await durations()).closing).toBeCloseTo(ms, 1)
      const d = await durations()
      expect(d.open).toBeCloseTo(200, 1)
      // `closed` is reached in no time, so a show right after the exit starts from the full travel.
      expect(d.closed).toBe(0)
    }
  })

  test('Dismiss plays the quiet exit and takes the stage; Send plays the enter from the travel', async ({ page }) => {
    await page.goto('/terms/enter-and-exit')
    await settled(page)
    await startRecording(toast(page), 700)
    await dismiss(page).click()
    await expect(stage(page, 'enter-and-exit')).toHaveAttribute('data-taken-over', 'true')
    expect(await durationOf(page)).toBeCloseTo(150, 1)
    // The exit rests at the enter origin once its transition has ended, hidden to the tab order.
    await expect(toast(page)).toHaveAttribute('data-state', 'closed')
    await expect(toast(page)).toHaveCSS('visibility', 'hidden')
    await page.waitForTimeout(800)
    const exit = animated(await recorded(page))
    // In-between frames, opacity only ever falling, gone by 150ms (+slack), and never more than 4px down or any up.
    expect(between(exit)).toBe(true)
    for (let i = 1; i < exit.length; i++) expect(exit[i].o).toBeLessThanOrEqual(exit[i - 1].o + 0.001)
    const gone = exit.find((f) => f.o <= 0.001)!
    expect(gone.t - exit[0].t).toBeGreaterThan(60)
    expect(gone.t - exit[0].t).toBeLessThan(300)
    const travelled = exit.filter((f) => f.t <= gone.t).map((f) => ty(f.m))
    expect(Math.max(...travelled)).toBeLessThanOrEqual(4.5)
    expect(Math.min(...travelled)).toBeGreaterThanOrEqual(-0.5)
    expect(ty(gone.m)).toBeCloseTo(4, 0)
    // The stage rests as the visitor left it: past the moment the cycle would have shown it again, it has not.
    await page.waitForTimeout(1200)
    await expect(toast(page)).toHaveAttribute('data-state', 'closed')

    await startRecording(toast(page), 700)
    await show(page).click()
    await expect(toast(page)).toHaveAttribute('data-state', 'open')
    expect(await durationOf(page)).toBeCloseTo(200, 1)
    await page.waitForTimeout(800)
    const enter = animated(await recorded(page))
    // From 16px below at opacity 0, rising and fading in, in place by 200ms (+slack).
    expect(ty(enter[0].m)).toBeCloseTo(16, 0)
    expect(enter[0].o).toBe(0)
    expect(between(enter)).toBe(true)
    for (let i = 1; i < enter.length; i++) {
      expect(enter[i].o).toBeGreaterThanOrEqual(enter[i - 1].o - 0.001)
      expect(ty(enter[i].m)).toBeLessThanOrEqual(ty(enter[i - 1].m) + 0.01)
    }
    const landed = enter.find((f) => f.o >= 0.999 && Math.abs(ty(f.m)) < 0.5)!
    expect(landed.t - enter[0].t).toBeGreaterThan(100)
    expect(landed.t - enter[0].t).toBeLessThan(400)
    await expect(toast(page)).toHaveCSS('visibility', 'visible')
  })

  test('the mirrored exit slides the full travel back at the enter duration; none is gone in the next frame', async ({ page }) => {
    await page.goto('/terms/enter-and-exit')
    await option(page, 'Exit', 'Mirrored').click()
    await settled(page)
    await startRecording(toast(page), 700)
    await dismiss(page).click()
    expect(await durationOf(page)).toBeCloseTo(200, 1)
    await page.waitForTimeout(800)
    const mirrored = animated(await recorded(page))
    expect(between(mirrored)).toBe(true)
    const gone = mirrored.find((f) => f.o <= 0.001)!
    expect(gone.t - mirrored[0].t).toBeGreaterThan(120)
    expect(gone.t - mirrored[0].t).toBeLessThan(380)
    expect(ty(gone.m)).toBeCloseTo(16, 0)

    await option(page, 'Exit', 'None').click()
    // The control change hands the stage back; the cycle plays again and rests open.
    await expect(stage(page, 'enter-and-exit')).toHaveAttribute('data-taken-over', 'false')
    await settled(page)
    await startRecording(toast(page), 400)
    await dismiss(page).click()
    expect(await durationOf(page)).toBe(0)
    await page.waitForTimeout(500)
    const none = await recorded(page)
    // No in-between frames: every frame is at 1 or at 0.
    expect(none.every((f) => f.o === 1 || f.o === 0)).toBe(true)
    expect(none.at(-1)!.o).toBe(0)
    await expect(toast(page)).toHaveCSS('visibility', 'hidden')
  })

  test('shown again mid-exit, the toast turns back from where it is', async ({ page }) => {
    await page.goto('/terms/enter-and-exit')
    await settled(page)
    await startRecording(toast(page), 600)
    // Two clicks 35ms apart, from inside the page: a round trip through Playwright would outlast the 150ms exit.
    await demo(page, 'enter-and-exit').evaluate(async (root) => {
      root.querySelector<HTMLElement>('[data-toast-dismiss]')!.click()
      await new Promise((r) => setTimeout(r, 35))
      root.querySelector<HTMLElement>('[data-toast-trigger]')!.click()
    })
    await expect(toast(page)).toHaveAttribute('data-state', 'open')
    await page.waitForTimeout(700)
    const rec = animated(await recorded(page))
    // Opacity falls, then rises again from where it got to: it never reaches 0, never restarts from 0, and once it
    // has turned it only rises.
    const low = Math.min(...rec.map((f) => f.o))
    expect(low).toBeGreaterThan(0.05)
    const turn = rec.findIndex((f) => f.o === low)
    for (let i = turn + 1; i < rec.length; i++) expect(rec[i].o).toBeGreaterThanOrEqual(rec[i - 1].o - 0.001)
    expect(rec.at(-1)!.o).toBe(1)
    expect(Math.max(...rec.map((f) => ty(f.m)))).toBeLessThanOrEqual(4.5)
  })

  test('from the keyboard, Enter on Dismiss plays the exit and hands focus to Send; Space on Send plays the enter', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard')
    await page.goto('/terms/enter-and-exit')
    await settled(page)
    await dismiss(page).focus()
    await startRecording(toast(page), 600)
    await page.keyboard.press('Enter')
    await expect(toast(page)).toHaveAttribute('data-state', 'closed')
    await expect(stage(page, 'enter-and-exit')).toHaveAttribute('data-taken-over', 'true')
    // Focus was inside the toast, so it moves to the trigger rather than dropping to body.
    await expect(show(page)).toBeFocused()
    await page.waitForTimeout(700)
    expect(between(animated(await recorded(page)))).toBe(true)
    // Closed, the Dismiss button is out of the tab order: Tab from the trigger lands past it.
    await show(page).focus()
    await startRecording(toast(page), 600)
    await page.keyboard.press('Space')
    await expect(toast(page)).toHaveAttribute('data-state', 'open')
    await page.waitForTimeout(700)
    const enter = animated(await recorded(page))
    expect(between(enter)).toBe(true)
    expect(ty(enter[0].m)).toBeCloseTo(16, 0)
  })

  test('with reduced motion, the still frame rests in place and Play keeps the travel', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/terms/enter-and-exit')
    await expect(demo(page, 'enter-and-exit')).toHaveAttribute('data-playing', 'false')
    await expect(toast(page)).toHaveAttribute('data-state', 'open')
    const still = await toast(page).evaluate((el) => ({ o: getComputedStyle(el).opacity, m: getComputedStyle(el).transform, running: el.getAnimations().length }))
    expect(still.o).toBe('1')
    expect(inPlace(still.m)).toBe(true)
    expect(still.running).toBe(0)

    // Play once is the visitor asking for the demo: the exit and the enter keep their travel, so the exit options
    // still differ. The cycle exits at once and enters 600ms later from 16px below.
    await startRecording(toast(page), 1400)
    await page.getByRole('button', { name: 'Play Enter and Exit demo' }).click()
    await expect(demo(page, 'enter-and-exit')).toHaveAttribute('data-playing', 'true')
    await expect(stage(page, 'enter-and-exit')).toHaveAttribute('data-taken-over', 'false')
    await page.waitForTimeout(1500)
    const play = animated(await recorded(page))
    expect(between(play)).toBe(true)
    const visible = play.filter((f) => f.o > 0.05)
    expect(Math.max(...visible.map((f) => ty(f.m)))).toBeGreaterThan(2)
    expect(Math.max(...play.map((f) => ty(f.m)))).toBeCloseTo(16, 0)
    expect(play.at(-1)!.o).toBe(1)
  })

  test('with reduced motion, a gesture fades without moving', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/terms/enter-and-exit')
    await expect(demo(page, 'enter-and-exit')).toHaveAttribute('data-playing', 'false')
    await expect(toast(page)).toHaveAttribute('data-state', 'open')
    // The still frame is also the server HTML; the Play button only renders once hydrated, so the click lands.
    await expect(page.getByRole('button', { name: 'Play Enter and Exit demo' })).toBeVisible()

    await startRecording(toast(page), 600)
    await dismiss(page).click()
    await expect(toast(page)).toHaveAttribute('data-state', 'closed')
    await page.waitForTimeout(700)
    const exit = animated(await recorded(page))
    expect(between(exit)).toBe(true)
    expect(exit.every((f) => inPlace(f.m))).toBe(true)
    const gone = exit.find((f) => f.o <= 0.001)!
    expect(gone.t - exit[0].t).toBeLessThan(300)

    await startRecording(toast(page), 600)
    await show(page).click()
    await expect(toast(page)).toHaveAttribute('data-state', 'open')
    await page.waitForTimeout(700)
    const enter = animated(await recorded(page))
    expect(between(enter)).toBe(true)
    expect(enter.every((f) => inPlace(f.m))).toBe(true)
    expect(enter.at(-1)!.o).toBe(1)
  })
})

test.describe('Icon Swap', () => {
  const button = (page: Page) => demo(page, 'icon-swap').locator('[data-icon-swap]')
  const icon = (page: Page, which: 'a' | 'b') => demo(page, 'icon-swap').locator(`[data-icon="${which}"]`)
  const label = (page: Page) => demo(page, 'icon-swap').locator('[data-swap-label]')
  const status = (page: Page) => demo(page, 'icon-swap').locator('[data-swap-status]')
  const styles = (page: Page, which: 'a' | 'b') =>
    icon(page, which).evaluate((el) => {
      const s = getComputedStyle(el)
      return { o: s.opacity, m: s.transform, f: s.filter, d: s.transitionDuration, e: s.transitionTimingFunction }
    })

  test('controls rewrite the prompt and the label', async ({ page }) => {
    await page.goto('/terms/icon-swap')
    await expect(prompt(page)).toContainText("Swap this button's icon when its state changes: copy to check.")
    await expect(prompt(page)).toContainText('The incoming icon `scale` 0.3 to 1, `opacity` 0 to 1, `filter: blur(3px)` to `blur(0px)`; the outgoing icon the reverse, together, in the same spot. Bounce 0.')
    await expect(prompt(page)).toContainText('The button: `<button type="button">`, `position: relative; display: grid; place-items: center`, 44px square; icons 16px.')
    await expect(prompt(page)).toContainText('CSS route: both icons in the button, the first state\'s in flow, the other `position: absolute; inset: 0; margin: auto; width: 16px; height: 16px`; nothing unmounts. `data-on="true"` on the button (`"false"` off) picks the shown one; the hidden one holds `opacity: 0; transform: scale(0.3); filter: blur(3px);`. `transition-property: opacity, transform, filter`, 300ms, `cubic-bezier(0.25, 0.1, 0, 1)`.')
    await expect(prompt(page)).toContainText('Motion route: in the button, `<AnimatePresence mode="popLayout" initial={false}>` around one `motion.span`, `display: grid`, keyed by the state; `initial` and `exit` `{ opacity: 0, scale: 0.3, filter: \'blur(3px)\' }`, `animate` `{ opacity: 1, scale: 1, filter: \'blur(0px)\' }`, `transition={{ type: "spring", duration: 0.35, bounce: 0 }}`.')
    await expect(prompt(page)).toContainText('No swap on page load: the first icon is painted at rest (`initial={false}`).')
    await expect(prompt(page)).toContainText('`aria-label="Copy"` stays. Set copied and announce `Copied` (`role="status"`) on the click, not when the swap settles; revert after 1.5s (a second click restarts it).')
    await expect(prompt(page)).toContainText('Reduced motion: `opacity` only, same duration. CSS: `transform: none; filter: none`, repeating the state selectors (or `!important`), or `[data-on="true"]` wins; Motion: `useReducedMotion()` drops `scale` and `filter`.')
    await expect(prompt(page)).not.toContainText('the house')
    await expect(label(page)).toHaveText('scale 0.3 · blur 3px · 300ms')

    await option(page, 'Depth', '0.8 (timid)').click()
    await expect(prompt(page)).toContainText('`scale` 0.8 to 1 (a glitch; the house ships 0.3), `opacity` 0 to 1, `filter: blur(3px)` to `blur(0px)`')
    await expect(prompt(page)).toContainText('transform: scale(0.8);')
    await expect(prompt(page)).toContainText('`{ opacity: 0, scale: 0.8, filter: \'blur(3px)\' }`')
    await expect(label(page)).toHaveText('scale 0.8 · blur 3px · 300ms')

    await option(page, 'Depth', 'None (fade only)').click()
    await expect(prompt(page)).toContainText('`opacity` 0 to 1 only, no scale (a flicker; the house ships `scale` 0.3 to 1), `filter: blur(3px)` to `blur(0px)`')
    await expect(prompt(page)).toContainText('the hidden one holds `opacity: 0; filter: blur(3px);`')
    await expect(prompt(page)).toContainText('`{ opacity: 0, filter: \'blur(3px)\' }`')
    // Only what this variant animates is named: no `transform` in the transition or the reduced-motion override.
    await expect(prompt(page)).toContainText('`transition-property: opacity, filter`, 300ms,')
    await expect(prompt(page)).toContainText('CSS: `filter: none`, repeating the state selectors')
    await expect(prompt(page)).toContainText('Motion: `useReducedMotion()` drops `filter`.')
    await expect(prompt(page)).not.toContainText('transform')
    await expect(label(page)).toHaveText('no scale · blur 3px · 300ms')

    await page.getByRole('switch', { name: 'Blur 3px' }).click()
    await expect(prompt(page)).toContainText('no blur (the house adds `filter: blur(3px)` to `blur(0px)`)')
    await expect(prompt(page)).toContainText('the hidden one holds `opacity: 0;`')
    await expect(prompt(page)).toContainText('`transition-property: opacity`, 300ms,')
    await expect(prompt(page)).toContainText('`{ opacity: 0 }`, `animate` `{ opacity: 1 }`')
    await expect(prompt(page)).toContainText('Reduced motion: as the default, `opacity` only over the same duration; no `transform` or `filter` transition is declared.')
    await expect(prompt(page)).not.toContainText('useReducedMotion')
    await expect(label(page)).toHaveText('no scale · no blur · 300ms')

    await option(page, 'Depth', '0.3 (house)').click()
    await expect(prompt(page)).toContainText('`scale` 0.3 to 1, `opacity` 0 to 1, no blur (the house adds')
    await expect(prompt(page)).toContainText('`transition-property: opacity, transform`, 300ms,')
    await expect(prompt(page)).toContainText('CSS: `transform: none`, repeating the state selectors')
    await expect(prompt(page)).toContainText('Motion: `useReducedMotion()` drops `scale`.')
    await page.getByRole('switch', { name: 'Blur 3px' }).click()

    await option(page, 'Pair', 'Play → pause').click()
    await expect(prompt(page)).toContainText('play to pause.')
    await expect(prompt(page)).toContainText('`aria-label` `Play`, then `Pause`, set on the click, not when the swap settles; a second click swaps back.')
    await expect(prompt(page)).not.toContainText('role="status"')
    await expect(label(page)).toHaveText('scale 0.3 · blur 3px · 300ms')
    await option(page, 'Pair', 'Heart → filled').click()
    await expect(prompt(page)).toContainText('heart to filled heart.')
    await expect(prompt(page)).toContainText('`aria-label="Like"` and `aria-pressed` for the state, set on the click, not when the swap settles; a second click unsets it.')
    await expect(prompt(page)).not.toContainText('then `')
  })

  test('each depth and blur sets the hidden icon; both icons share the duration and curve', async ({ page }) => {
    await page.goto('/terms/icon-swap')
    // Play toggles, so the second press below swaps straight back.
    await option(page, 'Pair', 'Play → pause').click()
    for (const { depth, blur, m, f } of [
      { depth: '0.3 (house)', blur: true, m: 'matrix(0.3, 0, 0, 0.3, 0, 0)', f: 'blur(3px)' },
      { depth: '0.8 (timid)', blur: true, m: 'matrix(0.8, 0, 0, 0.8, 0, 0)', f: 'blur(3px)' },
      { depth: 'None (fade only)', blur: false, m: 'matrix(1, 0, 0, 1, 0, 0)', f: 'blur(0px)' },
      { depth: '0.3 (house)', blur: false, m: 'matrix(0.3, 0, 0, 0.3, 0, 0)', f: 'blur(0px)' },
    ]) {
      await option(page, 'Depth', depth).click()
      if ((await page.getByRole('switch', { name: 'Blur 3px' }).getAttribute('aria-checked')) !== String(blur)) {
        await page.getByRole('switch', { name: 'Blur 3px' }).click()
      }
      // A control change hands the stage back to the cycle; a press takes it and leaves the swapped icon resting.
      await expect(stage(page, 'icon-swap')).toHaveAttribute('data-taken-over', 'false')
      await expect(demo(page, 'icon-swap')).toHaveAttribute('data-playing', 'true')
      await expect.poll(() => button(page).getAttribute('data-on')).toBe('false')
      await button(page).click()
      await expect(button(page)).toHaveAttribute('data-on', 'true')
      await page.waitForTimeout(450)
      const a = await styles(page, 'a')
      const b = await styles(page, 'b')
      expect(a.o).toBe('0')
      expect(a.m).toBe(m)
      expect(a.f).toBe(f)
      expect(b.o).toBe('1')
      expect(b.m).toBe('none')
      expect(b.f).toBe('blur(0px)')
      for (const s of [a, b]) {
        expect(parseFloat(s.d)).toBeCloseTo(0.3, 2)
        expect(s.e).toBe('cubic-bezier(0.25, 0.1, 0, 1)')
      }
      await button(page).click()
      await expect(button(page)).toHaveAttribute('data-on', 'false')
    }
  })

  test('a press swaps the icon with depth, updates the label at once and takes the stage', async ({ page }) => {
    await page.goto('/terms/icon-swap')
    await option(page, 'Pair', 'Play → pause').click()
    await expect(demo(page, 'icon-swap')).toHaveAttribute('data-playing', 'true')
    await expect.poll(() => button(page).getAttribute('data-on')).toBe('false')
    const box = (await button(page).boundingBox())!
    expect(box.width).toBeGreaterThanOrEqual(44)
    expect(box.height).toBeGreaterThanOrEqual(44)
    const sizeBefore = await button(page).evaluate((el: HTMLElement) => [el.offsetWidth, el.offsetHeight])
    await expect(button(page)).toHaveAttribute('aria-label', 'Play')
    await startRecording(icon(page, 'b'), 600)
    await button(page).click()
    await expect(button(page)).toHaveAttribute('aria-label', 'Pause')
    await expect(stage(page, 'icon-swap')).toHaveAttribute('data-taken-over', 'true')
    await page.waitForTimeout(700)
    const rec = animated(await recorded(page))
    // The check grows from 0.3 toward 1 without passing it, fading in, settled by 300ms (+slack).
    expect(sc(rec[0].m)).toBeCloseTo(0.3, 1)
    expect(rec[0].o).toBe(0)
    expect(between(rec)).toBe(true)
    for (let i = 1; i < rec.length; i++) {
      expect(sc(rec[i].m)).toBeGreaterThanOrEqual(sc(rec[i - 1].m) - 0.001)
      expect(sc(rec[i].m)).toBeLessThanOrEqual(1.001)
    }
    const landed = rec.find((f) => f.o >= 0.999 && sc(f.m) >= 0.99)!
    expect(landed.t - rec[0].t).toBeGreaterThan(100)
    expect(landed.t - rec[0].t).toBeLessThan(450)
    expect(await button(page).evaluate((el: HTMLElement) => [el.offsetWidth, el.offsetHeight])).toEqual(sizeBefore)
    // The stage rests as the visitor left it: past the moment the cycle would have swapped back, it has not.
    await page.waitForTimeout(1300)
    await expect(button(page)).toHaveAttribute('data-on', 'true')
    await button(page).click()
    await expect(button(page)).toHaveAttribute('aria-label', 'Play')
    await expect(button(page)).toHaveAttribute('data-on', 'false')
  })

  test('copy is not a toggle: the name stays, a status region says Copied, and the icon reverts on a timer', async ({ page }) => {
    await page.goto('/terms/icon-swap')
    await expect(demo(page, 'icon-swap')).toHaveAttribute('data-playing', 'true')
    await expect.poll(() => button(page).getAttribute('data-on')).toBe('false')
    await expect(status(page)).toHaveText('')
    await button(page).click()
    await expect(button(page)).toHaveAttribute('data-on', 'true')
    await expect(button(page)).toHaveAttribute('aria-label', 'Copy')
    await expect(button(page)).not.toHaveAttribute('aria-pressed')
    await expect(status(page)).toHaveText('Copied')
    // About 1.5s after the press the check gives way to the copy icon again, and the announcement clears.
    await page.waitForTimeout(800)
    await expect(button(page)).toHaveAttribute('data-on', 'true')
    await expect(button(page)).toHaveAttribute('data-on', 'false', { timeout: 2000 })
    await expect(status(page)).toHaveText('')
    await expect(button(page)).toHaveAttribute('aria-label', 'Copy')
  })

  test('the pairs report their state: play and pause by name, the heart by aria-pressed', async ({ page }) => {
    await page.goto('/terms/icon-swap')
    await option(page, 'Pair', 'Play → pause').click()
    await expect(demo(page, 'icon-swap').getByRole('button', { name: 'Play' })).toBeVisible()
    await expect(button(page)).not.toHaveAttribute('aria-pressed')
    await demo(page, 'icon-swap').getByRole('button', { name: 'Play' }).click()
    await expect(demo(page, 'icon-swap').getByRole('button', { name: 'Pause' })).toBeVisible()
    await option(page, 'Pair', 'Heart → filled').click()
    await expect(demo(page, 'icon-swap').getByRole('button', { name: 'Like' })).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(() => button(page).getAttribute('data-on')).toBe('false')
    await demo(page, 'icon-swap').getByRole('button', { name: 'Like' }).click()
    await expect(demo(page, 'icon-swap').getByRole('button', { name: 'Like' })).toHaveAttribute('aria-pressed', 'true')
    await expect(button(page)).toHaveAttribute('aria-label', 'Like')
    // The filled heart is the same glyph, filled.
    await expect(icon(page, 'b')).toHaveAttribute('fill', 'currentColor')
  })

  test('pressed again mid-swap, the icons turn back from where they are', async ({ page }) => {
    await page.goto('/terms/icon-swap')
    await option(page, 'Pair', 'Play → pause').click()
    await expect(demo(page, 'icon-swap')).toHaveAttribute('data-playing', 'true')
    await expect.poll(() => button(page).getAttribute('data-on')).toBe('false')
    await startRecording(icon(page, 'b'), 600)
    await button(page).click()
    await page.waitForTimeout(60)
    await button(page).click()
    await expect(button(page)).toHaveAttribute('data-on', 'false')
    await page.waitForTimeout(700)
    const rec = animated(await recorded(page))
    // The check gets part way in, then goes back out from there: never 1, and once it has turned it only falls.
    const peak = Math.max(...rec.map((f) => f.o))
    expect(peak).toBeGreaterThan(0.1)
    expect(peak).toBeLessThan(0.999)
    const turn = rec.findIndex((f) => f.o === peak)
    for (let i = turn + 1; i < rec.length; i++) expect(rec[i].o).toBeLessThanOrEqual(rec[i - 1].o + 0.001)
    expect(rec.at(-1)!.o).toBe(0)
  })

  test('from the keyboard, Enter and Space swap it with the same animation', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard')
    await page.goto('/terms/icon-swap')
    await option(page, 'Pair', 'Play → pause').click()
    await expect(demo(page, 'icon-swap')).toHaveAttribute('data-playing', 'true')
    await expect.poll(() => button(page).getAttribute('data-on')).toBe('false')
    await button(page).focus()
    await startRecording(icon(page, 'b'), 600)
    await page.keyboard.press('Enter')
    await expect(button(page)).toHaveAttribute('data-on', 'true')
    await expect(button(page)).toHaveAttribute('aria-label', 'Pause')
    await page.waitForTimeout(700)
    const rec = animated(await recorded(page))
    expect(between(rec)).toBe(true)
    expect(sc(rec[0].m)).toBeCloseTo(0.3, 1)
    await page.keyboard.press('Space')
    await expect(button(page)).toHaveAttribute('data-on', 'false')
    await expect(button(page)).toHaveAttribute('aria-label', 'Play')
  })

  test('with reduced motion, nothing runs on the still frame and a press fades without scale or blur', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/terms/icon-swap')
    await expect(demo(page, 'icon-swap')).toHaveAttribute('data-playing', 'false')
    // The still frame is also the server HTML; the Play button only renders once hydrated, so the press lands.
    await expect(page.getByRole('button', { name: 'Play Icon Swap demo' })).toBeVisible()
    const still = await demo(page, 'icon-swap').evaluate((root) => {
      const icons = [...root.querySelectorAll<HTMLElement>('[data-icon]')]
      return { running: icons.map((el) => el.getAnimations().length), opacity: icons.map((el) => getComputedStyle(el).opacity) }
    })
    expect(still.running).toEqual([0, 0])
    expect(still.opacity).toEqual(['1', '0'])
    await startRecording(icon(page, 'b'), 600)
    await button(page).click()
    await expect(button(page)).toHaveAttribute('data-on', 'true')
    const b = await styles(page, 'b')
    expect(inPlace(b.m)).toBe(true)
    expect(b.f).toBe('blur(0px)')
    await page.waitForTimeout(700)
    const rec = animated(await recorded(page))
    expect(between(rec)).toBe(true)
    expect(rec.every((f) => inPlace(f.m))).toBe(true)
    expect(rec.at(-1)!.o).toBe(1)
    const hidden = await styles(page, 'a')
    expect(hidden.o).toBe('0')
    expect(inPlace(hidden.m)).toBe(true)
    expect(hidden.f).toBe('blur(0px)')
  })
})
