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

  test('lists every term under its category, drafts muted with a dashed glyph', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Terms' })
    await expect(nav.getByRole('heading', { level: 2 })).toHaveCount(7)
    await expect(nav.getByRole('listitem')).toHaveCount(47)
    const parallax = nav.getByRole('listitem').filter({ hasText: 'Parallax' })
    await expect(parallax.getByRole('link')).toHaveCount(0)
    await expect(parallax).toContainText('(soon)')
    await expect(parallax.locator('[data-glyph="soon"]')).toHaveCount(1)
    await expect(nav).not.toContainText('Soon')
  })

  test('an entry page marks its term and animates only that glyph', async ({ page }) => {
    await page.goto('/terms/sticky')
    const nav = page.getByRole('navigation', { name: 'Terms' })
    const sticky = nav.getByRole('link', { name: 'Sticky' })
    await expect(sticky).toHaveAttribute('aria-current', 'page')
    await expect(sticky).toHaveAttribute('data-current', 'true')
    await expect(sticky.locator('.gl')).toHaveAttribute('data-active', 'true')
    await expect(page.locator('aside .gl[data-active="true"]')).toHaveCount(1)
    await expect(page.locator('aside [aria-current="page"]')).toHaveCount(1)
    const animation = await sticky.locator('.gl .m').evaluate((el) => getComputedStyle(el).animationName)
    expect(animation).toBe('g-stick')
  })

  test('reduced motion stills the current glyph', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/terms/sticky')
    const glyph = page.getByRole('navigation', { name: 'Terms' }).getByRole('link', { name: 'Sticky' }).locator('.gl')
    await expect(glyph).toHaveAttribute('data-active', 'true')
    expect(await glyph.locator('.m').evaluate((el) => getComputedStyle(el).animationName)).toBe('none')
  })

  test('on the index, the highlight follows the card being read', async ({ page }) => {
    await page.goto('/')
    const aside = page.locator('aside')
    await expect(aside.locator('[data-current="true"]')).toHaveText('Index')
    const section = page.getByRole('main').locator('section[aria-labelledby="cat-gestures"]')
    const firstSlug = await section.getByTestId('term-card').first().getAttribute('data-slug')
    await section.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY))
    await expect(aside.locator('[data-current="true"]')).toHaveAttribute('data-k', firstSlug!)
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(aside.locator('[data-current="true"]')).toHaveText('Index')
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
