import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'scroll-progress-indicator',
  name: 'Scroll Progress Indicator',
  category: 'scroll',
  order: 8,
  status: 'draft',
  definition: 'A bar or ring that fills as you move through the page, showing how much is left.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
