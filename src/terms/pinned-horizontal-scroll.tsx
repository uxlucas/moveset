import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'pinned-horizontal-scroll',
  name: 'Pinned Horizontal Scroll',
  category: 'scroll',
  order: 6,
  status: 'draft',
  definition: 'A section pins in place while vertical scrolling moves its content sideways.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
