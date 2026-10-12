'use client'

import Link from 'next/link'
import { DemoPlayer } from '@/components/demo/demo-player'
import { getTerm } from '@/lib/terms'

export function CompareView({ a, b, difference }: { a: string; b: string; difference: string }) {
  const sides = [getTerm(a), getTerm(b)]
  return (
    <article>
      <h1 className="text-2xl font-medium tracking-[-0.015em]">{sides[0].name} vs {sides[1].name}</h1>
      <p className="mt-3 text-[17px] leading-relaxed text-ink">{difference}</p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {sides.map((t) => (
          <section key={t.slug} aria-labelledby={`cmp-${t.slug}`}>
            <div className="h-64 rounded-2xl bg-surface p-3 shadow-card">
              <DemoPlayer slug={t.slug} size="detail" />
            </div>
            <h2 id={`cmp-${t.slug}`} className="mt-4 text-[15px] font-medium">
              <Link href={`/terms/${t.slug}`} className="underline decoration-line-strong underline-offset-4 hover:decoration-ink">{t.name}</Link>
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t.definition}</p>
          </section>
        ))}
      </div>
    </article>
  )
}
