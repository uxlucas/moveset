import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'press-scale',
  name: 'Press Scale',
  category: 'gestures',
  order: 1,
  status: 'draft',
  definition: 'A button shrinks slightly while pressed, so the click feels physical.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
