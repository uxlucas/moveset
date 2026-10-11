import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'layout-shift',
  name: 'Layout Shift',
  category: 'layout',
  order: 1,
  status: 'draft',
  definition: 'Content jumps out of place when something above it loads or changes size.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
