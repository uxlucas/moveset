import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'clip-path-reveal',
  name: 'Clip-path Reveal',
  category: 'transitions',
  order: 4,
  status: 'draft',
  definition: 'Content is uncovered by animating a clipping shape, like a wipe or an expanding circle.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
