import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'squircle',
  name: 'Squircle',
  category: 'visual',
  order: 5,
  status: 'draft',
  definition: 'A rounded shape whose corners curve continuously into the sides, smoother than a regular border radius.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
