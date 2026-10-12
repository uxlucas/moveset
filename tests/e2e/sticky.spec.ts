import { expect, test } from '@playwright/test'

const stickyCard = (page: import('@playwright/test').Page) => page.locator('[data-testid="term-card"][data-slug="sticky"]')

test('Sticky is clickable on the index in review mode', async ({ page }) => {
  await page.goto('/')
  await expect(stickyCard(page).getByRole('link', { name: 'Sticky' })).toHaveAttribute('href', '/terms/sticky')
})

test('card demo plays only while on screen', async ({ page }) => {
  await page.goto('/')
  const demo = stickyCard(page).locator('[data-demo="sticky"]')
  await demo.scrollIntoViewIfNeeded()
  await expect(demo).toHaveAttribute('data-playing', 'true')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect(demo).toHaveAttribute('data-playing', 'false')
})

test('reduced motion: nothing plays until asked', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const demo = stickyCard(page).locator('[data-demo="sticky"]')
  await demo.scrollIntoViewIfNeeded()
  await expect(demo).toHaveAttribute('data-playing', 'false')
  await stickyCard(page).getByRole('button', { name: 'Play Sticky demo' }).click()
  await expect(demo).toHaveAttribute('data-playing', 'true')
})

test('headers report stuck state', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const demo = stickyCard(page).locator('[data-demo="sticky"]')
  await demo.scrollIntoViewIfNeeded()
  const setScroll = (top: number) =>
    demo.evaluate((el, y) => {
      const scroller = [...el.querySelectorAll<HTMLElement>('*')].find((n) => n.scrollHeight > n.clientHeight && getComputedStyle(n).overflowY !== 'visible')
      if (!scroller) throw new Error('no scroll container in demo')
      scroller.scrollTop = y
    }, top)
  await setScroll(0)
  await expect(demo.locator('[data-sticky-header]').first()).toHaveAttribute('data-stuck', 'false')
  await setScroll(160)
  await expect(demo.locator('[data-sticky-header][data-stuck="true"]').first()).toBeVisible()
})
