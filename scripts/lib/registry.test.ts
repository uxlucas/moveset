import { describe, expect, test } from 'vitest'
import { assertSlugsMatch, renderRegistry, renderSlugs, slugFromFile, toTermData } from './registry'

describe('slugFromFile', () => {
  test('strips the extension', () => {
    expect(slugFromFile('scroll-snap.tsx')).toBe('scroll-snap')
  })
  test('rejects names that are not kebab-case', () => {
    expect(() => slugFromFile('ScrollSnap.tsx')).toThrow(/kebab-case/)
    expect(() => slugFromFile('scroll_snap.tsx')).toThrow(/kebab-case/)
  })
})

describe('renderSlugs', () => {
  test('emits a const tuple and a union type', () => {
    const src = renderSlugs(['a', 'b-c'])
    expect(src).toContain("export const SLUGS = ['a', 'b-c'] as const")
    expect(src).toContain('export type TermSlug = (typeof SLUGS)[number]')
  })
  test('handles no terms', () => {
    expect(renderSlugs([])).toContain('export const SLUGS = [] as const')
  })
})

describe('renderRegistry', () => {
  test('imports every term in order', () => {
    const src = renderRegistry(['a', 'b'])
    expect(src).toContain("import t0 from '@/terms/a'")
    expect(src).toContain("import t1 from '@/terms/b'")
    expect(src).toContain('export const terms: readonly Term[] = [t0, t1]')
  })
})

describe('toTermData', () => {
  test('keeps only serializable fields (no demo or glyph) and fills defaults', () => {
    const data = toTermData([
      {
        slug: 'a', name: 'A', category: 'scroll', order: 1, status: 'draft', definition: 'A.',
        demo: { component: () => null, label: 'x', glyph: () => null },
      },
    ] as never)
    expect(data).toEqual([
      {
        slug: 'a', name: 'A', category: 'scroll', order: 1, status: 'draft', definition: 'A.',
        aliases: [], confusedWith: [], sources: [],
      },
    ])
  })
})

describe('assertSlugsMatch', () => {
  test('throws when a file exports a different slug', () => {
    expect(() => assertSlugsMatch([{ slug: 'b' }] as never, ['a'])).toThrow(/a\.tsx exports slug "b"/)
  })
})
