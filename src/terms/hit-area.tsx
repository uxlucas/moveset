import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'hit-area',
  name: 'Hit Area',
  category: 'layout',
  order: 3,
  status: 'draft',
  definition: 'The clickable region of an element, which can be larger than what you see.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
