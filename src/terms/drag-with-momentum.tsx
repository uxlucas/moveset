import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'drag-with-momentum',
  name: 'Drag with Momentum',
  category: 'gestures',
  order: 2,
  status: 'draft',
  definition: 'A dragged element keeps moving after release, slowing down based on how fast it was thrown.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
