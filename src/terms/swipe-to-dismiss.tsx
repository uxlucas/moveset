import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'swipe-to-dismiss',
  name: 'Swipe to Dismiss',
  category: 'gestures',
  order: 3,
  status: 'draft',
  definition: 'Dragging an element off screen closes it, and a quick flick counts as much as a long drag.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
