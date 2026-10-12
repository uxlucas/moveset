import type { CategorySlug } from './categories'

export type TermStatus = 'draft' | 'review' | 'published'

// The serializable part of a term. Server components read this, never the term files.
export type TermData = {
  slug: string
  name: string
  category: CategorySlug
  order: number
  status: TermStatus
  definition: string
  aliases: string[]
  confusedWith: { slug: string; difference: string }[]
  sources: { label: string; url: string }[]
}
