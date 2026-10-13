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

const springCard = (page: Page) => demo(page, 'spring').locator('[data-spring-card]')
const springHint = (page: Page) => demo(page, 'spring').locator('p[aria-hidden]')

type Recording = { f: { t: number; s: number; tw: number; event: boolean }[]; down: number; up: number; on: boolean }

/**
 * Takes over the card and jumps it home with keyboard-style clicks (element.click() reports detail 0, like Enter),
 * waits for it to rest, then records the position of the card (and the twin, if any) in every frame Motion moves
 * it, with the moments of the press and the release. Returns home and the travel, in px from the track's left edge.
 */
async function homeAndRecord(page: Page) {
  return springCard(page).evaluate(async (el: HTMLElement) => {
    const frame = () => new Promise((r) => requestAnimationFrame(r))
    const track = el.parentElement!
    const x = (node: Element) => node.getBoundingClientRect().left - track.getBoundingClientRect().left
    el.click()
    if (el.dataset.side === 'b') el.click()
    const home = x(track.children[0])
    const travel = x(track.children[1]) - home
    for (let still = 0; still < 3; ) {
      await frame()
      still = Math.abs(x(el) - home) < 0.5 ? still + 1 : 0
    }
    const twin = el.closest('[data-taken-over]')!.querySelector('[data-twin-card]')
    const rec: Recording = { f: [], down: NaN, up: NaN, on: true }
    ;(window as unknown as { rec: Recording }).rec = rec
    // Read the rects right after each write Motion makes, stamped with performance.now(), the clock Motion samples
    // its animations on. Reading from our own rAF or a timer instead depends on callback order and main-thread load,
    // and can pair one frame's time with another frame's position. Writes made inside the press or release handler
    // (a jump, or the old animation brought up to Motion's cached time before it stops) are marked `event`: they
    // are never painted as such and carry no reliable time.
    let inEvent = false
    const observer = new MutationObserver(() => {
      if (!rec.on) return observer.disconnect()
      rec.f.push({ t: performance.now(), s: x(el), tw: twin ? x(twin) : 0, event: inEvent })
    })
    for (const card of twin ? [el, twin] : [el]) observer.observe(card, { attributes: true, attributeFilter: ['style'] })
    for (const type of ['pointerdown', 'pointerup'] as const) {
      // Capture on window runs before React's handler, bubble on window after it.
      window.addEventListener(type, () => {
        inEvent = true
        rec[type === 'pointerdown' ? 'down' : 'up'] = performance.now()
      }, true)
      window.addEventListener(type, () => (inEvent = false))
    }
    return { home, travel }
  })
}

/** Speeds in px per 60Hz frame (so uneven or skipped frames never read as jumps); speeds[k] is the move into sample k. */
async function stopRecording(page: Page) {
  const rec = await page.evaluate(() => {
    const r = (window as unknown as { rec: Recording }).rec
    r.on = false
    return r
  })
  // Frames: what Motion wrote on its own clock.
  const f = rec.f.filter((p) => !p.event)
  const speed = (k: number, key: 's' | 'tw') => (k === 0 ? 0 : ((f[k][key] - f[k - 1][key]) / (f[k].t - f[k - 1].t)) * (1000 / 60))
  return {
    // Every position the card was given, frames and handler writes alike.
    all: rec.f.map((p) => p.s),
    xs: f.map((p) => p.s),
    times: f.map((p) => p.t),
    speeds: f.map((_, k) => ({ s: speed(k, 's'), t: speed(k, 'tw') })),
    // The last frame painted before the release.
    beforeAt: f.findLastIndex((p) => p.t <= rec.up),
    // The first frame mostly after the release: at least 12ms on. A frame painted just after it is still mostly the
    // old move, and is skipped.
    upAt: f.findIndex((p) => p.t > rec.up + 12),
    downMs: rec.down,
    upMs: rec.up,
  }
}

/** A mouse on desktop; a real touch (through CDP) on mobile, so `touch-action` and touch pointer events are in play. */
async function pointerOn(page: Page, isMobile: boolean) {
  const box = (await springCard(page).boundingBox())!
  const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  const cdp = isMobile ? await page.context().newCDPSession(page) : null
  let downAt = 0
  return {
    down: async () => {
      if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [at] })
      else {
        await page.mouse.move(at.x, at.y)
        await page.mouse.down()
      }
      downAt = Date.now()
    },
    up: async () => {
      if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      else await page.mouse.up()
    },
    sinceDown: () => Date.now() - downAt,
  }
}

