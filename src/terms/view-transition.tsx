import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'view-transition',
  name: 'View Transition',
  category: 'transitions',
  order: 3,
  status: 'draft',
  definition: 'The browser animates between two states or pages, connecting the elements they share.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
