import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'shared-layout',
  name: 'Shared Layout',
  category: 'transitions',
  order: 2,
  status: 'draft',
  definition: 'One element travels and reshapes between two positions, instead of one copy disappearing and another appearing.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
