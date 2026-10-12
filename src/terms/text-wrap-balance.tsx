import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'text-wrap-balance',
  name: 'Text Wrap Balance',
  category: 'visual',
  order: 2,
  status: 'draft',
  definition: 'Line breaks that even out line lengths in a heading, so the last line is not a single orphaned word.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
