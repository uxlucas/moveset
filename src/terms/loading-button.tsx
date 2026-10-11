import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'loading-button',
  name: 'Loading Button',
  category: 'states',
  order: 5,
  status: 'draft',
  definition: 'A button that shows progress in place of its label without changing width.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
