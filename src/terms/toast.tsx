import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'toast',
  name: 'Toast',
  category: 'states',
  order: 6,
  status: 'draft',
  definition: 'A brief message that slides in at the edge of the screen and leaves on its own.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
