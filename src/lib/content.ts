import { CATEGORIES, type Category } from './categories'
import type { TermStatus } from './term-data'
import type { Control, Values } from './term-types'

type Listable = {
  slug: string
  name: string
  category: string
  order: number
  status: TermStatus
  definition: string
  aliases?: readonly string[]
}

export function isVisible(
  term: { status: TermStatus },
  showReview: boolean = process.env.NEXT_PUBLIC_SHOW_REVIEW === '1',
): boolean {
  return term.status === 'published' || (showReview && term.status === 'review')
}

const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order

export function groupByCategory<T extends Listable>(terms: readonly T[]): { category: Category; terms: T[] }[] {
  return CATEGORIES.map((category) => ({
    category,
    terms: terms.filter((t) => t.category === category.slug).sort(byOrder),
  }))
}

export function neighbors<T extends Listable>(
  terms: readonly T[],
  slug: string,
  showReview?: boolean,
): { prev?: T; next?: T } {
  const current = terms.find((t) => t.slug === slug)
  if (!current) return {}
  const siblings = terms
    .filter((t) => t.category === current.category && (t.slug === slug || isVisible(t, showReview)))
    .sort(byOrder)
  const i = siblings.indexOf(current)
  return { prev: siblings[i - 1], next: siblings[i + 1] }
}

export function normalize(s: string): string {
  return s.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function matchesQuery(term: Listable, query: string): boolean {
  const q = normalize(query)
  if (!q) return true
  const haystack = normalize([term.name, term.definition, ...(term.aliases ?? [])].join(' '))
  return q.split(' ').every((word) => haystack.includes(word))
}

export type ConfusedPair = { a: string; b: string; difference: string }

export function compareSlug(a: string, b: string): string {
  const [x, y] = [a, b].sort()
  return `${x}-vs-${y}`
}

export function confusedPairs(
  terms: readonly { slug: string; confusedWith?: readonly { slug: string; difference: string }[] }[],
): ConfusedPair[] {
  const pairs = new Map<string, ConfusedPair>()
  for (const term of terms) {
    for (const c of term.confusedWith ?? []) {
      const [a, b] = [term.slug, c.slug].sort()
      const key = compareSlug(a, b)
      if (!pairs.has(key)) pairs.set(key, { a, b, difference: c.difference })
    }
  }
  return [...pairs.values()]
}

export function defaultValues(controls: readonly Control[] = []): Values {
  return Object.fromEntries(controls.map((c) => [c.id, c.default]))
}
