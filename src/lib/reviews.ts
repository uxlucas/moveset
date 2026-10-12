import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parseFrontmatter, type Review } from './lint'

export function loadReviews(dir: string): Review[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const fm = parseFrontmatter(readFileSync(path.join(dir, f), 'utf8'))
      return {
        slug: f.replace(/\.md$/, ''),
        verdict: typeof fm.verdict === 'string' ? fm.verdict : undefined,
        approved: fm.approved === true,
      }
    })
}
