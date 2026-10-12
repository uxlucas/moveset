import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'overshoot',
  name: 'Overshoot',
  category: 'motion',
  order: 6,
  status: 'draft',
  definition: 'Motion that travels slightly past its target before settling back, giving a small sense of energy.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
