import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'hover-intent',
  name: 'Hover Intent',
  category: 'gestures',
  order: 5,
  status: 'draft',
  definition: 'A short delay that waits for the pointer to settle before opening a menu or tooltip, so passing over it does nothing.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
