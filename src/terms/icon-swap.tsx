import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'icon-swap',
  name: 'Icon Swap',
  category: 'transitions',
  order: 7,
  status: 'draft',
  definition: 'One icon turns into another in place with a quick scale, fade and blur, like copy becoming a check.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
