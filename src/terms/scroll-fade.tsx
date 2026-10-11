import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'scroll-fade',
  name: 'Scroll Fade',
  category: 'scroll',
  order: 7,
  status: 'draft',
  definition: 'A soft fade on the edge of a scroll area that still has more content, hinting there is more to see.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
