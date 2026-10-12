import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'long-press',
  name: 'Long Press',
  category: 'gestures',
  order: 6,
  status: 'draft',
  definition: 'Holding a press for a moment triggers a secondary action, usually with feedback that fills while you hold.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
