import { expect, test, type Locator, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow, trackErrors } from './helpers'

const card = (page: Page, slug: string) => page.locator(`[data-testid="term-card"][data-slug="${slug}"]`)
const demo = (page: Page, slug: string) => page.locator(`main [data-demo="${slug}"]`)
const prompt = (page: Page) => page.getByRole('main').locator('pre').first()
const option = (page: Page, control: string, name: string) =>
  page.getByRole('group', { name: control }).getByRole('button', { name, exact: true })
const stage = (page: Page, slug: string) => demo(page, slug).locator('[data-taken-over]')

type Frame = { t: number; s: number; x: number }
/** translateX out of a computed `matrix(a, b, c, d, tx, ty)`; `none` is 0. */
const tx = (m: string) => (m === 'none' ? 0 : Number(m.match(/matrix\(([^)]*)\)/)![1].split(',')[4]))

/**
 * From the next pointerdown or keydown on, records the element's computed `scale` (1 for `none`) and translateX every
 * frame for `forMs`. The listeners are on window in the capture phase, so the first frame is the state before the
 * gesture lands.
 */
const startRecording = (target: Locator, forMs = 900) =>
  target.evaluate((el, forMs) => {
    const rec: Frame[] = []
    ;(window as unknown as { rec: Frame[] }).rec = rec
    let started = false
    const tx = (m: string) => (m === 'none' ? 0 : Number(m.match(/matrix\(([^)]*)\)/)![1].split(',')[4]))
    const start = () => {
      if (started) return
      started = true
      const t0 = performance.now()
      const tick = () => {
        const s = getComputedStyle(el)
        rec.push({ t: performance.now() - t0, s: s.scale === 'none' ? 1 : Number(s.scale), x: tx(s.transform) })
        if (performance.now() - t0 < forMs) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }
    window.addEventListener('pointerdown', start, { once: true, capture: true })
    window.addEventListener('keydown', start, { once: true, capture: true })
  }, forMs)
const recorded = (page: Page) => page.evaluate(() => (window as unknown as { rec: Frame[] }).rec)

/** A mouse on desktop; a real touch (through CDP) on mobile, so `touch-action` and touch pointer events are in play. */
async function pointerOn(page: Page, target: Locator, isMobile: boolean, offset = { x: 0, y: 0 }) {
  const box = (await target.boundingBox())!
  const at = { x: box.x + box.width / 2 + offset.x, y: box.y + box.height / 2 + offset.y }
  const cdp = isMobile ? await page.context().newCDPSession(page) : null
  let last = { ...at }
  return {
    at,
    down: async () => {
      if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [at] })
      else {
        await page.mouse.move(at.x, at.y)
        await page.mouse.down()
      }
    },
    /** Moves by (dx, dy) from the press point in `steps`, waiting `waitMs` between them. */
    moveBy: async (dx: number, dy: number, steps: number, waitMs: number) => {
      for (let i = 1; i <= steps; i++) {
        last = { x: at.x + (dx * i) / steps, y: at.y + (dy * i) / steps }
        if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [last] })
        else await page.mouse.move(last.x, last.y)
        if (waitMs > 0) await page.waitForTimeout(waitMs)
      }
    },
    up: async () => {
      if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      else await page.mouse.up()
    },
  }
}

/**
 * A flick (press, three moves, release) over CDP, mouse or touch, with the moves spaced by timers: the demo stamps its
 * samples with `event.timeStamp` and reads no velocity from samples under 8ms apart, so a burst would not count as a
 * flick. About 10ms apart they land inside the 100ms window at a few px/ms. Starts 20px left of the target's centre.
 */
async function flickOn(page: Page, target: Locator, isMobile: boolean, dx: number) {
  const box = (await target.boundingBox())!
  const at = { x: box.x + box.width / 2 - 20, y: box.y + box.height / 2 }
  const points = [1 / 3, 2 / 3, 1].map((f) => ({ x: at.x + dx * f, y: at.y }))
  const cdp = await page.context().newCDPSession(page)
  const pause = () => page.waitForTimeout(10)
  if (isMobile) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [at] })
    for (const p of points) {
      await pause()
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [p] })
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } else {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y })
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: at.x, y: at.y, button: 'left', buttons: 1, clickCount: 1 })
    for (const p of points) {
      await pause()
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y, button: 'left', buttons: 1 })
    }
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: points[2].x, y: points[2].y, button: 'left', buttons: 0, clickCount: 1 })
  }
  await cdp.detach()
}

