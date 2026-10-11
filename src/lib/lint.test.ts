import { describe, expect, test } from 'vitest'
import type { TermSlug } from '@/generated/slugs'
import { lintTerms, parseFrontmatter, type LintConfig, type Review } from './lint'
import { defineTerm, type Term } from './term-types'

const config: LintConfig = { allowLayoutProps: [], allowEaseIn: [] }

const base = defineTerm({
  slug: 'demo', name: 'Demo', category: 'scroll', order: 1, status: 'review',
  definition: 'A short, clear definition.',
  demo: { component: () => null, label: 'A demo.' },
  aliases: ['demo alias'], description: 'Plain description.', useWhen: ['Often.'], avoidWhen: ['Rarely.'],
  a11y: 'Note.', related: [],
  prompt: () => 'Build it.',
  acceptance: () => ['It works.'],
  code: () => ({ css: '.a { opacity: 1; }' }),
})

function term(over: Record<string, unknown> = {}): Term {
  return { ...base, ...over } as Term
}
function rules(terms: Term[], reviews: Review[] = [], cfg = config) {
  return lintTerms(terms, reviews, cfg).map((i) => i.rule)
}
const css = (src: string) => ({ code: () => ({ css: src }) })

describe('definitions', () => {
  test('a clean term passes', () => expect(rules([term()])).toEqual([]))
  test('must end with a period', () => expect(rules([term({ definition: 'No period' })])).toContain('definition-sentence'))
  test('must be one sentence', () => expect(rules([term({ definition: 'One. Two.' })])).toContain('definition-sentence'))
  test('must be at most 140 characters', () => {
    expect(rules([term({ definition: `${'a'.repeat(140)}.` })])).toContain('definition-length')
  })
})

describe('uniqueness', () => {
  test('aliases are unique across terms, ignoring case', () => {
    expect(rules([term(), term({ slug: 'other', order: 2, aliases: ['Demo Alias'] })])).toContain('alias-duplicate')
  })
  test('order is unique within a category but may repeat across categories', () => {
    expect(rules([term(), term({ slug: 'other', aliases: [] })])).toContain('order-duplicate')
    expect(rules([term(), term({ slug: 'other', aliases: [], category: 'motion' })])).toEqual([])
  })
  test('a term cannot be confused with itself', () => {
    expect(rules([term({ confusedWith: [{ slug: 'demo' as TermSlug, difference: 'D.' }] })])).toContain('confused-self')
  })
})

describe('blocked words', () => {
  test('flags blocked words in prose', () => expect(rules([term({ description: 'A seamless effect.' })])).toContain('blocked-word'))
  test('does not flag longer words that contain them', () => expect(rules([term({ description: 'An elevated card.' })])).toEqual([]))
})

