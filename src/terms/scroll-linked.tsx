import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'scroll-linked',
  name: 'Scroll-linked',
  category: 'scroll',
  order: 2,
  status: 'draft',
  definition: 'An animation whose progress is tied directly to the scroll position, moving forward and backward as you scroll.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
