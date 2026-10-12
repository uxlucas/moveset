import { test } from '@playwright/test'

for (const scheme of ['light', 'dark'] as const) {
  for (const [name, path] of [['index', '/'], ['sticky', '/terms/sticky']] as const) {
    test(`${name} ${scheme}`, async ({ page }, info) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto(path)
      await page.waitForTimeout(1500)
      await page.screenshot({ path: `docs/checkpoints/m2/${name}-${scheme}-${info.project.name}.png`, fullPage: true })
    })
  }
}
