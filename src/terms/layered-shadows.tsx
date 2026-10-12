import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'layered-shadows',
  name: 'Layered Shadows',
  category: 'visual',
  order: 4,
  status: 'draft',
  definition: 'Several soft shadows stacked together, so depth looks natural instead of like one flat blur.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
