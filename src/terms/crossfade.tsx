import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'crossfade',
  name: 'Crossfade',
  category: 'transitions',
  order: 1,
  status: 'draft',
  definition: 'One element fades out while another fades in, in the same spot.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
