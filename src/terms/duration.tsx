import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'duration',
  name: 'Duration',
  category: 'motion',
  order: 5,
  status: 'draft',
  definition: 'How long an animation takes, which decides whether it feels instant, smooth or slow.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
