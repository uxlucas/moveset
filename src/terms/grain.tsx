import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'grain',
  name: 'Grain',
  category: 'visual',
  order: 6,
  status: 'draft',
  definition: 'A subtle noise texture over a surface that adds warmth and hides gradient banding.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
