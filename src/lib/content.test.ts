import { describe, expect, test } from 'vitest'
import {
  compareSlug, confusedPairs, defaultValues, groupByCategory, isVisible, matchesQuery, neighbors, normalize, visibleConfusedPairs,
} from './content'
import type { TermData } from './term-data'

function t(over: Partial<TermData> & Pick<TermData, 'slug'>): TermData {
  return {
    name: over.slug, category: 'scroll', order: 1, status: 'published', definition: 'A thing.',
    aliases: [], confusedWith: [], sources: [], ...over,
  }
}

describe('isVisible', () => {
  test('published is always visible, drafts never', () => {
    expect(isVisible({ status: 'published' }, false)).toBe(true)
    expect(isVisible({ status: 'draft' }, true)).toBe(false)
  })
  test('review is visible only when review mode is on', () => {
    expect(isVisible({ status: 'review' }, true)).toBe(true)
    expect(isVisible({ status: 'review' }, false)).toBe(false)
  })
})

describe('groupByCategory', () => {
  test('returns all seven categories in display order, terms sorted by order', () => {
    const groups = groupByCategory([t({ slug: 'b', order: 2 }), t({ slug: 'a', order: 1 }), t({ slug: 'm', category: 'motion' })])
    expect(groups.map((g) => g.category.slug)).toEqual(['scroll', 'motion', 'transitions', 'gestures', 'layout', 'states', 'visual'])
    expect(groups[0].terms.map((x) => x.slug)).toEqual(['a', 'b'])
    expect(groups[1].terms.map((x) => x.slug)).toEqual(['m'])
  })
})

describe('neighbors', () => {
  const list = [
    t({ slug: 'one', order: 1 }),
    t({ slug: 'two', order: 2, status: 'draft' }),
    t({ slug: 'three', order: 3 }),
    t({ slug: 'other', order: 4, category: 'motion' }),
  ]
  test('skips drafts and stays inside the category', () => {
    expect(neighbors(list, 'one', false)).toEqual({ prev: undefined, next: list[2] })
    expect(neighbors(list, 'three', false)).toEqual({ prev: list[0], next: undefined })
  })
  test('a review term in review mode keeps its published neighbour and skips its draft one', () => {
    const rev = [
      t({ slug: 'pub', order: 1 }),
      t({ slug: 'mid', order: 2, status: 'review' }),
      t({ slug: 'drf', order: 3, status: 'draft' }),
    ]
    expect(neighbors(rev, 'mid', true)).toEqual({ prev: rev[0], next: undefined })
  })
  test('unknown slug has no neighbors', () => {
    expect(neighbors(list, 'nope', false)).toEqual({})
  })
})

describe('search', () => {
  const term = t({ slug: 'scroll-linked', name: 'Scroll-linked', definition: 'Progress tied to scroll.', aliases: ['header that stays'] })
  test('normalize lowercases and turns hyphens into spaces', () => {
    expect(normalize('  Scroll-Linked  ')).toBe('scroll linked')
  })
  test.each(['scroll-linked', '  Scroll Linked ', 'SCROLL linked', 'linked scroll', 'header stays', ''])(
    'matches "%s"', (q) => expect(matchesQuery(term, q)).toBe(true),
  )
  test('does not match unrelated words', () => {
    expect(matchesQuery(term, 'parallax')).toBe(false)
  })
})

describe('confusedPairs', () => {
  test('merges both directions into one pair with a stable slug', () => {
    const pairs = confusedPairs([
      t({ slug: 'sticky', confusedWith: [{ slug: 'parallax', difference: 'D1' }] }),
      t({ slug: 'parallax', confusedWith: [{ slug: 'sticky', difference: 'D2' }] }),
    ])
    expect(pairs).toEqual([{ a: 'parallax', b: 'sticky', difference: 'D1' }])
    expect(compareSlug('sticky', 'parallax')).toBe('parallax-vs-sticky')
  })
})

describe('defaultValues', () => {
  test('maps control ids to defaults', () => {
    expect(defaultValues([
      { id: 'a', type: 'range', label: 'A', min: 0, max: 1, step: 1, default: 1 },
      { id: 'b', type: 'toggle', label: 'B', default: false },
    ])).toEqual({ a: 1, b: false })
    expect(defaultValues()).toEqual({})
  })
})

describe('visibleConfusedPairs', () => {
  const link = (slug: string, status: TermData['status'], other: string) =>
    t({ slug, status, confusedWith: [{ slug: other, difference: 'Differs.' }] })
  test('returns a pair whose sides are both published', () => {
    const list = [link('a', 'published', 'b'), t({ slug: 'b' })]
    expect(visibleConfusedPairs(list, false)).toEqual([{ a: 'a', b: 'b', difference: 'Differs.' }])
  })
  test('drops a pair with a draft side', () => {
    const list = [link('a', 'published', 'b'), t({ slug: 'b', status: 'draft' })]
    expect(visibleConfusedPairs(list, true)).toEqual([])
  })
  test('counts a review side only in review mode', () => {
    const list = [link('a', 'published', 'b'), t({ slug: 'b', status: 'review' })]
    expect(visibleConfusedPairs(list, false)).toEqual([])
    expect(visibleConfusedPairs(list, true)).toHaveLength(1)
  })
})
