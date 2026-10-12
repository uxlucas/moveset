import { defineTerm, type Control, type ControlValues, type DemoProps } from './term-types'

const Demo = (_: DemoProps<any>) => null

const controls = [
  { id: 'offset', type: 'range', label: 'Offset', min: 0, max: 10, step: 1, default: 0 },
  { id: 'mode', type: 'select', label: 'Mode', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }], default: 'a' },
  { id: 'on', type: 'toggle', label: 'On', default: true },
] as const satisfies readonly Control[]

type V = ControlValues<typeof controls>
export const ok: V = { offset: 1, mode: 'b', on: false }
// @ts-expect-error mode only accepts declared option values
export const badMode: V = { offset: 1, mode: 'c', on: false }

defineTerm({ slug: 'x', name: 'X', category: 'scroll', order: 1, status: 'draft', definition: 'X.', demo: { component: Demo, label: 'x' } })

// @ts-expect-error review and published terms need description, prompt, acceptance, code, a11y, related, aliases
defineTerm({ slug: 'x', name: 'X', category: 'scroll', order: 1, status: 'published', definition: 'X.', demo: { component: Demo, label: 'x' } })

defineTerm({
  slug: 'x', name: 'X', category: 'scroll', order: 1, status: 'review', definition: 'X.',
  demo: { component: Demo, label: 'x', controls },
  aliases: [], description: 'd', useWhen: [], avoidWhen: [], a11y: 'a', related: [],
  prompt: (v) => `offset ${v.offset.toFixed(0)} mode ${v.mode}`,
  acceptance: (v) => [String(v.on)],
  code: () => ({ css: '' }),
})

defineTerm({
  slug: 'x', name: 'X', category: 'scroll', order: 1, status: 'review', definition: 'X.',
  demo: { component: Demo, label: 'x', controls },
  aliases: [], description: 'd', useWhen: [], avoidWhen: [], a11y: 'a', related: [],
  // @ts-expect-error prompt can only read declared controls
  prompt: (v) => `${v.missing}`,
  acceptance: () => [],
  code: () => ({}),
})

// @ts-expect-error category must be one of the seven
defineTerm({ slug: 'x', name: 'X', category: 'misc', order: 1, status: 'draft', definition: 'X.', demo: { component: Demo, label: 'x' } })

// @ts-expect-error demo needs a label
defineTerm({ slug: 'x', name: 'X', category: 'scroll', order: 1, status: 'draft', definition: 'X.', demo: { component: Demo } })

// @ts-expect-error unknown slug
defineTerm({ slug: 'x', name: 'X', category: 'scroll', order: 1, status: 'draft', definition: 'X.', demo: { component: Demo, label: 'x' }, confusedWith: [{ slug: 'not-a-term', difference: 'x' }] })

defineTerm({
  slug: 'x', name: 'X', category: 'scroll', order: 1, status: 'review', definition: 'X.',
  demo: { component: Demo, label: 'x', controls },
  aliases: [], description: 'd', useWhen: [], avoidWhen: [], a11y: 'a', related: ['sticky'],
  prompt: () => 'p',
  acceptance: () => [],
  code: () => ({}),
})
