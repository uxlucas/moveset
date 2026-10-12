import { describe, expect, test } from 'vitest'
import { defineTerm, type Term } from '../../src/lib/term-types'
import {
  confusedFor,
  publishedTerms,
  renderLlmsTxt,
  renderSkill,
  renderTermMarkdown,
  renderTermsJson,
  SKILL_DESCRIPTION_LIMIT,
  skillDescription,
} from './outputs'

const full = (slug: string, status: 'published' | 'review', extra: object = {}): Term => {
  const base = defineTerm({
    slug, name: slug.toUpperCase(), category: 'scroll', order: 1, status,
    definition: `${slug} definition.`,
    demo: { component: () => null, label: 'x', controls: [{ id: 'ms', type: 'range', label: 'Duration', min: 100, max: 300, step: 50, default: 200 }] },
    aliases: [`${slug} alias`], description: 'What it is.', useWhen: ['Here.'], avoidWhen: ['There.'],
    a11y: 'Be kind.', related: [],
    prompt: (v) => `Fade ${slug} over ${v.ms}ms with var(--ease-out).`,
    acceptance: (v) => [`Takes ${v.ms}ms.`],
    code: (v) => ({ css: `.a { transition: opacity ${v.ms}ms var(--ease-out); }` }),
  })
  return { ...base, ...extra } as Term
}

const terms: Term[] = [
  full('sticky', 'published', { order: 2, related: ['parallax', 'scroll-linked'], confusedWith: [{ slug: 'parallax', difference: 'P.' }] }),
  full('scroll-linked', 'published', { order: 1, confusedWith: [{ slug: 'sticky', difference: 'Linked vs pinned.' }] }),
  full('parallax', 'review', { order: 3 }),
  defineTerm({ slug: 'press-scale', name: 'Press Scale', category: 'gestures', order: 1, status: 'draft', definition: 'Draft.', demo: { component: () => null, label: 'x' } }),
  full('stagger', 'published', { category: 'motion', order: 1 }),
]

describe('publishedTerms', () => {
  test('keeps published only, in category then order', () => {
    expect(publishedTerms(terms).map((t) => t.slug)).toEqual(['scroll-linked', 'sticky', 'stagger'])
  })
})

describe('confusedFor', () => {
  test('lists pairs declared on either side', () => {
    expect(confusedFor({ slug: 'sticky' }, terms).map((c) => c.slug).sort()).toEqual(['parallax', 'scroll-linked'])
  })
})

describe('renderLlmsTxt', () => {
  const txt = renderLlmsTxt(terms)
  test('has a title, summary, categories in display order and a pointer to the JSON', () => {
    expect(txt.startsWith('# moveset\n\n> A visual dictionary')).toBe(true)
    expect(txt.indexOf('## Scroll')).toBeLessThan(txt.indexOf('## Motion & Easing'))
    expect(txt).toContain('- [SCROLL-LINKED](https://moveset.lucaslima.design/terms/scroll-linked.md): scroll-linked definition.')
    expect(txt).toContain('https://moveset.lucaslima.design/api/terms.json')
  })
  test('leaves out review and draft terms and empty categories', () => {
    expect(txt).not.toContain('PARALLAX')
    expect(txt).not.toContain('Press Scale')
    expect(txt).not.toContain('## Gestures')
  })
})

describe('renderTermMarkdown', () => {
  const md = renderTermMarkdown(publishedTerms(terms)[1], terms)
  test('renders at default values', () => {
    expect(md).toContain('Fade sticky over 200ms')
  })
  test('links only published terms, including confusions declared on the other side', () => {
    expect(md).toContain('[SCROLL-LINKED](https://moveset.lucaslima.design/terms/scroll-linked)')
    expect(md).toContain('STICKY vs SCROLL-LINKED')
    expect(md).not.toContain('PARALLAX')
  })
})

describe('renderTermsJson', () => {
  const json = renderTermsJson(terms)
  const sticky = json.terms.find((t) => t.slug === 'sticky')!
  test('holds exactly the published terms', () => {
    expect(json.site).toBe('https://moveset.lucaslima.design')
    expect(json.terms.map((t) => t.slug)).toEqual(['scroll-linked', 'sticky', 'stagger'])
  })
  test('renders prompt, acceptance and code at defaults, with controls', () => {
    expect(sticky.defaults).toEqual({ ms: 200 })
    expect(sticky.controls[0]).toMatchObject({ id: 'ms', type: 'range', default: 200 })
    expect(sticky.prompt).toBe('Fade sticky over 200ms with var(--ease-out).')
    expect(sticky.promptText).toMatch(/^# STICKY\n\nFade sticky over 200ms/)
    expect(sticky.promptText).toContain('- [ ] Takes 200ms.')
    expect(sticky.acceptance).toEqual(['Takes 200ms.'])
    expect(sticky.code.css).toContain('opacity 200ms')
    expect(sticky.url).toBe('https://moveset.lucaslima.design/terms/sticky')
    expect(sticky.markdownUrl).toBe('https://moveset.lucaslima.design/terms/sticky.md')
  })
  test('related and confusedWith point at published terms only', () => {
    expect(sticky.related).toEqual(['scroll-linked'])
    expect(sticky.confusedWith).toEqual([
      { slug: 'scroll-linked', difference: 'Linked vs pinned.', compare: 'https://moveset.lucaslima.design/compare/scroll-linked-vs-sticky' },
    ])
  })
  test('is plain JSON and reproducible', () => {
    expect(JSON.parse(JSON.stringify(json))).toEqual(json)
    expect(Object.keys(json)).toEqual(['site', 'terms'])
    expect(JSON.stringify(renderTermsJson(terms))).toBe(JSON.stringify(json))
  })
})

describe('renderSkill', () => {
  const files = renderSkill(terms)
  test('has SKILL.md and one reference file per published term', () => {
    expect(Object.keys(files).sort()).toEqual(['SKILL.md', 'terms/scroll-linked.md', 'terms/stagger.md', 'terms/sticky.md'])
    expect(files['terms/sticky.md']).toBe(renderTermMarkdown(publishedTerms(terms)[1], terms))
  })
  test('frontmatter names the skill and quotes a one-line description', () => {
    const [, name, description] = files['SKILL.md'].match(/^---\nname: (.+)\ndescription: (".+")\n---\n/) ?? []
    expect(name).toBe('moveset')
    expect(JSON.parse(description)).toContain('Use when someone describes an effect loosely')
  })
  test('glossary lists published terms with a pointer to their file, and the house tokens', () => {
    const main = files['SKILL.md']
    expect(main).toContain('- **STICKY**: sticky definition. Also called: sticky alias. Read `terms/sticky.md`.')
    expect(main).not.toContain('PARALLAX')
    expect(main).not.toContain('Press Scale')
    expect(main).toContain('--ease-out: cubic-bezier(0.23, 1, 0.32, 1);')
  })
  test('our copy has no em dashes', () => {
    const fixture = renderSkill([])
    expect(fixture['SKILL.md']).not.toContain('—')
  })
})

describe('skillDescription', () => {
  test('stays under the loader limit however many terms there are', () => {
    const many = Array.from({ length: 200 }, (_, i) => full(`term-number-${i}`, 'published'))
    const d = skillDescription(publishedTerms(many))
    expect(d.length).toBeLessThanOrEqual(SKILL_DESCRIPTION_LIMIT)
    expect(d).toMatch(/, and more\.$/)
  })
})
