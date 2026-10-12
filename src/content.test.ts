import { expect, test } from 'vitest'
import { terms } from '@/generated/registry'
import { groupByCategory } from '@/lib/content'
import { lintTerms } from '@/lib/lint'
import { loadReviews } from '@/lib/reviews'
import config from '../content-lint.config'

test('every term passes the content lint', () => {
  expect(lintTerms(terms, loadReviews('reviews'), config)).toEqual([])
})

test('the 47 terms are spread across the seven categories in order', () => {
  const counts = Object.fromEntries(groupByCategory(terms).map((g) => [g.category.slug, g.terms.length]))
  expect(counts).toEqual({ scroll: 8, motion: 8, transitions: 7, gestures: 6, layout: 5, states: 7, visual: 6 })
  for (const group of groupByCategory(terms)) {
    expect(group.terms.map((t) => t.order)).toEqual(group.terms.map((_, i) => i + 1))
  }
})
