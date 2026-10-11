import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'container-query',
  name: 'Container Query',
  category: 'layout',
  order: 5,
  status: 'draft',
  definition: 'A component adapts its layout to the size of its container instead of the size of the screen.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
