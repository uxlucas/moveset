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
    await expect(prompt(page)).not.toContainText('Comparison only')
    await option(page, 'Curve', 'Expo').click()
    await expect(prompt(page)).toContainText('`cubic-bezier(0.19, 1, 0.22, 1)` (ease-out expo)')
    await expect(prompt(page)).not.toContainText('var(--ease-out)')
    await option(page, 'Curve', 'Keyword').click()
    await expect(prompt(page)).toContainText('`ease-out` keyword (comparison only; ship `cubic-bezier(0.23, 1, 0.32, 1)`)')
    await option(page, 'Duration', '300ms').click()
    await expect(prompt(page)).toContainText('`none`, 300ms `ease-out` keyword')
    await expect(prompt(page)).toContainText('`opacity: 0; transform: scale(0.95)`, 220ms, same curve.')
    await expect(prompt(page)).not.toContainText('200ms')
    await option(page, 'Compare', 'Ease-in').click()
    await expect(prompt(page)).toContainText('Comparison only; do not ship ease-in on UI: a second menu beside it with `cubic-bezier(0.42, 0, 1, 1)`')
    await option(page, 'Compare', 'Linear').click()
    await expect(prompt(page)).toContainText('Comparison only: a second menu beside it with `linear`')
    await expect(prompt(page)).not.toContainText('do not ship ease-in')
  })

  test('the menu transitions with the selected curve and duration; the comparison menu is linear', async ({ page }) => {
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
    await expect(prompt(page)).toContainText('300ms `var(--ease-in-out)` (`cubic-bezier(0.77, 0, 0.175, 1)`), both directions')
    await expect(prompt(page)).not.toContainText('UI budget')
    await option(page, 'Curve', 'Cubic').click()
    await expect(prompt(page)).toContainText('`cubic-bezier(0.645, 0.045, 0.355, 1)` (ease-in-out cubic)')
    await expect(prompt(page)).toContainText('ease: [0.645, 0.045, 0.355, 1]')
    await expect(prompt(page)).not.toContainText('var(--ease-in-out)')
    await option(page, 'Duration', '400ms').click()
    await expect(prompt(page)).toContainText('400ms (above the 300ms UI budget)')
    await expect(prompt(page)).toContainText('duration: 0.4,')
    await option(page, 'Compare', 'Ease-out').click()
    await expect(prompt(page)).toContainText('Comparison only: a twin row below with `cubic-bezier(0.23, 1, 0.32, 1)` (ease-out)')
    await option(page, 'Compare', 'None').click()
    await expect(prompt(page)).not.toContainText('Comparison only')
  })

  test('items transition with the selected curve and duration; the comparison row is linear', async ({ page }) => {
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
  })

  test('a replay mid-move reverses from where the item is, without a jump', async ({ page }) => {
    await page.goto('/terms/ease-in-out')
    // The longest move, so there is time to land in the middle of it. A control change starts a fresh cycle.
    await option(page, 'Duration', '400ms').click()
    const item = page.locator('main [data-item="a"]')
    const result = await item.evaluate(async (el) => {
      const frame = () => new Promise((r) => requestAnimationFrame(r))
      const row = el.parentElement!
      const x = () => el.getBoundingClientRect().left - row.getBoundingClientRect().left
      // The fresh cycle waits 550ms before the move; catch the frame it starts.
      const order = () => el.dataset.order
      if (order() !== '0') throw new Error('the move started before the test was watching')
      while (order() !== '2') await frame()
      const start = performance.now()
      while (performance.now() - start < 170) await frame()
      const before = x()
      document.querySelector<HTMLButtonElement>('button[aria-label="Replay"]')!.click()
      await frame()
      await frame()
      const after = x()
      const slot = (row.getBoundingClientRect().width - el.getBoundingClientRect().width) / 2
      return { before, after, slot, order: order() }
    })
    // Mid-move: well away from both ends.
    expect(result.before).toBeGreaterThan(result.slot * 0.3)
    expect(result.before).toBeLessThan(result.slot * 1.7)
    // The replay sends it home, starting from where it was: two frames later it is near that spot, not snapped to 0.
    expect(result.order).toBe('0')
    expect(Math.abs(result.after - result.before)).toBeLessThan(result.slot * 0.5)
    expect(result.after).toBeGreaterThan(result.slot * 0.2)
  })
})
