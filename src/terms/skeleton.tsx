import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'skeleton',
  name: 'Skeleton',
  category: 'states',
  order: 1,
  status: 'draft',
  definition: 'Gray placeholder shapes that stand in for content while it loads, matching its layout.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
