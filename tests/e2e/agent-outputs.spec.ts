import { expect, test } from '@playwright/test'
import data from '../../src/generated/terms-data.json'

// Machine-readable outputs carry published terms only, whatever NEXT_PUBLIC_SHOW_REVIEW says.
const published = data.filter((t) => t.status === 'published').map((t) => t.slug)
const unpublished = data.find((t) => t.status !== 'published')!

test('/llms.txt lists published terms and nothing else', async ({ request }) => {
  const res = await request.get('/llms.txt')
  expect(res.status()).toBe(200)
  const body = await res.text()
  expect(body).toContain('# moveset')
  expect(body).toContain('[Sticky](https://moveset.lucaslima.design/terms/sticky.md)')
  expect(body).not.toContain('Parallax')
  expect(body).toContain('https://moveset.lucaslima.design/api/terms.json')
})

test('/terms/sticky.md serves the entry as markdown', async ({ request }) => {
  const res = await request.get('/terms/sticky.md')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('markdown')
  expect(await res.text()).toMatch(/^# Sticky\n/)
})

test('/terms/<unpublished>.md is a 404', async ({ request }) => {
  expect((await request.get('/terms/parallax.md')).status()).toBe(404)
  expect((await request.get(`/terms/${unpublished.slug}.md`)).status()).toBe(404)
})

test('/api/terms.json holds exactly the published terms', async ({ request }) => {
  const res = await request.get('/api/terms.json')
  expect(res.status()).toBe(200)
  const json = await res.json()
  expect(json.site).toBe('https://moveset.lucaslima.design')
  expect(json.terms.map((t: { slug: string }) => t.slug).sort()).toEqual([...published].sort())
  const sticky = json.terms.find((t: { slug: string }) => t.slug === 'sticky')
  expect(sticky.prompt).toContain('# Sticky')
  expect(sticky.acceptance.length).toBeGreaterThan(0)
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('/terms/sticky has the whole entry in the server HTML', async ({ page, request }) => {
    const md = await (await request.get('/terms/sticky.md')).text()
    const prompt = md.match(/## Prompt\n\n```text\n([\s\S]*?)\n```/)?.[1]
    expect(prompt).toBeTruthy()

    await page.goto('/terms/sticky')
    const article = page.locator('article')
    await expect(article).toHaveCount(1)
    await expect(article.locator('h1')).toHaveText('Sticky')
    const h2s = await article.locator('h2').allTextContents()
    expect(h2s).toEqual(expect.arrayContaining(['Use when', 'Avoid when', 'Prompt', 'Code', 'Accessibility', 'Related']))
    expect(await article.locator('pre > code').count()).toBeGreaterThanOrEqual(2)
    // The prompt at default values, exactly as /terms/sticky.md has it.
    expect(await article.locator('pre > code').first().textContent()).toBe(prompt)
    await expect(page.locator('link[rel="alternate"][type="text/markdown"]')).toHaveAttribute('href', /\/terms\/sticky\.md$/)
  })
})
