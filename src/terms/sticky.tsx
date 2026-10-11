import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'sticky',
  name: 'Sticky',
  category: 'scroll',
  order: 4,
  status: 'draft',
  definition: 'An element scrolls with the page until it hits an edge, then stays pinned while the rest of its section scrolls underneath.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
