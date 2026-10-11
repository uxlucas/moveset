import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'parallax',
  name: 'Parallax',
  category: 'scroll',
  order: 3,
  status: 'draft',
  definition: 'Layers move at different speeds while you scroll, which makes the page feel like it has depth.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
