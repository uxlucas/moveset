import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'shimmer',
  name: 'Shimmer',
  category: 'states',
  order: 2,
  status: 'draft',
  definition: 'A soft band of light that sweeps across a placeholder or text to show something is still working.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
