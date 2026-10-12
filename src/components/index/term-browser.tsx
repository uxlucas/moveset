'use client'

import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CategoryIcon } from '@/components/site/category-icon'
import data from '@/generated/terms-data.json'
import { groupByCategory, matchesQuery } from '@/lib/content'
import type { TermData } from '@/lib/term-data'
import { FilterPills, type Filter } from './filter-pills'
import { TermCard } from './term-card'

const ALL = data as TermData[]

export function TermBrowser() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const inputRef = useRef<HTMLInputElement>(null)

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
    <section aria-label="Terms">
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
        groups.map(({ category, terms }) => (
          <section key={category.slug} aria-labelledby={`cat-${category.slug}`} className="mb-14">
            <h2 id={`cat-${category.slug}`} className="mb-4 flex items-center gap-2 text-[15px] text-ink">
              <CategoryIcon slug={category.slug} />
              {category.name}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {terms.map((t) => (
                <TermCard key={t.slug} term={t} />
              ))}
            </div>
          </section>
        ))
      )}
    </section>
  )
}
