import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'tabular-numbers',
  name: 'Tabular Numbers',
  category: 'visual',
  order: 3,
  status: 'draft',
  definition: 'Digits that all share the same width, so changing numbers do not shift sideways.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
