import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, trackErrors } from './helpers'

test('home loads without errors or sideways scroll', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/')
  await expect(page).toHaveTitle(/moveset/)
  await expectNoHorizontalOverflow(page)
  expect(errors).toEqual([])
})

test.describe('sidebar', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop only')

  test('lists every term under its category, drafts muted with Soon', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Terms' })
    await expect(nav.getByRole('heading', { level: 2 })).toHaveCount(7)
    await expect(nav.getByRole('listitem')).toHaveCount(47)
    const parallax = nav.getByRole('listitem').filter({ hasText: 'Parallax' })
    await expect(parallax.getByRole('link')).toHaveCount(0)
    await expect(parallax).toContainText('Soon')
  })
})

test('sidebar is hidden on mobile', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only')
  await page.goto('/')
  await expect(page.getByRole('navigation', { name: 'Terms' })).toBeHidden()
})

test('theme toggle cycles system → light → dark and persists', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  const toggle = page.getByRole('button', { name: /^Theme:/ })
  await expect(toggle).toHaveAccessibleName(/Theme: System/)
  await toggle.click()
  await expect(toggle).toHaveAccessibleName(/Theme: Light/)
  await expect(page.locator('html')).toHaveClass(/light/)
  await toggle.click()
  await expect(toggle).toHaveAccessibleName(/Theme: Dark/)
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('system dark mode renders dark on first paint without hydration errors', async ({ page }) => {
  const errors = trackErrors(page)
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await expect(page.locator('html')).toHaveClass(/dark/)
  const toggle = page.getByRole('button', { name: /^Theme:/ })
  const before = await toggle.boundingBox()
  await toggle.click()
  const after = await toggle.boundingBox()
  expect(after?.width).toBe(before?.width)
  expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([])
})