test.describe('Spring', () => {
  test('controls rewrite the prompt', async ({ page }) => {
    await page.goto('/terms/spring')
    await expect(prompt(page)).toContainText('`{ type: "spring", duration: 0.5, bounce: 0 }`, settled by 500ms')
    await expect(prompt(page)).toContainText('`{ type: "spring", stiffness: 341, damping: 36.9, mass: 1 }`')
    await expect(prompt(page)).toContainText('Bounce 0, the product UI default: never passes the target.')
    await expect(prompt(page)).toContainText('velocity: x.getVelocity()')
    await expect(prompt(page)).toContainText('Motion 14 drops it on `duration`/`bounce` (and `visualDuration`) springs; the physics form keeps it.')
    await expect(prompt(page)).toContainText('Motion route (no curve, no `transition-duration`)')
    await expect(prompt(page)).toContainText('reversed mid-move it flips direction at speed')
    await expect(prompt(page)).toContainText('the card is a `<button type="button">`')
    await expect(prompt(page)).not.toContainText('stops dead')
    await expect(prompt(page)).not.toContainText('Comparison only')
    await expect(prompt(page)).not.toContainText('cubic-bezier')

    await option(page, 'Bounce', '0.2').click()
    await expect(prompt(page)).toContainText('bounce: 0.2 }')
    await expect(prompt(page)).toContainText('stiffness: 324, damping: 28.8, mass: 1')
    await expect(prompt(page)).toContainText('about 1.5% past the target, once')
    await expect(prompt(page)).not.toContainText('never passes the target')

    await option(page, 'Duration', '0.8s').click()
    await expect(prompt(page)).toContainText('`{ type: "spring", duration: 0.8, bounce: 0.2 }`, settled by 800ms')
    await expect(prompt(page)).toContainText('stiffness: 126, damping: 18, mass: 1')
    await expect(prompt(page)).toContainText('`transition: transform 800ms linear(…)`')
    await expect(prompt(page)).not.toContainText('500ms')

    await option(page, 'Bounce', '0.4 (playful)').click()
    await expect(prompt(page)).toContainText('about 9.5% past the target, over the 0.3 cap')
    await expect(prompt(page)).toContainText('stiffness: 190, damping: 16.6, mass: 1')

    await option(page, 'Compare', 'Ease-out').click()
    await expect(prompt(page)).toContainText('Comparison only: a twin card below on `cubic-bezier(0.23, 1, 0.32, 1)` (ease-out), 800ms')
    await expect(demo(page, 'spring').locator('[data-twin-card]')).toHaveCount(1)
    await option(page, 'Compare', 'None').click()
    await expect(prompt(page)).not.toContainText('Comparison only')
    await expect(demo(page, 'spring').locator('[data-twin-card]')).toHaveCount(0)
  })

  test('held and let go mid-move, the card carries its speed into the turn; the ease-out twin reverses at once', async ({ page, isMobile }) => {
    await page.goto('/terms/spring')
    await option(page, 'Compare', 'Ease-out').click()
    // Duration 0.8: let go anywhere from about 100ms to 250ms in, the card is still moving fast enough to carry on
    // for a frame, so the check does not hang on how long the hold really took on a loaded machine.
    await option(page, 'Duration', '0.8s').click()
    await expect(demo(page, 'spring')).toHaveAttribute('data-playing', 'true')
    await homeAndRecord(page)
    const pointer = await pointerOn(page, isMobile)
    await pointer.down()
    await expect(springHint(page)).toHaveText('Release to send it back')
    await expect(springCard(page)).toHaveAttribute('aria-pressed', 'true')
    await page.waitForTimeout(Math.max(0, 120 - pointer.sinceDown()))
    await pointer.up()
    await page.waitForTimeout(500)
    const rec = await stopRecording(page)
    const after = rec.speeds.slice(rec.upAt, rec.upAt + 4)
    const before = rec.speeds[rec.beforeAt]
    await expect(springCard(page)).toHaveAttribute('data-side', 'a')
    await expect(springCard(page)).toHaveAttribute('aria-pressed', 'false')
    await expect(demo(page, 'spring').locator('[data-taken-over]')).toHaveAttribute('data-taken-over', 'true')
    await expect(springHint(page)).toHaveText('Hold the card, let go early')
    // It was heading for B at speed.
    expect(before.s).toBeGreaterThan(2)
    const s = after.map((a) => a.s)
    // Momentum: the first frame after the release still moves toward B, by less than the frame before.
    expect(s[0]).toBeGreaterThan(0)
    expect(s[0]).toBeLessThan(before.s)
    // Then it turns once within these 4 frames: it keeps slowing until the first frame back, which is slower than it
    // was going out (it never reverses within a single frame), and every frame after that heads for A.
    const turn = s.findIndex((v) => v < 0)
    expect(turn).toBeGreaterThan(0)
    for (let i = 1; i <= turn; i++) expect(s[i]).toBeLessThan(s[i - 1])
    expect(Math.abs(s[turn])).toBeLessThan(before.s)
    expect(s.slice(turn).every((v) => v < 0)).toBe(true)
    // No jump: from the release on, no frame moves faster than the fastest frame on the way out, with some margin.
    const outPeak = Math.max(...rec.speeds.slice(0, rec.upAt).map((v) => v.s))
    expect(Math.max(...rec.speeds.slice(rec.upAt).map((v) => Math.abs(v.s)))).toBeLessThan(outPeak * 1.25)
    // The ease-out twin, sent back at the same instant, snaps into reverse: it heads back from the first frame on,
    // and by the second it is going back faster than the spring card is moving at all.
    expect(before.t).toBeGreaterThan(0)
    expect(after.every((a) => a.t < 0)).toBe(true)
    expect(-after[1].t).toBeGreaterThan(Math.abs(after[1].s))
  })

  test('a quick click still sends the card out and back on its own', async ({ page, isMobile }) => {
    await page.goto('/terms/spring')
    await expect(demo(page, 'spring')).toHaveAttribute('data-playing', 'true')
    const { home, travel } = await homeAndRecord(page)
    const pointer = await pointerOn(page, isMobile)
    await pointer.down()
    await pointer.up()
    await page.waitForTimeout(900)
    const rec = await stopRecording(page)
    expect(rec.upMs - rec.downMs).toBeLessThan(150)
    const s = rec.speeds.map((v) => v.s)
    // The release does not send it back: it keeps going toward B, past 40% of the way.
    const early = s.slice(1).filter((_, k) => rec.times[k + 1] - rec.downMs < 90)
    expect(early.length).toBeGreaterThan(2)
    expect(early.every((v) => v > 0)).toBe(true)
    expect(Math.max(...rec.xs) - home).toBeGreaterThan(travel * 0.4)
    // The automatic redirect does, on the timeline's beat (90ms after the press at duration 0.5): the card turns
    // once, after that, and settles home.
    const turn = s.findIndex((v) => v < -0.5)
    expect(rec.times[turn] - rec.downMs).toBeGreaterThan(90)
    expect(s.slice(turn).every((v) => v < 0.5)).toBe(true)
    expect(rec.xs[rec.xs.length - 1]).toBeCloseTo(home, 0)
    await expect(springCard(page)).toHaveAttribute('aria-pressed', 'false')
  })

  test('with reduced motion, a hold jumps the card across and the release jumps it back', async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/terms/spring')
    await expect(demo(page, 'spring')).toHaveAttribute('data-playing', 'false')
    const { home, travel } = await homeAndRecord(page)
    const pointer = await pointerOn(page, isMobile)
    await pointer.down()
    await page.waitForTimeout(300)
    await expect(springCard(page)).toHaveAttribute('aria-pressed', 'true')
    await pointer.up()
    await page.waitForTimeout(200)
    const rec = await stopRecording(page)
    // The card is only ever at one end or the other: no in-between positions.
    expect(rec.all.every((x) => Math.abs(x - home) < 0.5 || Math.abs(x - home - travel) < 0.5)).toBe(true)
    expect(rec.all.some((x) => Math.abs(x - home - travel) < 0.5)).toBe(true)
    expect(rec.all.at(-1)).toBeCloseTo(home, 1)
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
    await expect(prompt(page)).toContainText('`stagger(0.06)`, uncapped; it replaces `staggerChildren`')
    await expect(prompt(page)).toContainText('Exit: the whole list as one, 150ms ease-out')
    await expect(prompt(page)).toContainText('never per item')
    await expect(prompt(page)).toContainText('`translate: none` on `[data-leaving]`')
    await expect(prompt(page)).not.toContainText('staggerChildren: 0.06')
    await expect(prompt(page)).not.toContainText('too slow')
    await expect(prompt(page)).not.toContainText('Comparison only')

    await option(page, 'Delay', '100ms (slow)').click()
    await expect(prompt(page)).toContainText('100ms per step (too slow; ship 30 to 80ms)')
    await expect(prompt(page)).toContainText('* 100ms)')
    await expect(prompt(page)).toContainText('Math.min(i, 6) * 0.1')
    await option(page, 'Delay', '30ms').click()
    await expect(prompt(page)).not.toContainText('too slow')
    await expect(prompt(page)).toContainText('no item waits more than 180ms')

    await option(page, 'Order', 'Reverse').click()
    await expect(prompt(page)).toContainText('last item first (`--n` = count - 1 - index)')
    await expect(prompt(page)).toContainText('Math.min(total - 1 - i, 6) * 0.03')
    await expect(prompt(page)).toContainText('`stagger(0.03, { from: "last" })`, uncapped')
    await expect(prompt(page)).not.toContainText('first item first')
    await option(page, 'Order', 'Center out').click()
    await expect(prompt(page)).toContainText('middle out: `--n` = distance from the middle, rounded down (6 items: 2, 1, 0, 0, 1, 2)')
    await expect(prompt(page)).toContainText('Math.min(Math.floor(Math.abs(i - (total - 1) / 2)), 6) * 0.03')
    await expect(prompt(page)).not.toContainText('from: "last"')

    await option(page, 'Compare', 'All at once').click()
    await expect(prompt(page)).toContainText('Comparison only: a twin list, every delay 0.')
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
      await option(page, 'Delay', ms === 100 ? '100ms (slow)' : `${ms}ms`).click()
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
    // A replay starts a cycle at once: the list leaves (from a finished cascade: `leave`), then the cascade runs.
    await page.getByRole('button', { name: 'Replay' }).click()
    await expect(stage).toHaveAttribute('data-phase', /^(out|leave)$/)
    await expect(stage).toHaveAttribute('data-phase', 'in')
    const names = await stage.locator('[data-stagger-item]').evaluateAll((els) => els.map((el) => getComputedStyle(el).animationName))
    expect(names).toEqual(Array.from({ length: 6 }, () => 'demo-stagger-in'))
  })

  // Anything that starts a new cycle mid-cascade: Replay, and the controls (a change re-renders the demo at once).
  for (const interrupt of [
    { name: 'a replay', group: null, button: 'Replay' },
    { name: 'an Order change', group: 'Order', button: 'Reverse' },
    { name: 'a Delay change', group: 'Delay', button: '60ms' },
  ]) {
    test(`${interrupt.name} mid-cascade never flashes or re-times the items; the list leaves as one`, async ({ page }) => {
      await page.goto('/terms/stagger')
      await expect(demo(page, 'stagger')).toHaveAttribute('data-playing', 'true')
      // A control change starts a new cycle with the 100ms step; wait for its cascade on the frame clock.
      await option(page, 'Delay', '100ms (slow)').click()
      const stage = demo(page, 'stagger').locator('[data-phase]')
      await expect(stage).toHaveAttribute('data-phase', /^(out|leave)$/)
      const result = await stage.evaluate(async (root: HTMLElement, { group, button }) => {
        const frame = () => new Promise((r) => requestAnimationFrame(r))
        const items = [...root.querySelectorAll<HTMLElement>('[data-list="stagger"] [data-stagger-item]')]
        const list = root.querySelector<HTMLElement>('[data-list="stagger"] [data-stagger-list]')!
        const opacities = () => items.map((el) => Number(getComputedStyle(el).opacity))
        const target = group
          ? [...document.querySelectorAll<HTMLButtonElement>(`[role="group"][aria-label="${group}"] button`)].find((b) => b.textContent === button)!
          : document.querySelector<HTMLButtonElement>(`button[aria-label="${button}"]`)!
        // 250ms into the cascade, timed from the frame it starts.
        while (root.dataset.phase !== 'in') await frame()
        const start = performance.now()
        while (performance.now() - start < 250) await frame()
        const before = opacities()
        target.click()
        // Frames until the new cycle lands (React runs it after the click), keeping the last cascade frame.
        let last = before
        // Any painted frame between the click and the switch: no item may drop, or jump up faster than the
        // entrance itself allows (a re-timed item would pop in or out here).
        let worstDrop = 0
        let worstJump = 0
        while (root.dataset.phase === 'in') {
          const now = opacities()
          now.forEach((o, i) => {
            worstDrop = Math.max(worstDrop, last[i] - o)
            worstJump = Math.max(worstJump, o - last[i])
          })
          last = now
          await frame()
        }
        const atSwitch = opacities()
        await frame()
        const next = opacities()
        await frame()
        const listOpacity = Number(getComputedStyle(list).opacity)
        return { phase: String(root.getAttribute('data-phase')), before, last, atSwitch, next, listOpacity, worstDrop, worstJump }
      }, interrupt)
      expect(result.phase).toBe('leave')
      expect(result.worstDrop).toBeLessThanOrEqual(0.001)
      expect(result.worstJump).toBeLessThan(0.75)
      // Mid-cascade: some items in, some still waiting.
      expect(result.before.some((o) => o > 0.9)).toBe(true)
      expect(result.before.some((o) => o === 0)).toBe(true)
      result.atSwitch.forEach((o, i) => {
        // No visible item drops out, and the waiting ones stay at 0: nothing was re-timed.
        expect(o).toBeGreaterThanOrEqual(result.last[i] - 0.001)
        if (result.last[i] === 0) expect(o).toBe(0)
        // Once the list is leaving, every item holds: no opacity rises on the next frame.
        expect(result.next[i]).toBeLessThanOrEqual(o + 0.001)
        expect(result.next[i]).toBeGreaterThanOrEqual(o - 0.001)
      })
      // The list itself is fading.
      expect(result.listOpacity).toBeLessThan(1)
    })
  }
})
