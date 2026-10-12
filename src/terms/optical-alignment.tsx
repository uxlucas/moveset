import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'optical-alignment',
  name: 'Optical Alignment',
  category: 'layout',
  order: 4,
  status: 'draft',
  definition: 'Positioning that looks centered to the eye, even when the measurements say otherwise.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
