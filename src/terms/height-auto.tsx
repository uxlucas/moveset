import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'height-auto',
  name: 'Height Auto',
  category: 'transitions',
  order: 6,
  status: 'draft',
  definition: 'A section smoothly expands and collapses to fit its content instead of jumping open.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
