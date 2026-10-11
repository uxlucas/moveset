import { terms } from '@/generated/registry'
import type { Term } from './term-types'

export { terms }

export function getTerm(slug: string): Term {
  const term = terms.find((t) => t.slug === slug)
  if (!term) throw new Error(`Unknown term "${slug}"`)
  return term
}
