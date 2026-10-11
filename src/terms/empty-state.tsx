import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'empty-state',
  name: 'Empty State',
  category: 'states',
  order: 4,
  status: 'draft',
  definition: 'What a screen shows when there is nothing to display yet, ideally with a clear next step.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
