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
      className={`relative flex flex-col rounded-2xl bg-surface shadow-card transition-shadow duration-150 ease-[ease] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ink-faint ${visible ? 'hover:shadow-card-hover' : ''}`}
    >
      <div className="h-52 p-3">
        <DemoPlayer slug={term.slug} size="card" />
      </div>
      <div className="px-5 pb-5 pt-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className={`text-[15px] ${visible ? 'text-ink' : 'text-ink-faint'}`}>
            {visible ? (
              <Link href={`/terms/${term.slug}`} className="outline-none after:absolute after:inset-0 after:rounded-2xl">
                {term.name}
              </Link>
            ) : (
              term.name
            )}
          </h3>
          {!visible && <SoonPill />}
        </div>
        <p className={`mt-1 text-sm leading-snug ${visible ? 'text-ink-muted' : 'text-ink-faint'}`}>{term.definition}</p>
      </div>
    </article>
  )
}
