import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: 'letter-spacing',
  name: 'Letter Spacing',
  category: 'visual',
  order: 1,
  status: 'draft',
  definition: 'Tightening the space between letters in large text and loosening it in small text, so both read comfortably.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
