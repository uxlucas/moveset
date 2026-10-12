import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CompareView } from '@/components/entry/compare-view'
import data from '@/generated/terms-data.json'
import { compareSlug, confusedPairs, isVisible } from '@/lib/content'
import type { TermData } from '@/lib/term-data'

const terms = data as TermData[]
type Params = { params: Promise<{ pair: string }> }

function visiblePairs() {
  const visible = (slug: string) => {
    const t = terms.find((x) => x.slug === slug)
    return Boolean(t && isVisible(t))
  }
  return confusedPairs(terms).filter((p) => visible(p.a) && visible(p.b))
}

const findPair = (key: string) => visiblePairs().find((p) => compareSlug(p.a, p.b) === key)
const nameOf = (slug: string) => terms.find((t) => t.slug === slug)?.name ?? slug

export const dynamicParams = false

export function generateStaticParams() {
  return visiblePairs().map((p) => ({ pair: compareSlug(p.a, p.b) }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const pair = findPair((await params).pair)
  return pair ? { title: `${nameOf(pair.a)} vs ${nameOf(pair.b)}`, description: pair.difference } : {}
}

export default async function ComparePage({ params }: Params) {
  const pair = findPair((await params).pair)
  if (!pair) notFound()
  return <CompareView a={pair.a} b={pair.b} difference={pair.difference} />
}
