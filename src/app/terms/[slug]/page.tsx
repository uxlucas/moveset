import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EntryView } from '@/components/entry/entry-view'
import data from '@/generated/terms-data.json'
import { isVisible } from '@/lib/content'
import type { TermData } from '@/lib/term-data'

const terms = data as TermData[]
type Params = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return terms.filter((t) => isVisible(t)).map((t) => ({ slug: t.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const term = terms.find((t) => t.slug === slug)
  return term ? { title: term.name, description: term.definition } : {}
}

export default async function TermPage({ params }: Params) {
  const { slug } = await params
  const term = terms.find((t) => t.slug === slug)
  if (!term || !isVisible(term)) notFound()
  return <EntryView slug={slug} />
}