for (const { slug, name, subject } of [
  { slug: 'press-scale', name: 'Press Scale', subject: '[data-press-button]' },
  { slug: 'swipe-to-dismiss', name: 'Swipe to Dismiss', subject: '[data-swipe-toast]' },
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

test.describe('Press Scale', () => {
  const button = (page: Page) => demo(page, 'press-scale').locator('[data-press-button]')
  const still = (page: Page, i = 0) => demo(page, 'press-scale').locator('[data-press-still]').nth(i)
  const label = (page: Page) => demo(page, 'press-scale').locator('[data-press-label]')
  const transition = (page: Page) =>
    button(page).evaluate((el) => {
      const s = getComputedStyle(el)
      const root = el.closest<HTMLElement>('[data-taken-over]')!
      return { p: s.transitionProperty, d: parseFloat(s.transitionDuration) * 1000, e: s.transitionTimingFunction, scale: s.scale, snap: root.dataset.snap, taken: root.dataset.takenOver }
    })
  /** Waits out the entry page's first cycle (rest, press, hold, release, hold: about 2s), which then leaves the button at rest. */
  const settled = async (page: Page) => {
    await expect(demo(page, 'press-scale')).toHaveAttribute('data-playing', 'true')
    await page.waitForTimeout(2100)
    await expect(button(page)).toHaveAttribute('data-pressed', 'false')
    await expect.poll(() => button(page).evaluate((el) => getComputedStyle(el).scale)).toBe('none')
  }
  const between = (rec: Frame[]) => rec.some((f) => f.s > 0.971 && f.s < 0.999)
  /**
   * Logs every change of the button's `data-pressed` from now on; the cycle's press and release are too quick to poll.
   * A rewrite of the same value (the cycle's first step rests the button) is not a change.
   */
  const watchPressed = (target: Locator) =>
    target.evaluate((el) => {
      const log: string[] = []
      let last = el.getAttribute('data-pressed')
      ;(window as unknown as { pressedLog: string[] }).pressedLog = log
      new MutationObserver(() => {
        const now = el.getAttribute('data-pressed')!
        if (now !== last) log.push(now)
        last = now
      }).observe(el, { attributes: true, attributeFilter: ['data-pressed'] })
    })
  const pressedLog = (page: Page) => page.evaluate(() => (window as unknown as { pressedLog: string[] }).pressedLog)

  test('controls rewrite the prompt and the label', async ({ page }) => {
    await page.goto('/terms/press-scale')
    await expect(prompt(page)).toContainText('Give this button press feedback.')
    await expect(prompt(page)).toContainText('Pressed: `scale: 0.97`, `transform-origin: center`. Emil ships 0.96 to 0.97; never below 0.95 (cartoon).')
    await expect(prompt(page)).toContainText('Transition: `transition: scale 150ms var(--ease-out)` (`--duration-1`) on the base rule, not the pressed one (both directions).')
    // The keyboard claim is told per route: CSS :active presses on Space, Motion's whileTap on Enter.
    // The :active rule is the CSS route's; the Motion route presses through whileTap.
    await expect(prompt(page)).toContainText('CSS route: pressed selector `:not(:disabled):active`: the pointer, and Space held (Enter clicks with no press).')
    // The hit area is spelled out (content, positioning, both sizes) and the prompt says what it measures while pressed.
    await expect(prompt(page)).toContainText('Hit area: the button `position: relative`; its `::after`: `content: ""`, `position: absolute`, `inset: 50% auto auto 50%`, `translate: -50% -50%`, `width` and `height` `max(100%, 46px)`; it scales with the button (44.6px while pressed); the layout box never changes.')
    await expect(prompt(page)).toContainText('Opt-out: dense or high-frequency controls (toolbars, list rows, 100+ uses a day) get `background-color: var(--button-pressed)` (`#e0e0e0`) over 150ms `ease` and `scale: none`: `data-still` (CSS) or a `still` prop (Motion).')
    await expect(prompt(page)).toContainText('Motion route: `whileTap={{ scale: 0.97 }}`, `transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}`: the pointer, and Enter held (not Space); `still`: `whileTap={{ backgroundColor: "#e0e0e0" }}`. No CSS transition on `scale` there.')
    // The [data-still] rule has its own transition, so the reduced-motion reset names it too.
    await expect(prompt(page)).toContainText('Reduced motion: keep the pressed scale, drop the transitions (the colour one too). CSS: `transition: none` under `prefers-reduced-motion: reduce`, repeated for `[data-still]`; Motion: `useReducedMotion()` sets `transition={{ duration: 0 }}`.')
    await expect(prompt(page)).not.toContainText('the house ships')
    // No "why" clauses in the prompt. A regex, because toContainText trims a string and ' so ' would match "absolute".
    await expect(prompt(page)).not.toContainText(/\bso\b/)
    await expect(label(page)).toHaveText('scale 0.97 · 150ms ease-out')

    await option(page, 'Amount', '0.95').click()
    await expect(prompt(page)).toContainText('Pressed: `scale: 0.95`, `transform-origin: center`. The floor; under it is cartoon (the house ships 0.97).')
    await expect(prompt(page)).toContainText('it scales with the button (43.7px while pressed, about 44)')
    await expect(prompt(page)).toContainText('`whileTap={{ scale: 0.95 }}`')
    await expect(label(page)).toHaveText('scale 0.95 · 150ms ease-out')

    await option(page, 'Amount', '0.90 (cartoon)').click()
    await expect(prompt(page)).toContainText('Pressed: `scale: 0.90`, `transform-origin: center`. Cartoon: under the 0.95 floor (the house ships 0.97).')
    await expect(prompt(page)).toContainText('it scales with the button (41.4px while pressed, under 44)')
    await expect(label(page)).toHaveText('scale 0.90 · 150ms ease-out')

    await option(page, 'Amount', '0.97 (house)').click()
    await option(page, 'Release', 'Snap').click()
    await expect(prompt(page)).toContainText('No transition: it jumps to `scale: 0.97` on press and back on release (the mistake; the house ships `transition: scale 150ms var(--ease-out)` on the base rule, both directions).')
    // Snap zeroes the scale's transition only: the opt-out colour still takes its 150ms.
    await expect(prompt(page)).toContainText('`whileTap={{ scale: 0.97 }}`, `transition={{ duration: 0, backgroundColor: { duration: 0.15 } }}`')
    await expect(prompt(page)).toContainText('Reduced motion: as shipped, the pressed scale with no transition.')
    await expect(prompt(page)).not.toContainText('useReducedMotion')
    await expect(label(page)).toHaveText('scale 0.97 · snap')
  })

  test('the button transitions scale over 150ms on the house ease-out at rest and while pressed; Snap drops the transition', async ({ page }) => {
    // Reduced motion keeps the demo on its still frame, so the cycle never presses the button behind the test.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/terms/press-scale')
    await expect(demo(page, 'press-scale')).toHaveAttribute('data-playing', 'false')
    // The still frame is also the server HTML; the Play button only renders once hydrated.
    await expect(page.getByRole('button', { name: 'Play Press Scale demo' })).toBeVisible()
    const rest = await transition(page)
    expect(rest).toMatchObject({ p: 'scale', e: 'cubic-bezier(0.23, 1, 0.32, 1)', scale: 'none', snap: 'false', taken: 'false' })
    expect(rest.d).toBeCloseTo(150, 1)
    // The pressed state is the same rule plus the scale: the transition is declared on the base rule, so the scale
    // is reached once the transition has run.
    await button(page).evaluate((el) => (el.dataset.pressed = 'true'))
    expect((await transition(page)).d).toBeCloseTo(150, 1)
    await expect.poll(async () => (await transition(page)).scale).toBe('0.97')
    await button(page).evaluate((el) => (el.dataset.pressed = 'false'))

    await option(page, 'Amount', '0.90 (cartoon)').click()
    await expect.poll(async () => (await button(page).evaluate((el) => getComputedStyle(el).getPropertyValue('--s'))).trim()).toBe('0.90')
    await option(page, 'Release', 'Snap').click()
    await expect.poll(async () => (await transition(page)).d).toBe(0)
  })

  test('pressed and held, the button glides to 0.97 and holds; released, it glides back; the layout box never changes and the cycle stays off', async ({ page, isMobile }) => {
    await page.goto('/terms/press-scale')
    await settled(page)
    const box = (await button(page).boundingBox())!
    expect(box.height).toBeGreaterThanOrEqual(40)
    const sizeBefore = await button(page).evaluate((el: HTMLElement) => [el.offsetWidth, el.offsetHeight])
    const pointer = await pointerOn(page, button(page), isMobile)
    await startRecording(button(page), 500)
    await pointer.down()
    await expect(button(page)).toHaveAttribute('data-pressed', 'true')
    await expect(stage(page, 'press-scale')).toHaveAttribute('data-taken-over', 'true')
    await page.waitForTimeout(600)
    const press = (await recorded(page)).filter((f) => f.t > 0)
    // From 1 down to 0.97 with in-between frames, never past it, there by 150ms (+slack), and held there.
    expect(between(press)).toBe(true)
    for (let i = 1; i < press.length; i++) expect(press[i].s).toBeLessThanOrEqual(press[i - 1].s + 0.0005)
    expect(Math.min(...press.map((f) => f.s))).toBeGreaterThanOrEqual(0.9695)
    const landed = press.find((f) => f.s <= 0.9705)!
    expect(landed.t).toBeGreaterThan(30)
    expect(landed.t).toBeLessThan(300)
    expect(press.at(-1)!.s).toBeCloseTo(0.97, 3)
    expect(await button(page).evaluate((el: HTMLElement) => [el.offsetWidth, el.offsetHeight])).toEqual(sizeBefore)
    // 21px above and below the button's centre is outside its 40px box but inside the 46px hit area, which scales with
    // the press: 44.6px at 0.97, so both probes still land while pressed.
    for (const dy of [-21, 21]) {
      const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('[data-press-button]') !== null, [pointer.at.x, pointer.at.y + dy])
      expect(hit).toBe(true)
    }

    await startRecording(button(page), 500)
    // The recording starts on the next pointer event: the release is a pointerup, so prime it from the page.
    await button(page).evaluate(() => window.dispatchEvent(new Event('pointerdown')))
    await pointer.up()
    await expect(button(page)).toHaveAttribute('data-pressed', 'false')
    await page.waitForTimeout(600)
    const release = (await recorded(page)).filter((f) => f.t > 0)
    expect(between(release)).toBe(true)
    for (let i = 1; i < release.length; i++) expect(release[i].s).toBeGreaterThanOrEqual(release[i - 1].s - 0.0005)
    expect(release.at(-1)!.s).toBe(1)
    const back = release.find((f) => f.s >= 0.9995)!
    expect(back.t).toBeLessThan(300)
    // The stage rests as the visitor left it: past the moment the cycle would have pressed the button, it has not.
    await page.waitForTimeout(1200)
    await expect(button(page)).toHaveAttribute('data-pressed', 'false')
    await expect(stage(page, 'press-scale')).toHaveAttribute('data-taken-over', 'true')
  })

  test('the hit area scales with the press: at 0.90 it is 41.4px while pressed, so 21px holds at rest and 20px pressed', async ({ page, isMobile }) => {
    await page.goto('/terms/press-scale')
    await option(page, 'Amount', '0.90 (cartoon)').click()
    await settled(page)
    const pointer = await pointerOn(page, button(page), isMobile)
    const hitAt = (dy: number) => page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('[data-press-button]') !== null, [pointer.at.x, pointer.at.y + dy])
    // At rest the 46px pseudo-element reaches 23px from the centre.
    expect(await hitAt(-21)).toBe(true)
    expect(await hitAt(21)).toBe(true)
    await pointer.down()
    await expect(button(page)).toHaveAttribute('data-pressed', 'true')
    await expect.poll(() => button(page).evaluate((el) => getComputedStyle(el).scale)).toBe('0.9')
    // Pressed at 0.90 it reaches 20.7px: 20px still lands.
    expect(await hitAt(-20)).toBe(true)
    expect(await hitAt(20)).toBe(true)
    await pointer.up()
    await expect(button(page)).toHaveAttribute('data-pressed', 'false')
  })

  test('released early, the button turns back from where it is and never reaches 0.97', async ({ page, isMobile }) => {
    await page.goto('/terms/press-scale')
    await settled(page)
    const pointer = await pointerOn(page, button(page), isMobile)
    await startRecording(button(page), 500)
    await pointer.down()
    await page.waitForTimeout(40)
    await pointer.up()
    await expect(button(page)).toHaveAttribute('data-pressed', 'false')
    await page.waitForTimeout(600)
    const rec = (await recorded(page)).filter((f) => f.t > 0)
    const low = Math.min(...rec.map((f) => f.s))
    expect(low).toBeLessThan(0.995)
    expect(low).toBeGreaterThan(0.9702)
    // Once it has turned it only rises, and no frame jumps: the step is bounded by the press's own first step.
    const turn = rec.findIndex((f) => f.s === low)
    for (let i = turn + 1; i < rec.length; i++) expect(rec[i].s).toBeGreaterThanOrEqual(rec[i - 1].s - 0.0005)
    for (let i = 1; i < rec.length; i++) expect(Math.abs(rec[i].s - rec[i - 1].s)).toBeLessThan(0.02)
    expect(rec.at(-1)!.s).toBe(1)
  })

  test('with Snap, the scale jumps with no in-between frames', async ({ page, isMobile }) => {
    await page.goto('/terms/press-scale')
    await option(page, 'Release', 'Snap').click()
    await settled(page)
    const pointer = await pointerOn(page, button(page), isMobile)
    await startRecording(button(page), 400)
    await pointer.down()
    await expect(button(page)).toHaveAttribute('data-pressed', 'true')
    await page.waitForTimeout(200)
    await pointer.up()
    await expect(button(page)).toHaveAttribute('data-pressed', 'false')
    await page.waitForTimeout(300)
    const rec = await recorded(page)
    expect(rec.every((f) => f.s === 1 || Math.abs(f.s - 0.97) < 0.0005)).toBe(true)
    expect(rec.some((f) => Math.abs(f.s - 0.97) < 0.0005)).toBe(true)
    expect(rec.at(-1)!.s).toBe(1)
  })

  test('a dense control pressed the same way changes colour only and never scales', async ({ page, isMobile }) => {
    await page.goto('/terms/press-scale')
    await settled(page)
    const styles = () => still(page).evaluate((el) => ({ scale: getComputedStyle(el).scale, bg: getComputedStyle(el).backgroundColor, m: getComputedStyle(el).transform }))
    const rest = await styles()
    const box = (await still(page).boundingBox())!
    expect(box.width).toBeLessThan(44)
    const pointer = await pointerOn(page, still(page), isMobile)
    await pointer.down()
    await expect(still(page)).toHaveAttribute('data-pressed', 'true')
    await expect(stage(page, 'press-scale')).toHaveAttribute('data-taken-over', 'true')
    await expect(button(page)).toHaveAttribute('data-pressed', 'false')
    await page.waitForTimeout(250)
    const pressed = await styles()
    expect(pressed.scale).toBe('none')
    expect(pressed.m).toBe('none')
    expect(pressed.bg).not.toBe(rest.bg)
    // The hit area still reaches 44px around the 32px control.
    const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('[data-press-still]') !== null, [pointer.at.x, pointer.at.y + 20])
    expect(hit).toBe(true)
    await pointer.up()
    await expect(still(page)).toHaveAttribute('data-pressed', 'false')
  })

  test('from the keyboard, holding Space presses the button with the same glide and keyup releases it; Enter too', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard')
    await page.goto('/terms/press-scale')
    await settled(page)
    await button(page).focus()
    await startRecording(button(page), 500)
    await page.keyboard.down('Space')
    await expect(button(page)).toHaveAttribute('data-pressed', 'true')
    await expect(stage(page, 'press-scale')).toHaveAttribute('data-taken-over', 'true')
    await page.waitForTimeout(400)
    const held = (await recorded(page)).filter((f) => f.t > 0)
    expect(between(held)).toBe(true)
    expect(held.at(-1)!.s).toBeCloseTo(0.97, 3)
    await page.keyboard.up('Space')
    await expect(button(page)).toHaveAttribute('data-pressed', 'false')
    await expect.poll(() => button(page).evaluate((el) => getComputedStyle(el).scale)).toBe('none')
    await page.keyboard.down('Enter')
    await expect(button(page)).toHaveAttribute('data-pressed', 'true')
    await page.keyboard.up('Enter')
    await expect(button(page)).toHaveAttribute('data-pressed', 'false')
  })

  test('a press ends the running cycle; Replay hands the stage back', async ({ page, isMobile }) => {
    await page.goto('/terms/press-scale')
    await settled(page)
    const pointer = await pointerOn(page, button(page), isMobile)
    await pointer.down()
    await expect(stage(page, 'press-scale')).toHaveAttribute('data-taken-over', 'true')
    await pointer.up()
    await watchPressed(button(page))
    await page.getByRole('button', { name: 'Replay' }).click()
    await expect(stage(page, 'press-scale')).toHaveAttribute('data-taken-over', 'false')
    // The new cycle presses the button on its own beat (500ms in) and lets go 400ms later.
    await expect.poll(() => pressedLog(page), { timeout: 3000 }).toEqual(['true', 'false'])
  })

  test('on touch, a vertical swipe that starts on the button scrolls the page and ends the press', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch')
    await page.goto('/terms/press-scale')
    await settled(page)
    const before = await page.evaluate(() => window.scrollY)
    const pointer = await pointerOn(page, button(page), true)
    await pointer.down()
    await expect(button(page)).toHaveAttribute('data-pressed', 'true')
    await pointer.moveBy(0, -240, 12, 16)
    await pointer.up()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 100)
    // The browser took the gesture as a scroll and cancelled the pointer: released.
    await expect(button(page)).toHaveAttribute('data-pressed', 'false')
  })

  test('with reduced motion, the still frame rests and nothing runs; a press keeps the scale and drops the transition; Play keeps the glide', async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/terms/press-scale')
    await expect(demo(page, 'press-scale')).toHaveAttribute('data-playing', 'false')
    // The still frame is also the server HTML; the Play button only renders once hydrated, so the press lands.
    await expect(page.getByRole('button', { name: 'Play Press Scale demo' })).toBeVisible()
    const stillFrame = await button(page).evaluate((el) => ({ scale: getComputedStyle(el).scale, running: el.getAnimations().length, pressed: el.dataset.pressed }))
    expect(stillFrame).toEqual({ scale: 'none', running: 0, pressed: 'false' })

    const pointer = await pointerOn(page, button(page), isMobile)
    await startRecording(button(page), 300)
    await pointer.down()
    await expect(button(page)).toHaveAttribute('data-pressed', 'true')
    // No property transitions, so the pressed scale is there in the first frame.
    expect(await button(page).evaluate((el) => getComputedStyle(el).scale)).toBe('0.97')
    expect(await button(page).evaluate((el) => getComputedStyle(el).transitionProperty)).toBe('none')
    await page.waitForTimeout(350)
    await pointer.up()
    await expect(button(page)).toHaveAttribute('data-pressed', 'false')
    const rec = (await recorded(page)).filter((f) => f.t > 0)
    // No in-between frames: pressed is 0.97 at once.
    expect(rec.every((f) => f.s === 1 || Math.abs(f.s - 0.97) < 0.0005)).toBe(true)
    expect(rec.some((f) => Math.abs(f.s - 0.97) < 0.0005)).toBe(true)

    // Play once is the visitor asking for the demo: the cycle presses with the 150ms glide.
    await watchPressed(button(page))
    await page.getByRole('button', { name: 'Play Press Scale demo' }).click()
    await expect(demo(page, 'press-scale')).toHaveAttribute('data-playing', 'true')
    await expect(stage(page, 'press-scale')).toHaveAttribute('data-taken-over', 'false')
    expect(await button(page).evaluate((el) => getComputedStyle(el).transitionProperty)).toBe('scale')
    await expect.poll(() => pressedLog(page), { timeout: 3000 }).toEqual(['true', 'false'])
  })
})

