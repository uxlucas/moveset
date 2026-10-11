import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'scroll-snap',
  name: 'Scroll Snap',
  category: 'scroll',
  order: 5,
  status: 'draft',
  definition: 'Scrolling comes to rest exactly on an item instead of stopping anywhere in between.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
