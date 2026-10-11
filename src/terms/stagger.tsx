import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'stagger',
  name: 'Stagger',
  category: 'motion',
  order: 4,
  status: 'draft',
  definition: 'Several items animate one after another with a small delay between each, creating a cascade.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