test.describe('Swipe to Dismiss', () => {
  const toast = (page: Page) => demo(page, 'swipe-to-dismiss').locator('[data-swipe-toast]')
  const wrap = (page: Page) => demo(page, 'swipe-to-dismiss').locator('[data-swipe-wrap]')
  const dismiss = (page: Page) => demo(page, 'swipe-to-dismiss').getByRole('button', { name: 'Dismiss toast' })
  const hint = (page: Page) => demo(page, 'swipe-to-dismiss').locator('p[aria-hidden]')
  const status = (page: Page) => demo(page, 'swipe-to-dismiss').locator('[data-swipe-status]')
  const thresholdLabel = (page: Page) => demo(page, 'swipe-to-dismiss').locator('[data-threshold-label]')
  const releaseLabel = (page: Page) => demo(page, 'swipe-to-dismiss').locator('[data-release-label]')
  const xOf = (page: Page) => toast(page).evaluate((el) => {
    const m = getComputedStyle(el).transform
    return m === 'none' ? 0 : Number(m.match(/matrix\(([^)]*)\)/)![1].split(',')[4])
  })
  const widthOf = (page: Page) => toast(page).evaluate((el: HTMLElement) => el.offsetWidth)
  /** The pointer lands on whole device pixels while the toast's box is fractional: 1:1 within 1.5px. */
  const expectXNear = (page: Page, x: number) => expect.poll(async () => Math.abs((await xOf(page)) - x) < 1.5).toBe(true)
  /**
   * Waits out the entry page's first cycle (rest, slow drag and back, flick off, beat, enter, hold: under 4s), which
   * then leaves the toast resting in place.
   */
  const settled = async (page: Page) => {
    await expect(demo(page, 'swipe-to-dismiss')).toHaveAttribute('data-playing', 'true')
    await page.waitForTimeout(3900)
    await expect(wrap(page)).toHaveAttribute('data-state', 'open')
    await expect.poll(() => wrap(page).evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
    await expect.poll(() => xOf(page)).toBe(0)
  }
  /** Grabs the toast left of its Dismiss button, so the drag starts on the toast body. */
  const grab = (page: Page, isMobile: boolean) => pointerOn(page, toast(page), isMobile, { x: -20, y: 0 })
  /**
   * Logs every change of the wrapper's `data-state` with its visibility at that moment. `closed` lasts from the end of
   * the exit spring (Motion's rest check, about 450ms) to the toast's return 800ms after the dismissal: too short to poll.
   */
  const watchState = (page: Page) =>
    wrap(page).evaluate((el) => {
      const log: string[] = []
      ;(window as unknown as { stateLog: string[] }).stateLog = log
      new MutationObserver(() => log.push(`${el.dataset.state}:${getComputedStyle(el).visibility}`)).observe(el, { attributes: true, attributeFilter: ['data-state'] })
    })
  const stateLog = (page: Page) => page.evaluate(() => (window as unknown as { stateLog: string[] }).stateLog)

  test('controls rewrite the prompt and the labels', async ({ page }) => {
    await page.goto('/terms/swipe-to-dismiss')
    await expect(prompt(page)).toContainText('Make this toast swipe away sideways.')
    // The width the numbers are read against is a reference, not a size to build to; the exact third is stated.
    await expect(prompt(page)).toContainText('Reference toast: 376px wide; a third of its width (125.3px; at or past it counts); scale to yours; its container clips.')
    await expect(prompt(page)).toContainText('Drag: 1:1 (`translateX` per move, no transition); `touch-action: pan-y`; pointer capture; `user-select: none`.')
    await expect(prompt(page)).toContainText('Threshold: `|x| ≥ width / 3`, or `|v| ≥ 0.1px/ms` signed like `x`, leaves toward `sign(x)`; else back.')
    await expect(prompt(page)).toContainText('Exit: to `±(width + 16px)`, spring `{ duration: 0.3, bounce: 0 }` out, `{ duration: 0.5, bounce: 0 }` back. Ship as physics (mass 1): `{ stiffness: 947, damping: 61.6 }` and `{ stiffness: 341, damping: 36.9 }`, plus `velocity` (px/s); remove after the exit.')
    // The JS route stops the running spring and adds the grab position; samples are on the event's clock, over a
    // window that ends at the release.
    await expect(prompt(page)).toContainText('JS route (`motionValue`, `animate`; `x.on("change")` writes `translateX`): `pointerdown` (not on Dismiss): `x.stop()`, `setPointerCapture`; `pointermove`: `x.set(start + dx)`, log `(e.timeStamp, x)`; `pointerup`, `pointercancel`, `lostpointercapture`: `v` = Δx / Δt over the 100ms ending at `pointerup` (0 under two samples 8ms apart), then `animate(x, target, { ...spring, velocity: v * 1000 })`.')
    // The Motion route is the JS route's pointer events on a motion.div, not the drag prop.
    await expect(prompt(page)).toContainText("Motion route: the JS route's pointer events on the `motion.div`, `useMotionValue(0)`, `style={{ x }}`, `animate(x, …)`; not `drag`; `onDismiss()` in `onComplete`.")
    await expect(prompt(page)).not.toContainText('drag="x"')
    await expect(prompt(page)).not.toContainText('info.')
    await expect(prompt(page)).toContainText('Visible Dismiss button: the exit to the right, `velocity: 0`; focus inside returns to the opener, or its container (`focus({ preventScroll: true })`); always-mounted `role="status"` region.')
    await expect(prompt(page)).toContainText('Reduced motion: drag still follows; `x.jump(target)` on release: gone or at rest next frame (`matchMedia`; Motion: `useReducedMotion()`).')
    await expect(prompt(page)).not.toContainText('Escape')
    await expect(prompt(page)).not.toContainText('the house')
    await expect(thresholdLabel(page)).toHaveText('width/3 or 0.1px/ms')
    await expect(releaseLabel(page)).toHaveText('spring')

    await option(page, 'Threshold', 'Distance only').click()
    await expect(prompt(page)).toContainText('Threshold, distance only: `|x| ≥ width / 3` leaves toward `sign(x)`; else back (the mistake; house: also `|v| ≥ 0.1px/ms` signed like `x`).')
    await expect(prompt(page)).not.toContainText('100px/s')
    await expect(thresholdLabel(page)).toHaveText('width/3 only')

    await option(page, 'Threshold', 'Distance or velocity').click()
    await option(page, 'Release', 'Ease-out 200ms').click()
    // With a tween the release velocity means nothing, so the ease variant drops the exit spring's numbers and the
    // Dismiss button's `velocity: 0`; the house's back spring stays as the reference.
    await expect(prompt(page)).toContainText('Exit: to `±(width + 16px)` and back to 0 on a 200ms `var(--ease-out)` tween, release velocity thrown away (the mistake; house: springs that carry it, `{ stiffness: 341, damping: 36.9 }` back); remove after the exit.')
    await expect(prompt(page)).toContainText('then `animate(x, target, { duration: 0.2, ease: [0.23, 1, 0.32, 1] })`.')
    await expect(prompt(page)).not.toContainText('velocity: v * 1000')
    await expect(prompt(page)).not.toContainText('947')
    await expect(prompt(page)).toContainText('Visible Dismiss button: the exit to the right; focus inside returns to the opener, or its container')
    await expect(prompt(page)).not.toContainText('velocity: 0')
    await expect(releaseLabel(page)).toHaveText('ease-out 200ms')
  })

  test('a drag that starts on the Dismiss button does not move the toast; its release still clicks Dismiss', async ({ page, isMobile }) => {
    await page.goto('/terms/swipe-to-dismiss')
    await settled(page)
    const width = await widthOf(page)
    const to = Math.round(width * 0.4)
    const pointer = await pointerOn(page, dismiss(page), isMobile)
    await pointer.down()
    // Not a drag: the toast is not picked up, so the cycle keeps the stage and nothing follows the pointer.
    await expect(toast(page)).toHaveAttribute('data-dragging', 'false')
    await pointer.moveBy(to, 0, 4, 20)
    await page.waitForTimeout(150)
    expect(await xOf(page)).toBe(0)
    await expect(hint(page)).toHaveText('Drag the toast sideways, or flick it')
    await expect(status(page)).toHaveText('')
    await pointer.up()
    await page.waitForTimeout(200)
    expect(await xOf(page)).toBe(0)
    await expect(wrap(page)).toHaveAttribute('data-state', 'open')
    await expect(status(page)).toHaveText('')

    // The button itself still works: a click runs the exit to the right.
    await watchState(page)
    await dismiss(page).click()
    await expect(hint(page)).toHaveText('Dismiss button: gone')
    await expect(status(page)).toHaveText('Dismissed')
    await expect.poll(() => stateLog(page), { timeout: 2000 }).toContain('closed:hidden')
    await expect(wrap(page)).toHaveAttribute('data-state', 'open', { timeout: 2000 })
  })

  test('dragged, the toast follows the pointer 1:1 with no transition; released short of a third at rest, it springs back without passing 0 and the cycle stays off', async ({ page, isMobile }) => {
    await page.goto('/terms/swipe-to-dismiss')
    await settled(page)
    expect(await toast(page).evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration))).toBe(0)
    expect(await toast(page).evaluate((el) => getComputedStyle(el).touchAction)).toBe('pan-y')
    const width = await widthOf(page)
    const to = Math.round(width * 0.25)
    const pointer = await grab(page, isMobile)
    await pointer.down()
    await expect(toast(page)).toHaveAttribute('data-dragging', 'true')
    await expect(stage(page, 'swipe-to-dismiss')).toHaveAttribute('data-taken-over', 'true')
    for (const step of [0.25, 0.5, 0.75, 1]) {
      await pointer.moveBy(to * step, 0, 1, 0)
      await expectXNear(page, to * step)
    }
    await expect(hint(page)).toContainText(`${to} of ${Math.round(width / 3)}px`)
    // Still for longer than the velocity window, so the release has no speed to carry.
    await page.waitForTimeout(150)
    await startRecording(toast(page), 700)
    await toast(page).evaluate(() => window.dispatchEvent(new Event('pointerdown')))
    await pointer.up()
    await expect(toast(page)).toHaveAttribute('data-dragging', 'false')
    await expect(hint(page)).toContainText(': back')
    await page.waitForTimeout(800)
    const rec = (await recorded(page)).filter((f) => f.t > 0)
    // Springs back from where it was with in-between frames, never passing 0, within 0.5px of 0 by 500ms (+slack).
    expect(rec[0].x).toBeGreaterThan(to * 0.5)
    expect(rec.some((f) => f.x > 5 && f.x < to - 5)).toBe(true)
    for (let i = 1; i < rec.length; i++) expect(rec[i].x).toBeLessThanOrEqual(rec[i - 1].x + 0.01)
    expect(Math.min(...rec.map((f) => f.x))).toBeGreaterThanOrEqual(-0.5)
    const home = rec.find((f) => Math.abs(f.x) <= 0.5)!
    expect(home.t).toBeGreaterThan(100)
    expect(home.t).toBeLessThan(620)
    await expect(wrap(page)).toHaveAttribute('data-state', 'open')
    // The stage rests as the visitor left it: past the moment the cycle would have flicked it, it is still here.
    await page.waitForTimeout(1500)
    await expect(wrap(page)).toHaveAttribute('data-state', 'open')
    await expect(stage(page, 'swipe-to-dismiss')).toHaveAttribute('data-taken-over', 'true')
  })

  test('released past a third at rest, the toast leaves on the spring, is hidden, and comes back with a plain enter', async ({ page, isMobile }) => {
    await page.goto('/terms/swipe-to-dismiss')
    await settled(page)
    const width = await widthOf(page)
    const to = Math.round(width * 0.4)
    const pointer = await grab(page, isMobile)
    await pointer.down()
    await pointer.moveBy(to, 0, 4, 0)
    await expectXNear(page, to)
    await page.waitForTimeout(150)
    await watchState(page)
    await startRecording(toast(page), 600)
    await toast(page).evaluate(() => window.dispatchEvent(new Event('pointerdown')))
    await pointer.up()
    await expect(hint(page)).toContainText('past a third: gone')
    await expect(status(page)).toHaveText('Dismissed')
    await page.waitForTimeout(700)
    const rec = (await recorded(page)).filter((f) => f.t > 0 && f.x > 0)
    // Every frame further right than the one before, past the width, settled at width + 16 by 300ms (+slack), then hidden.
    for (let i = 1; i < rec.length; i++) expect(rec[i].x).toBeGreaterThanOrEqual(rec[i - 1].x - 0.01)
    const past = rec.find((f) => f.x >= width)!
    expect(past).toBeDefined()
    const gone = rec.find((f) => Math.abs(f.x - (width + 16)) <= 0.5)!
    expect(gone.t).toBeLessThan(450)
    expect((await stateLog(page))[0]).toBe('closed:hidden')
    // After a beat the toast comes back from 16px below, in place, and the hint resets.
    await expect(wrap(page)).toHaveAttribute('data-state', 'open', { timeout: 2000 })
    await expect.poll(() => wrap(page).evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
    expect(await xOf(page)).toBe(0)
    await expect(hint(page)).toHaveText('Drag the toast sideways, or flick it')
    await expect(status(page)).toHaveText('')
  })

  test('a flick a fifth of the way leaves with distance or velocity, and springs back with distance only', async ({ page, isMobile }) => {
    await page.goto('/terms/swipe-to-dismiss')
    await settled(page)
    const width = await widthOf(page)
    const to = Math.round(width * 0.2)
    await watchState(page)
    await flickOn(page, toast(page), isMobile, -to)
    await expect(hint(page)).toContainText('a flick: gone')
    await expect.poll(() => stateLog(page), { timeout: 2000 }).toContain('closed:hidden')
    await expect(wrap(page)).toHaveAttribute('data-state', 'open', { timeout: 2000 })
    await expect.poll(() => wrap(page).evaluate((el) => getComputedStyle(el).opacity)).toBe('1')

    await option(page, 'Threshold', 'Distance only').click()
    await settled(page)
    await flickOn(page, toast(page), isMobile, -to)
    await expect(hint(page)).toContainText('distance only, back')
    await expect.poll(() => xOf(page), { timeout: 2000 }).toBeCloseTo(0, 0)
    await expect(wrap(page)).toHaveAttribute('data-state', 'open')
  })

  test('with the fixed ease-out, the exit takes 200ms whatever the speed, and the way back 200ms', async ({ page, isMobile }) => {
    await page.goto('/terms/swipe-to-dismiss')
    await option(page, 'Release', 'Ease-out 200ms').click()
    await settled(page)
    const width = await widthOf(page)
    const to = Math.round(width * 0.2)
    await watchState(page)
    // The recording starts on the flick's own pointerdown; the flick's moves are spaced by timers, so the exit is timed
    // from its own first frame (the first one past the release position), not from the pointerdown.
    await startRecording(toast(page), 700)
    await flickOn(page, toast(page), isMobile, to)
    await expect(hint(page)).toContainText('a flick: gone')
    await page.waitForTimeout(800)
    const rec = (await recorded(page)).filter((f) => f.t > 0 && f.x > 0)
    const start = rec.find((f) => f.x > to + 1)!
    const gone = rec.find((f) => Math.abs(f.x - (width + 16)) <= 0.5)!
    expect(gone.t - start.t).toBeGreaterThan(100)
    expect(gone.t - start.t).toBeLessThan(240)
    expect((await stateLog(page))[0]).toBe('closed:hidden')
    await expect(wrap(page)).toHaveAttribute('data-state', 'open', { timeout: 2000 })
    await settled(page)

    const again = await grab(page, isMobile)
    await again.down()
    await again.moveBy(Math.round(width * 0.25), 0, 4, 0)
    await page.waitForTimeout(150)
    await startRecording(toast(page), 500)
    await toast(page).evaluate(() => window.dispatchEvent(new Event('pointerdown')))
    await again.up()
    await page.waitForTimeout(600)
    const back = (await recorded(page)).filter((f) => f.t > 0)
    const home = back.find((f) => Math.abs(f.x) <= 0.5)!
    expect(home.t).toBeGreaterThan(100)
    expect(home.t).toBeLessThan(320)
  })

  test('grabbed while springing back, the toast stops where it is and follows the pointer again', async ({ page, isMobile }) => {
    await page.goto('/terms/swipe-to-dismiss')
    await settled(page)
    const width = await widthOf(page)
    const to = Math.round(width * 0.3)
    const pointer = await grab(page, isMobile)
    await pointer.down()
    await expect(toast(page)).toHaveAttribute('data-dragging', 'true')
    await pointer.moveBy(to, 0, 4, 0)
    await expectXNear(page, to)
    await page.waitForTimeout(150)
    await pointer.up()
    // Once the spring back is under way, grab the toast where it is now, part of the way back.
    await expect.poll(() => xOf(page)).toBeLessThan(to - 2)
    const again = await pointerOn(page, toast(page), isMobile, { x: -20, y: 0 })
    const mid = await xOf(page)
    expect(mid).toBeGreaterThan(5)
    expect(mid).toBeLessThan(to)
    await again.down()
    await expect(toast(page)).toHaveAttribute('data-dragging', 'true')
    const held = await xOf(page)
    // It stopped short of 0, no further back than where it was grabbed, and stays put while held.
    expect(held).toBeGreaterThan(2)
    expect(held).toBeLessThanOrEqual(mid + 0.5)
    await page.waitForTimeout(120)
    expect(await xOf(page)).toBeCloseTo(held, 2)
    await again.moveBy(20, 0, 2, 0)
    await expectXNear(page, held + 20)
    await page.waitForTimeout(150)
    await again.up()
    await expect.poll(() => xOf(page), { timeout: 2000 }).toBeCloseTo(0, 0)
  })

  test('from the keyboard, Enter on Dismiss plays the exit to the right and focus lands on the frame, not body', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard')
    await page.goto('/terms/swipe-to-dismiss')
    await settled(page)
    const width = await widthOf(page)
    await dismiss(page).focus()
    await watchState(page)
    await startRecording(toast(page), 600)
    await page.keyboard.press('Enter')
    await expect(status(page)).toHaveText('Dismissed')
    await expect(stage(page, 'swipe-to-dismiss')).toHaveAttribute('data-taken-over', 'true')
    expect(await page.evaluate(() => document.activeElement?.hasAttribute('data-swipe-frame'))).toBe(true)
    await page.waitForTimeout(700)
    const rec = (await recorded(page)).filter((f) => f.t > 0 && f.x > 0)
    expect(rec.some((f) => f.x > 20 && f.x < width)).toBe(true)
    expect(Math.max(...rec.map((f) => f.x))).toBeCloseTo(width + 16, 0)
    expect((await stateLog(page))[0]).toBe('closed:hidden')
    await expect(wrap(page)).toHaveAttribute('data-state', 'open', { timeout: 2000 })
  })

  test('on touch, a vertical swipe that starts on the toast scrolls the page and the toast goes back to rest', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch')
    await page.goto('/terms/swipe-to-dismiss')
    await settled(page)
    const before = await page.evaluate(() => window.scrollY)
    const pointer = await grab(page, true)
    await pointer.down()
    await expect(toast(page)).toHaveAttribute('data-dragging', 'true')
    await pointer.moveBy(0, -240, 12, 16)
    await pointer.up()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 100)
    await expect(toast(page)).toHaveAttribute('data-dragging', 'false')
    await expect.poll(() => xOf(page), { timeout: 2000 }).toBeCloseTo(0, 0)
    await expect(wrap(page)).toHaveAttribute('data-state', 'open')
  })

  test('with reduced motion, the still frame rests; a drag follows the pointer and the release jumps; Play keeps the springs', async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/terms/swipe-to-dismiss')
    await expect(demo(page, 'swipe-to-dismiss')).toHaveAttribute('data-playing', 'false')
    await expect(page.getByRole('button', { name: 'Play Swipe to Dismiss demo' })).toBeVisible()
    const stillFrame = await toast(page).evaluate((el) => ({ m: getComputedStyle(el).transform, running: el.getAnimations().length }))
    expect(stillFrame.m === 'none' || stillFrame.m === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true)
    expect(stillFrame.running).toBe(0)
    await expect(wrap(page)).toHaveAttribute('data-state', 'open')
    const width = await widthOf(page)

    // The drag is direct manipulation: it still follows the pointer.
    const to = Math.round(width * 0.25)
    const pointer = await grab(page, isMobile)
    await pointer.down()
    await pointer.moveBy(to, 0, 4, 0)
    await expectXNear(page, to)
    await page.waitForTimeout(150)
    await startRecording(toast(page), 300)
    await toast(page).evaluate(() => window.dispatchEvent(new Event('pointerdown')))
    await pointer.up()
    await page.waitForTimeout(350)
    const rec = (await recorded(page)).filter((f) => f.t > 0)
    // The release jumps: every frame is at the drag position or at 0, nothing between.
    expect(rec.every((f) => Math.abs(f.x) <= 0.5 || Math.abs(f.x - to) <= 1.5)).toBe(true)
    expect(rec.at(-1)!.x).toBe(0)

    // Past a third: gone in the next frame, then back in place with a fade and no travel.
    const far = await grab(page, isMobile)
    await far.down()
    await far.moveBy(Math.round(width * 0.4), 0, 4, 0)
    await page.waitForTimeout(150)
    await watchState(page)
    await far.up()
    await expect.poll(() => stateLog(page)).toContain('closed:hidden')
    await expect(wrap(page)).toHaveAttribute('data-state', 'open', { timeout: 2000 })
    expect(await wrap(page).evaluate((el) => getComputedStyle(el).getPropertyValue('--t').trim())).toBe('0px')

    // Play once is the visitor asking for the demo: the cycle drags and springs with in-between frames.
    await startRecording(toast(page), 1600)
    await page.getByRole('button', { name: 'Play Swipe to Dismiss demo' }).click()
    await expect(demo(page, 'swipe-to-dismiss')).toHaveAttribute('data-playing', 'true')
    await expect(stage(page, 'swipe-to-dismiss')).toHaveAttribute('data-taken-over', 'false')
    await page.waitForTimeout(1700)
    const play = await recorded(page)
    expect(play.some((f) => f.x > 5 && f.x < to - 5)).toBe(true)
    expect(Math.max(...play.map((f) => f.x))).toBeGreaterThan(to * 0.8)
  })
})
