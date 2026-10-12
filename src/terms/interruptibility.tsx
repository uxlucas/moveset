import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'interruptibility',
  name: 'Interruptibility',
  category: 'motion',
  order: 7,
  status: 'draft',
  definition: 'An animation that can change direction mid-flight from wherever it is, instead of finishing or restarting first.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
