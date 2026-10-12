'use client'

import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import data from '@/generated/terms-data.json'
import { groupByCategory, matchesQuery, progress } from '@/lib/content'
import type { TermData } from '@/lib/term-data'
import { FilterPills, type Filter } from './filter-pills'
import { TermCard } from './term-card'
import { useScrollSpy } from './use-scroll-spy'

const ALL = data as TermData[]
const PROGRESS = new Map(groupByCategory(ALL).map((g) => [g.category.slug, progress(g.terms)]))

export function TermBrowser() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLElement>(null)
  useScrollSpy(rootRef, `${filter}|${query}`)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const groups = groupByCategory(ALL)
    .filter((g) => filter === 'all' || g.category.slug === filter)
    .map((g) => ({ ...g, terms: g.terms.filter((t) => matchesQuery(t, query)) }))
    .filter((g) => g.terms.length > 0)

  return (
    <section ref={rootRef} aria-label="Terms">
      <div className="mb-10 flex flex-col gap-3">
        <label className="relative block">
          <span className="sr-only">Search terms</span>
          <Search size={14} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setQuery('')
            }}
            placeholder="Search"
            autoComplete="off"
            spellCheck={false}
            className="h-9 pointer-coarse:h-11 w-full rounded-full bg-surface pl-8 pr-8 text-base text-ink shadow-card placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
          />
          <kbd aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-ink-faint">/</kbd>
        </label>
        <FilterPills value={filter} onChange={setFilter} />
      </div>

      {groups.length === 0 ? (
        <p role="status" className="text-ink-muted">
          Nothing matches “{query.trim()}”. Try describing what it does.
        </p>
      ) : (
        <div className="flex flex-col gap-[52px]">
          {groups.map(({ category, terms }) => {
            const count = PROGRESS.get(category.slug)!
            return (
              <section key={category.slug} aria-labelledby={`cat-${category.slug}`}>
                <h2 id={`cat-${category.slug}`} className="flex items-center gap-2.5 text-[13px] font-medium leading-5 text-ink">
                  {category.name}
                  <span aria-hidden className="h-px flex-1 bg-line" />
                  <span className="text-[11px] font-normal tabular-nums text-ink-muted">
                    <span aria-hidden>{count.text}</span>
                    <span className="sr-only"> ({count.label})</span>
                  </span>
                </h2>
                <p className="mb-3.5 mt-0.5 text-[13px] leading-5 text-ink-muted">{category.line}</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {terms.map((t) => (
                    <TermCard key={t.slug} term={t} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </section>
  )
}
