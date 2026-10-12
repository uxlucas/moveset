'use client'

import Link from 'next/link'
import { DemoPlayer } from '@/components/demo/demo-player'
import { SoonPill } from '@/components/site/soon-pill'
import { isVisible } from '@/lib/content'
import type { TermData } from '@/lib/term-data'

export function TermCard({ term }: { term: TermData }) {
  const visible = isVisible(term)
  return (
    <article
      data-testid="term-card"
      data-slug={term.slug}
      className={`relative flex flex-col rounded-2xl ${
        visible
          ? 'bg-surface shadow-card transition-shadow duration-150 ease-[ease] hover:shadow-card-hover has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ink-faint'
          : 'bg-transparent outline-1 -outline-offset-1 outline-dashed outline-line'
      }`}
    >
      <div className={`h-52 p-3 ${visible ? '' : 'opacity-45'}`}>
        <DemoPlayer slug={term.slug} size="card" />
      </div>
      <div className={`px-5 pb-5 pt-2 ${visible ? '' : 'opacity-45'}`}>
        <h3 className="flex items-center gap-2 text-[15px] text-ink">
          {visible ? (
            <Link href={`/terms/${term.slug}`} className="outline-none after:absolute after:inset-0 after:rounded-2xl">
              {term.name}
            </Link>
          ) : (
            <>
              {term.name}
              <SoonPill />
            </>
          )}
        </h3>
        <p className="mt-1 text-sm leading-snug text-ink-muted">{term.definition}</p>
      </div>
    </article>
  )
}
