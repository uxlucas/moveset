import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'spring',
  name: 'Spring',
  category: 'motion',
  order: 3,
  status: 'draft',
  definition: 'Motion driven by physics instead of a fixed duration, so it can carry velocity and settle naturally.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
