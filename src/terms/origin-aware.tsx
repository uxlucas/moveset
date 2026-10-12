import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'origin-aware',
  name: 'Origin-aware',
  category: 'motion',
  order: 8,
  status: 'draft',
  definition: 'An element grows out of the thing that triggered it, like a menu scaling from its button instead of its own center.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
