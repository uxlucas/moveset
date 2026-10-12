'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CopyButton } from '@/components/copy-button'
import { DemoControls } from '@/components/demo/demo-controls'
import { DemoPlayer } from '@/components/demo/demo-player'
import { CategoryIcon } from '@/components/site/category-icon'
import { SoonPill } from '@/components/site/soon-pill'
import { getCategory } from '@/lib/categories'
import { compareSlug, confusedPairs, defaultValues, isVisible, neighbors } from '@/lib/content'
import { buildMarkdown, buildPromptText } from '@/lib/prompt'
import { isFull, type FullTerm, type Values } from '@/lib/term-types'
import { getTerm, terms } from '@/lib/terms'
import { CodeTabs } from './code-tabs'

const resolve = (slug: string) => {
  const t = getTerm(slug)
  return { name: t.name, visible: isVisible(t) }
}
const h2 = 'text-[15px] font-medium text-ink'

export function EntryView({ slug }: { slug: string }) {
  const term = getTerm(slug)
  if (!isFull(term)) throw new Error(`"${slug}" is a draft and has no entry page.`)
  return <Entry key={term.slug} term={term} />
}

function Entry({ term }: { term: FullTerm }) {
  const [values, setValues] = useState<Values>(() => defaultValues(term.demo.controls))
  const [replayRequest, setReplayRequest] = useState(0)
  const { prev, next } = neighbors(terms, term.slug)
  const confused = confusedPairs(terms)
    .filter((p) => p.a === term.slug || p.b === term.slug)
    .map((p) => {
      const other = getTerm(p.a === term.slug ? p.b : p.a)
      return { other, difference: p.difference, href: isVisible(other) ? `/compare/${compareSlug(p.a, p.b)}` : null }
    })

  return (
    <article>
      <div className="h-80 rounded-2xl bg-surface p-3 shadow-card sm:h-96">
        <DemoPlayer slug={term.slug} size="detail" values={values} replayRequest={replayRequest} />
      </div>
      <DemoControls
        controls={term.demo.controls ?? []}
        values={values}
        onChange={(id, value) => setValues((s) => ({ ...s, [id]: value }))}
        onReplay={() => setReplayRequest((n) => n + 1)}
      />

      <header className="mt-12">
        <p className="mb-2 flex items-center gap-2 text-sm text-ink-muted">
          <CategoryIcon slug={term.category} />
          {getCategory(term.category).name}
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-medium tracking-[-0.015em]">{term.name}</h1>
          <div className="flex flex-wrap gap-1 text-sm">
            <CopyButton text={() => buildPromptText(term, values)} label="Copy as prompt" className="hit rounded-full px-3 py-1.5 text-ink-muted hover:text-ink">
              Copy as prompt
            </CopyButton>
            <CopyButton text={() => buildMarkdown(term, values, resolve)} label="Copy as markdown" className="hit rounded-full px-3 py-1.5 text-ink-muted hover:text-ink">
              Copy as markdown
            </CopyButton>
          </div>
        </div>
        {term.aliases.length > 0 && <p className="mt-2 text-sm text-ink-muted">Also called {term.aliases.join(', ')}</p>}
        <p className="mt-6 text-[17px] leading-relaxed text-ink">{term.definition}</p>
        <p className="mt-3 leading-relaxed text-ink-muted">{term.description}</p>
      </header>

      <div className="mt-12 grid gap-8 sm:grid-cols-2">
        <section aria-labelledby="use-when">
          <h2 id="use-when" className={h2}>Use when</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-ink-muted">
            {term.useWhen.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <section aria-labelledby="avoid-when">
          <h2 id="avoid-when" className={h2}>Avoid when</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-ink-muted">
            {term.avoidWhen.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      </div>

      <section aria-labelledby="prompt" className="mt-12">
        <h2 id="prompt" className={h2}>Prompt</h2>
        <div className="relative mt-3 rounded-2xl bg-surface shadow-card">
          <pre className="whitespace-pre-wrap break-words p-5 pr-14 font-mono text-[13px] leading-relaxed text-ink">
            <code>{term.prompt(values).trim()}</code>
          </pre>
          <div className="absolute right-3 top-3">
            <CopyButton text={() => buildPromptText(term, values)} label="Copy prompt" className="hit size-8 justify-center rounded-lg text-ink-muted hover:text-ink" />
          </div>
        </div>
        <h3 className="mt-6 text-sm font-medium">Acceptance checklist</h3>
        <ul className="mt-2 space-y-2 text-sm leading-relaxed text-ink-muted">
          {term.acceptance(values).map((item, i) => (
            <li key={i} className="flex gap-2.5">
              <span aria-hidden className="mt-1 size-3 shrink-0 rounded-[4px] shadow-[inset_0_0_0_1px_var(--line-strong)]" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="code" className="mt-12">
        <h2 id="code" className={h2}>Code</h2>
        <CodeTabs code={term.code(values)} />
      </section>

      <section aria-labelledby="a11y" className="mt-12">
        <h2 id="a11y" className={h2}>Accessibility</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">{term.a11y}</p>
      </section>

      <section aria-labelledby="related" className="mt-12">
        <h2 id="related" className={h2}>Related</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {term.related.map((s) => {
            const r = getTerm(s)
            const visible = isVisible(r)
            return (
              <li key={s} className="relative rounded-xl bg-surface p-4 shadow-card">
                <p className={`flex items-center justify-between gap-2 text-sm ${visible ? 'text-ink' : 'text-ink-faint'}`}>
                  {visible ? <Link href={`/terms/${s}`} className="after:absolute after:inset-0">{r.name}</Link> : r.name}
                  {!visible && <SoonPill />}
                </p>
                <p className="mt-1 text-xs leading-snug text-ink-faint">{r.definition}</p>
              </li>
            )
          })}
        </ul>
      </section>

      {confused.length > 0 && (
        <section aria-labelledby="confused" className="mt-12">
          <h2 id="confused" className={h2}>Often confused with</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {confused.map(({ other, difference, href }) => (
              <li key={other.slug}>
                <span className="flex items-center gap-2">
                  {href ? (
                    <Link href={href} className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                      {term.name} vs {other.name}
                    </Link>
                  ) : (
                    <span className="text-ink-faint">{other.name}</span>
                  )}
                  {!href && <SoonPill />}
                </span>
                <span className="mt-1 block leading-relaxed text-ink-muted">{difference}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(prev || next) && (
        <nav aria-label="Previous and next" className="mt-16 flex justify-between gap-4 border-t border-line pt-6 text-sm">
          {prev ? <Link href={`/terms/${prev.slug}`} className="hit text-ink-muted hover:text-ink">← {prev.name}</Link> : <span />}
          {next ? <Link href={`/terms/${next.slug}`} className="hit text-ink-muted hover:text-ink">{next.name} →</Link> : <span />}
        </nav>
      )}
    </article>
  )
}