describe('code rules', () => {
  test('ease-in is flagged, ease-in-out is not', () => {
    expect(rules([term(css('.a { transition: opacity 200ms ease-in; } @media (prefers-reduced-motion: reduce) {}'))])).toContain('code-ease-in')
    expect(rules([term(css('.a { transition: opacity 200ms ease-in-out; } @media (prefers-reduced-motion: reduce) {}'))])).toEqual([])
  })
  test('Motion easeIn is flagged, easeInOut is not', () => {
    expect(rules([term({ code: () => ({ motion: 'useReducedMotion(); animate(el, { opacity: 1 }, { ease: "easeIn" })' }) })])).toContain('code-ease-in')
    expect(rules([term({ code: () => ({ motion: 'useReducedMotion(); animate(el, { opacity: 1 }, { ease: "easeInOut" })' }) })])).toEqual([])
  })
  test('allowEaseIn exempts a term', () => {
    expect(rules([term(css('.a { transition: opacity 1s ease-in; } @media (prefers-reduced-motion: reduce) {}'))], [], { ...config, allowEaseIn: ['demo'] })).toEqual([])
  })
  test('transition: all and transition-all are flagged', () => {
    expect(rules([term(css('.a { transition: all 200ms; } @media (prefers-reduced-motion: reduce) {}'))])).toContain('code-transition-all')
    expect(rules([term(css('<div className="transition-all" /> prefers-reduced-motion'))])).toContain('code-transition-all')
  })
  test('scale(0) and scale: 0 are flagged, 0.95 is not', () => {
    expect(rules([term(css('.a { transform: scale(0); }'))])).toContain('code-scale-zero')
    expect(rules([term({ code: () => ({ motion: 'initial={{ scale: 0 }}' }) })])).toContain('code-scale-zero')
    expect(rules([term(css('.a { transform: scale(0.95); }'))])).toEqual([])
    expect(rules([term({ code: () => ({ motion: 'initial={{ scale: 0.96 }}' }) })])).toEqual([])
  })
  test('animated layout properties are flagged unless exempted', () => {
    const src = css('.a { transition: height 200ms; } @media (prefers-reduced-motion: reduce) {}')
    expect(rules([term(src)])).toContain('code-layout-prop')
    expect(rules([term(src)], [], { ...config, allowLayoutProps: ['demo'] })).toEqual([])
    expect(rules([term(css('.a { transition: transform 200ms; } @media (prefers-reduced-motion: reduce) {}'))])).toEqual([])
  })
  test('motion code needs a reduced-motion path', () => {
    expect(rules([term(css('.a { transition: opacity 200ms; }'))])).toContain('code-reduced-motion')
    expect(rules([term(css('.a { font-variant-numeric: tabular-nums; }'))])).toEqual([])
  })
  test('layout keys are flagged in js, motion and gsap snippets', () => {
    const reduced = ' useReducedMotion();'
    for (const [approach, src] of [
      ['gsap', "gsap.to(el, { height: 'auto' })"],
      ['js', 'animate(el, { width: 100 })'],
      ['motion', 'initial={{ height: 0 }} exit={{ height: 0 }}'],
      ['motion', 'animate={{ maxHeight: 200, marginLeft: 4 }}'],
      ['motion', 'animate={{ right: 0 }}'],
      ['motion', 'animate={{ bottom: 0 }}'],
    ] as const) {
      expect(rules([term({ code: () => ({ [approach]: src + reduced }) })]), src).toContain('code-layout-prop')
    }
    expect(rules([term({ code: () => ({ gsap: "gsap.to(el, { height: 'auto' }) // useReducedMotion" }) })], [], { ...config, allowLayoutProps: ['demo'] })).toEqual([])
    expect(rules([term({ code: () => ({ motion: 'useReducedMotion(); animate(el, { x: 10, opacity: 1 })' }) })])).toEqual([])
  })
  test('plain css layout declarations are not flagged', () => {
    expect(rules([term(css('.a { position: sticky; top: 8px; scroll-padding-top: 16px; }'))])).toEqual([])
  })
  test('layout properties inside @keyframes are flagged', () => {
    const kf = '@keyframes grow { from { opacity: 0; } to { opacity: 1; height: 100px; } } @media (prefers-reduced-motion: reduce) {}'
    expect(rules([term(css(kf))])).toContain('code-layout-prop')
    expect(rules([term(css('@keyframes a { 0% { margin-left: 0; } } @media (prefers-reduced-motion: reduce) {}'))])).toContain('code-layout-prop')
    expect(rules([term(css('@keyframes fade { from { opacity: 0; } to { opacity: 1; } } .a { top: 4px; } @media (prefers-reduced-motion: reduce) {}'))])).toEqual([])
  })
  test('quoted and listed transition all is flagged, small is not', () => {
    expect(rules([term({ code: () => ({ js: "el.style.transition = 'x'; const s = { transition: 'all 200ms' } // prefers-reduced-motion" }) })])).toContain('code-transition-all')
    expect(rules([term(css('.a { transition: opacity 1s, all 2s; } @media (prefers-reduced-motion: reduce) {}'))])).toContain('code-transition-all')
    expect(rules([term(css('.a { transition: opacity 1s, small-caps 2s; } @media (prefers-reduced-motion: reduce) {}'))])).not.toContain('code-transition-all')
  })
  test('scale3d, multi-argument and axis scale from zero are flagged', () => {
    expect(rules([term(css('.a { transform: scale3d(0, 0, 0); }'))])).toContain('code-scale-zero')
    expect(rules([term(css('.a { transform: scale(0, 0); }'))])).toContain('code-scale-zero')
    expect(rules([term(css('.a { transform: scaleX(0); }'))])).toContain('code-scale-zero')
    expect(rules([term(css('.a { transform: scale3d(0.95, 0.95, 1); }'))])).not.toContain('code-scale-zero')
  })
  test('more motion needs a reduced-motion path', () => {
    expect(rules([term(css('html { scroll-behavior: smooth; }'))])).toContain('code-reduced-motion')
    expect(rules([term({ code: () => ({ motion: 'const [scope, run] = useAnimate()' }) })])).toContain('code-reduced-motion')
    expect(rules([term({ code: () => ({ motion: '<motion.div animate={{ opacity: 1 }} />' }) })])).toContain('code-reduced-motion')
    expect(rules([term({ code: () => ({ motion: 'const D = motion.div' }) })])).toContain('code-reduced-motion')
    expect(rules([term({ code: () => ({ motion: '<div className="animate-spin" />' }) })])).toContain('code-reduced-motion')
    expect(rules([term({ code: () => ({ motion: '<div className="animate-pulse" />' }) })])).toContain('code-reduced-motion')
  })
  test('MotionConfig reducedMotion counts as a reduced-motion path', () => {
    const src = '<MotionConfig reducedMotion="user"><motion.div animate={{ opacity: 1 }} /></MotionConfig>'
    expect(rules([term({ code: () => ({ motion: src }) })])).toEqual([])
  })
  test('drafts skip code rules', () => {
    const draft = defineTerm({ slug: 'demo', name: 'Demo', category: 'scroll', order: 1, status: 'draft', definition: 'A draft.', demo: { component: () => null, label: 'x' } })
    expect(rules([draft])).toEqual([])
  })
})

describe('publish gate', () => {
  test('published needs a passing, approved review', () => {
    const published = term({ status: 'published' })
    expect(rules([published])).toContain('publish-gate')
    expect(rules([published], [{ slug: 'demo', verdict: 'pass', approved: false }])).toContain('publish-gate')
    expect(rules([published], [{ slug: 'demo', verdict: 'pass', approved: true }])).toEqual([])
  })
  test('review status is not gated', () => expect(rules([term()])).toEqual([]))
})

describe('parseFrontmatter', () => {
  test('reads strings and booleans with LF or CRLF', () => {
    expect(parseFrontmatter('---\nverdict: pass\napproved: true\n---\nbody')).toEqual({ verdict: 'pass', approved: true })
    expect(parseFrontmatter('---\r\nverdict: "pass"\r\napproved: false\r\n---\r\n')).toEqual({ verdict: 'pass', approved: false })
  })
  test('returns an empty object without frontmatter', () => expect(parseFrontmatter('# hi')).toEqual({}))
})
