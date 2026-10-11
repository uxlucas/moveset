import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'enter-and-exit',
  name: 'Enter and Exit',
  category: 'transitions',
  order: 5,
  status: 'draft',
  definition: 'The animations an element plays when it is added to the screen and when it is removed.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
