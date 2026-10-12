import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'ease-out',
  name: 'Ease-out',
  category: 'motion',
  order: 1,
  status: 'draft',
  definition: 'Motion that starts fast and slows into place, the default for anything responding to the user.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
