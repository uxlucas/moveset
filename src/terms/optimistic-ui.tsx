import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'optimistic-ui',
  name: 'Optimistic UI',
  category: 'states',
  order: 3,
  status: 'draft',
  definition: 'The interface shows the result of an action immediately and rolls back only if the server says it failed.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
