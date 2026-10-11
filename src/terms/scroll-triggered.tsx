import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'scroll-triggered',
  name: 'Scroll-triggered',
  category: 'scroll',
  order: 1,
  status: 'draft',
  definition: 'An animation that plays once when an element scrolls into view.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
