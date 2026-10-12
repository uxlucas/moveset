import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'error-shake',
  name: 'Error Shake',
  category: 'states',
  order: 7,
  status: 'draft',
  definition: 'A quick side-to-side shake that signals an input was rejected.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
