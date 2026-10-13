import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import data from '../../src/generated/terms-data.json'

import { SITE_URL } from '../../src/lib/site'

// Machine-readable outputs carry published terms only, whatever NEXT_PUBLIC_SHOW_REVIEW says.
// Both sets come from the generated data, so publishing a term never breaks these tests.
const published = data.filter((t) => t.status === 'published')
const unpublished = data.filter((t) => t.status !== 'published')

test('/llms.txt lists published terms and nothing else', async ({ request }) => {
  expect(published.length).toBeGreaterThan(0)
  const res = await request.get('/llms.txt')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('text/plain')
  const body = await res.text()
  expect(body).toContain('# moveset')
  for (const t of published) expect(body).toContain(`[${t.name}](${SITE_URL}/terms/${t.slug}.md)`)
  // Review terms show on the site with NEXT_PUBLIC_SHOW_REVIEW=1, never in agent outputs.
  for (const t of unpublished) expect(body, t.slug).not.toContain(`/terms/${t.slug}.md`)
  expect(body).toContain(`${SITE_URL}/api/terms.json`)
})

test('/terms/sticky.md serves the entry as markdown', async ({ request }) => {
  const res = await request.get('/terms/sticky.md')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('markdown')
  expect(await res.text()).toMatch(/^# Sticky\n/)
})

test('every published term has a .md', async ({ request }) => {
  for (const { slug } of published) {
    expect((await request.get(`/terms/${slug}.md`)).status(), slug).toBe(200)
  }
})

test('no unpublished term has a .md', async ({ request }) => {
  test.skip(unpublished.length === 0, 'every term is published')
  for (const { slug } of unpublished) {
    expect((await request.get(`/terms/${slug}.md`)).status(), slug).toBe(404)
  }
})

test('/api/terms.json holds exactly the published terms', async ({ request }) => {
  const res = await request.get('/api/terms.json')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('application/json')
  const json = await res.json()
  expect(Object.keys(json)).toEqual(['site', 'terms'])
  expect(json.site).toBe(SITE_URL)
  expect(json.terms.map((t: { slug: string }) => t.slug).sort()).toEqual(published.map((t) => t.slug).sort())
  const sticky = json.terms.find((t: { slug: string }) => t.slug === 'sticky')
  expect(sticky.prompt.length).toBeGreaterThan(0)
  expect(sticky.promptText).toMatch(/^# Sticky\n/)
  expect(sticky.promptText).toContain(sticky.prompt)
  expect(sticky.acceptance.length).toBeGreaterThan(0)
})

test('the skill is downloadable and matches the committed file', async ({ request }) => {
  const res = await request.get('/skills/moveset/SKILL.md')
  expect(res.status()).toBe(200)
  expect(await res.text()).toBe(readFileSync('skills/moveset/SKILL.md', 'utf8').replace(/\r\n/g, '\n'))
  expect((await request.get('/skills/moveset/terms/sticky.md')).status()).toBe(200)
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('/terms/sticky has the whole entry in the server HTML', async ({ page, request }) => {
    const json = await (await request.get('/api/terms.json')).json()
    const sticky = json.terms.find((t: { slug: string }) => t.slug === 'sticky')
    const approaches = Object.values(sticky.code).filter(Boolean).length
    expect(approaches).toBeGreaterThan(1)

    await page.goto('/terms/sticky')
    const article = page.locator('article')
    await expect(article).toHaveCount(1)
    await expect(article.locator('h1')).toHaveText('Sticky')
    const h2s = await article.locator('h2').allTextContents()
    expect(h2s).toEqual(expect.arrayContaining(['Use when', 'Avoid when', 'Prompt', 'Code', 'Accessibility', 'Related']))
    // The prompt plus one panel per code approach, all in the HTML and all visible without JS.
    const blocks = article.locator('pre > code')
    await expect(blocks).toHaveCount(1 + approaches)
    for (const block of await blocks.all()) await expect(block).toBeVisible()
    // The prompt at default values, exactly as terms.json has it.
    expect(await blocks.first().textContent()).toBe(sticky.prompt)
    await expect(page.locator('link[rel="alternate"][type="text/markdown"]')).toHaveAttribute('href', /\/terms\/sticky\.md$/)
  })
})

test('with JavaScript only the selected code panel shows', async ({ page }) => {
  await page.goto('/terms/sticky')
  const panels = page.getByRole('main').locator('[role=tabpanel]')
  await expect(panels.locator('visible=true')).toHaveCount(1)
  const second = page.getByRole('tab').nth(1)
  await second.click()
  await expect(page.locator(`#${await second.getAttribute('aria-controls')}`)).toBeVisible()
  await expect(panels.locator('visible=true')).toHaveCount(1)
})
