import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'rubber-banding',
  name: 'Rubber Banding',
  category: 'gestures',
  order: 4,
  status: 'draft',
  definition: 'Dragging past an edge meets growing resistance, then snaps back on release.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
