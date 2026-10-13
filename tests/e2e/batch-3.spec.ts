import { expect, test, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow, trackErrors } from './helpers'

const card = (page: Page, slug: string) => page.locator(`[data-testid="term-card"][data-slug="${slug}"]`)
const demo = (page: Page, slug: string) => page.locator(`main [data-demo="${slug}"]`)
const prompt = (page: Page) => page.getByRole('main').locator('pre').first()
const option = (page: Page, control: string, name: string) =>
  page.getByRole('group', { name: control }).getByRole('button', { name, exact: true })
const timing = (page: Page, selector: string) =>
  page.locator(`main ${selector}`).evaluateAll((els) =>
    els.map((el) => {
      const style = getComputedStyle(el)
      return { fn: style.transitionTimingFunction, duration: style.transitionDuration }
    }),
  )

for (const { slug, name, subject } of [
  { slug: 'ease-out', name: 'Ease-out', subject: '[data-popover]' },
  { slug: 'ease-in-out', name: 'Ease-in-out', subject: '[data-item]' },
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

test.describe('Ease-out', () => {
  test('controls rewrite the prompt', async ({ page }) => {
    await page.goto('/terms/ease-out')
    await expect(prompt(page)).toContainText('200ms `var(--ease-out)` (`cubic-bezier(0.23, 1, 0.32, 1)`).')
    await expect(prompt(page)).toContainText('`opacity: 0; transform: scale(0.95)`, 150ms, same curve.')
    await expect(prompt(page)).toContainText('base rule `transition-duration: 150ms` (close), `[data-open]` `200ms` (open)')
    await expect(prompt(page)).toContainText('CSS route, closed: stays mounted, `inert`, `pointer-events: none`.')
    await expect(prompt(page)).toContainText('Motion route: `AnimatePresence`, unmounts after the exit')
    await expect(prompt(page)).not.toContainText('Comparison only')
    await expect(page.getByRole('group', { name: 'Curve' }).getByRole('button', { name: 'Keyword' })).toHaveCount(0)
    await option(page, 'Curve', 'Expo').click()
    await expect(prompt(page)).toContainText('`cubic-bezier(0.19, 1, 0.22, 1)` (ease-out expo)')
    await expect(prompt(page)).not.toContainText('var(--ease-out)')
    await option(page, 'Duration', '300ms').click()
    await expect(prompt(page)).toContainText('`opacity: 0; transform: scale(0.95)`, 220ms, same curve.')
    await expect(prompt(page)).toContainText('`[data-open]` `300ms` (open)')
    await expect(prompt(page)).not.toContainText('200ms')
    await option(page, 'Compare', 'Keyword').click()
    await expect(prompt(page)).toContainText('Comparison only; ship the curve above: a second menu beside it with the CSS `ease-out` keyword')
    await option(page, 'Curve', 'Quint (house)').click()
    await expect(prompt(page)).toContainText('Comparison only; ship the house curve: a second menu beside it with the CSS `ease-out` keyword')
    await option(page, 'Compare', 'Ease-in').click()
    await expect(prompt(page)).not.toContainText('keyword')
    await expect(prompt(page)).toContainText('Comparison only; do not ship ease-in on UI: a second menu beside it with `cubic-bezier(0.42, 0, 1, 1)`')
    await option(page, 'Compare', 'Linear').click()
    await expect(prompt(page)).toContainText('Comparison only: a second menu beside it with `linear`')
    await expect(prompt(page)).not.toContainText('do not ship ease-in')
  })

  test('the menu transitions with the selected curve and duration; the comparison menus use theirs', async ({ page }) => {
    // Reduced motion keeps the demo on its still frame (menu open), so the computed values are stable.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/terms/ease-out')
    await expect(demo(page, 'ease-out')).toHaveAttribute('data-playing', 'false')
    await expect(page.locator('main [data-popover]')).toHaveAttribute('data-open', 'true')
    await expect.poll(() => timing(page, '[data-popover]')).toEqual([{ fn: 'cubic-bezier(0.23, 1, 0.32, 1)', duration: '0.2s' }])

    await option(page, 'Curve', 'Expo').click()
    await option(page, 'Duration', '300ms').click()
    await expect.poll(() => timing(page, '[data-popover]')).toEqual([{ fn: 'cubic-bezier(0.19, 1, 0.22, 1)', duration: '0.3s' }])
    // Closed, the exit duration applies: 25% faster, rounded down.
    await page.locator('main [data-popover]').evaluate((el) => (el.dataset.open = 'false'))
    expect(await timing(page, '[data-popover]')).toEqual([{ fn: 'cubic-bezier(0.19, 1, 0.22, 1)', duration: '0.22s' }])

    await option(page, 'Compare', 'Linear').click()
    await expect(page.locator('main [data-popover]')).toHaveCount(2)
    await expect.poll(async () => (await timing(page, '[data-popover]'))[1].fn).toBe('linear')
    // The still frame puts both menus open again.
    await expect(page.locator('main [data-popover][data-open="true"]')).toHaveCount(2)
    await option(page, 'Compare', 'Keyword').click()
    await expect.poll(async () => (await timing(page, '[data-popover]'))[1].fn).toBe('ease-out')
    await expect(demo(page, 'ease-out').getByText('CSS keyword', { exact: true })).toBeVisible()
    await expect(demo(page, 'ease-out').getByText('ease-out expo', { exact: true })).toBeVisible()
  })

  test('a play closes the menu, then opens it again from the trigger corner', async ({ page }) => {
    await page.goto('/terms/ease-out')
    const menu = page.locator('main [data-popover]')
    await expect(menu).toHaveAttribute('data-open', 'false')
    await expect(menu).toHaveAttribute('data-open', 'true')
    expect(await menu.evaluate((el) => getComputedStyle(el).transformOrigin)).toBe('0px 0px')
  })
})

test.describe('Ease-in-out', () => {
  test('controls rewrite the prompt', async ({ page }) => {
    await page.goto('/terms/ease-in-out')
    await expect(prompt(page)).toContainText('300ms `var(--ease-in-out)` (`cubic-bezier(0.77, 0, 0.175, 1)`), all together, both directions')
    await expect(prompt(page)).toContainText("every card stacked at the row's start (`position: absolute; left: 0; top: 0`)")
    await expect(prompt(page)).toContainText('re-sort after `transitionend`')
    await expect(prompt(page)).toContainText('Motion: `<MotionConfig reducedMotion="user">`')
    await expect(prompt(page)).not.toContainText('UI budget')
    await expect(page.getByRole('group', { name: 'Curve' }).getByRole('button', { name: 'Keyword' })).toHaveCount(0)
    await option(page, 'Curve', 'Cubic').click()
    await expect(prompt(page)).toContainText('`cubic-bezier(0.645, 0.045, 0.355, 1)` (ease-in-out cubic)')
    await expect(prompt(page)).toContainText('ease: [0.645, 0.045, 0.355, 1]')
    await expect(prompt(page)).not.toContainText('var(--ease-in-out)')
    await option(page, 'Duration', '400ms').click()
    await expect(prompt(page)).toContainText('400ms (above the 300ms UI budget)')
    await expect(prompt(page)).toContainText('duration: 0.4,')
    await option(page, 'Compare', 'Ease-out').click()
    await expect(prompt(page)).toContainText('Comparison only: a twin row below with `cubic-bezier(0.23, 1, 0.32, 1)` (ease-out)')
    await option(page, 'Compare', 'Keyword').click()
    await expect(prompt(page)).toContainText('Comparison only; ship the curve above: a twin row below with the CSS `ease-in-out` keyword')
    await expect(prompt(page)).not.toContainText('(ease-out)')
    await option(page, 'Compare', 'None').click()
    await expect(prompt(page)).not.toContainText('Comparison only')
  })

  test('items transition with the selected curve and duration; the comparison rows use theirs', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/terms/ease-in-out')
    await expect(demo(page, 'ease-in-out')).toHaveAttribute('data-playing', 'false')
    const quart = { fn: 'cubic-bezier(0.77, 0, 0.175, 1)', duration: '0.3s' }
    await expect.poll(() => timing(page, '[data-item]')).toEqual([quart, quart, quart])
    await option(page, 'Curve', 'Expo').click()
    await option(page, 'Duration', '200ms').click()
    const expo = { fn: 'cubic-bezier(1, 0, 0, 1)', duration: '0.2s' }
    await expect.poll(() => timing(page, '[data-item]')).toEqual([expo, expo, expo])
    await option(page, 'Compare', 'Linear').click()
    await expect(page.locator('main [data-item]')).toHaveCount(6)
    await expect.poll(async () => (await timing(page, '[data-item]')).slice(3).map((t) => t.fn)).toEqual(['linear', 'linear', 'linear'])
    await option(page, 'Compare', 'Keyword').click()
    await expect
      .poll(async () => (await timing(page, '[data-item]')).slice(3).map((t) => t.fn))
      .toEqual(['ease-in-out', 'ease-in-out', 'ease-in-out'])
    await expect(demo(page, 'ease-in-out').getByText('CSS keyword', { exact: true })).toBeVisible()
  })

  test('a replay mid-move reverses from where the item is, without a jump', async ({ page }) => {
    await page.goto('/terms/ease-in-out')
    // The longest move, so there is time to land in the middle of it.
    await option(page, 'Duration', '400ms').click()
    const item = page.locator('main [data-item="a"]')
    const result = await item.evaluate(async (el) => {
      const frame = () => new Promise((r) => requestAnimationFrame(r))
      const row = el.parentElement!
      const x = () => el.getBoundingClientRect().left - row.getBoundingClientRect().left
      const replay = () => document.querySelector<HTMLButtonElement>('button[aria-label="Replay"]')!.click()
      // Start a fresh cycle from in here, so test-runner latency can't skip the move: it sends the cards home,
      // waits 550ms, then moves. Catch the frame the move starts.
      const order = () => el.dataset.order
      replay()
      while (order() !== '0') await frame()
      while (order() !== '2') await frame()
      // Mid-move: wait until the card is a good way out (the frame clock, not wall time, so a slow runner can't
      // sample it at the start).
      const slot = (row.getBoundingClientRect().width - el.getBoundingClientRect().width) / 2
      while (x() < slot * 0.4) await frame()
      const before = x()
      replay()
      // Until the replay lands, the card keeps its old heading; track it frame by frame.
      let last = before
      while (order() !== '0') {
        await frame()
        if (order() !== '0') last = x()
      }
      // A jump would leave no transition running. A retarget starts a new one from the current position.
      const transition = el.getAnimations().find((a) => (a as CSSTransition).transitionProperty === 'transform')
      // Its start value is where it was: read it at time 0, then put the transition back where it was.
      let from: number | null = null
      if (transition) {
        const now = transition.currentTime
        transition.pause()
        transition.currentTime = 0
        from = x()
        transition.currentTime = now
        transition.play()
      }
      await frame()
      await frame()
      const after = x()
      return { before, last, from, after, slot, order: order() }
    })
    // Mid-move: well away from both ends.
    expect(result.before).toBeGreaterThan(result.slot * 0.3)
    expect(result.before).toBeLessThan(result.slot * 1.7)
    // The replay sends it home from where it was: the new transition starts at or just past the last position
    // seen (the card was still heading out), short of the end, and two frames later it is not back at 0.
    expect(result.order).toBe('0')
    expect(result.from).not.toBeNull()
    expect(result.from!).toBeGreaterThanOrEqual(result.last - 1)
    expect(result.from!).toBeLessThan(result.slot * 2 - 1)
    expect(result.after).toBeGreaterThan(result.slot * 0.05)
  })
})
