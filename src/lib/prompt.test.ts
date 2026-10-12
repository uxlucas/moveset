import { describe, expect, test } from 'vitest'
import { buildMarkdown, buildPromptText, usedTokens } from './prompt'
import { defineTerm, type FullTerm } from './term-types'

const term = defineTerm({
  slug: 'demo', name: 'Demo', category: 'scroll', order: 1, status: 'review',
  definition: 'A demo term.',
  demo: { component: () => null, label: 'x', controls: [{ id: 'ms', type: 'range', label: 'Duration', min: 100, max: 300, step: 50, default: 200 }] },
  aliases: ['sample', 'example'], description: 'What it is.', useWhen: ['Here.'], avoidWhen: ['There.'],
  a11y: 'Be kind.', related: [],
  prompt: (v) => `Fade it in over ${v.ms}ms with var(--ease-out).`,
  acceptance: (v) => [`Takes ${v.ms}ms.`, 'No jump.'],
  code: (v) => ({ css: `.a { transition: opacity ${v.ms}ms var(--ease-out); }` }),
}) as FullTerm

describe('usedTokens', () => {
  test('lists only tokens the text mentions', () => {
    expect(usedTokens('var(--ease-out)')).toEqual([['--ease-out', 'cubic-bezier(0.23, 1, 0.32, 1)']])
    expect(usedTokens('nothing here')).toEqual([])
  })
})

describe('buildPromptText', () => {
  const text = buildPromptText(term, { ms: 250 })
  test('uses the current control values', () => {
    expect(text).toContain('Fade it in over 250ms')
    expect(text).toContain('- [ ] Takes 250ms.')
  })
  test('is self-contained: title, checklist, token values, link', () => {
    expect(text.startsWith('# Demo\n')).toBe(true)
    expect(text).toContain('## Acceptance checklist')
    expect(text).toContain('`--ease-out`: `cubic-bezier(0.23, 1, 0.32, 1)`')
    expect(text).toContain('Reference: https://moveset.lucaslima.design/terms/demo')
  })
})

describe('buildMarkdown', () => {
  test('contains every section of the entry', () => {
    const md = buildMarkdown(term, { ms: 200 }, (slug) => ({ name: slug, visible: true }))
    for (const part of ['# Demo', 'Also called: sample, example', '> A demo term.', 'What it is.', '## Use when', '- Here.', '## Avoid when', '## Prompt', '## Code', '### CSS', '```css', '## Accessibility', 'Be kind.']) {
      expect(md).toContain(part)
    }
  })
})

describe('buildMarkdown links', () => {
  const linked = defineTerm({
    ...term,
    related: ['sticky', 'parallax'],
    confusedWith: [
      { slug: 'scroll-linked', difference: 'Tied to scroll position.' },
      { slug: 'parallax', difference: 'Layers move at different speeds.' },
    ],
  } as never) as FullTerm
  const resolve = (slug: string) => ({ name: slug.toUpperCase(), visible: slug !== 'parallax' })
  const md = buildMarkdown(linked, { ms: 200 }, resolve)

  test('lists only visible related terms', () => {
    expect(md).toContain('- [STICKY](https://moveset.lucaslima.design/terms/sticky)')
    expect(md).not.toContain('PARALLAX')
    expect(md).not.toContain('/terms/parallax')
  })
  test('often confused with links the compare page, and only for visible sides', () => {
    expect(md).toContain('- [Demo vs SCROLL-LINKED](https://moveset.lucaslima.design/compare/demo-vs-scroll-linked): Tied to scroll position.')
    expect(md).not.toContain('compare/demo-vs-parallax')
    expect(md).not.toContain('Layers move')
  })
  test('omits a section when nothing visible remains', () => {
    const none = buildMarkdown(linked, { ms: 200 }, () => ({ name: 'x', visible: false }))
    expect(none).not.toContain('## Related')
    expect(none).not.toContain('## Often confused with')
  })
  test('omits Code when no approach has code', () => {
    const bare = defineTerm({ ...term, code: () => ({}) } as never) as FullTerm
    expect(buildMarkdown(bare, { ms: 200 }, resolve)).not.toContain('## Code')
  })
})
