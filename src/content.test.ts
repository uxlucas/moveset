import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import { terms } from '@/generated/registry'
import { groupByCategory } from '@/lib/content'
import { controlCombinations, lintTerms } from '@/lib/lint'
import { loadReviews } from '@/lib/reviews'
import { isFull } from '@/lib/term-types'
import config from '../content-lint.config'
import { renderSkill } from '../scripts/lib/outputs'

test('every term passes the content lint', () => {
  expect(lintTerms(terms, loadReviews('reviews'), config)).toEqual([])
})

// content-lint.config.ts exempts the whole ease-out term from the ease-in rule; ease-in belongs only in its comparison branch.
test('ease-out shows ease-in in its code only when comparing against ease-in', () => {
  const term = terms.find((t) => t.slug === 'ease-out')
  if (!term || !isFull(term)) throw new Error('ease-out is not a full term')
  const easeIn = /\bease-in\b(?!-out)|0\.42, 0, 1, 1/
  for (const v of controlCombinations(term.demo.controls)) {
    const code = Object.values(term.code(v)).join('\n')
    expect(easeIn.test(code), JSON.stringify(v)).toBe(v.compare === 'ease-in')
  }
})

// Spring's comparison twin runs on the house ease-out curve; that curve belongs only in its comparison branch.
test('spring names the ease-out curve only when comparing against it', () => {
  const term = terms.find((t) => t.slug === 'spring')
  if (!term || !isFull(term)) throw new Error('spring is not a full term')
  const easeOut = /0\.23, 1, 0\.32, 1|ease-out/
  for (const v of controlCombinations(term.demo.controls)) {
    const text = [...Object.values(term.code(v)), term.prompt(v), ...term.acceptance(v)].join('\n')
    expect(easeOut.test(text), JSON.stringify(v)).toBe(v.compare === 'ease-out')
  }
})

test('the 47 terms are spread across the seven categories in order', () => {
  const counts = Object.fromEntries(groupByCategory(terms).map((g) => [g.category.slug, g.terms.length]))
  expect(counts).toEqual({ scroll: 8, motion: 8, transitions: 7, gestures: 6, layout: 5, states: 7, visual: 6 })
  for (const group of groupByCategory(terms)) {
    expect(group.terms.map((t) => t.order)).toEqual(group.terms.map((_, i) => i + 1))
  }
})

test('the committed skills/moveset folder matches a fresh generation (run `npm run generate` and commit skills/)', () => {
  const dir = path.join(process.cwd(), 'skills/moveset')
  const onDisk = Object.fromEntries(
    readdirSync(dir, { recursive: true, withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => {
        const file = path.join(e.parentPath, e.name)
        return [path.relative(dir, file).split(path.sep).join('/'), readFileSync(file, 'utf8').replace(/\r\n/g, '\n')]
      }),
  )
  expect(onDisk).toEqual(renderSkill(terms))
})
