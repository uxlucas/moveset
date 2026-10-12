import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'nested-border-radius',
  name: 'Nested Border Radius',
  category: 'layout',
  order: 2,
  status: 'draft',
  definition: 'The inner radius equals the outer radius minus the padding, so nested corners look parallel.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
