import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'ease-in-out',
  name: 'Ease-in-out',
  category: 'motion',
  order: 2,
  status: 'draft',
  definition: 'Motion that speeds up and then slows down, for elements already on screen moving from one spot to another.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
