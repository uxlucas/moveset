'use client'

import { useRef } from 'react'
import { CATEGORIES, type CategorySlug } from '@/lib/categories'
import { useScrollEdges } from './use-scroll-edges'

export type Filter = CategorySlug | 'all'
const OPTIONS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  ...CATEGORIES.map((c) => ({ value: c.slug, label: c.short })),
]

export function FilterPills({ value, onChange }: { value: Filter; onChange: (f: Filter) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const { start, end } = useScrollEdges(ref)
  return (
    <div
      ref={ref}
      role="group"
      aria-label="Filter by category"
      data-fade-start={start}
      data-fade-end={end}
      className="scroll-fade-x -mx-4 -my-0.5 flex min-w-0 gap-1.5 overflow-x-auto px-4 py-1.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
    >
      {OPTIONS.map((o) => {
        const pressed = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(o.value)}
            className={`press hit shrink-0 rounded-full px-3 py-1.5 text-sm ${pressed ? 'bg-surface text-accent-ink shadow-card-hover' : 'bg-surface text-ink-muted shadow-card hover:text-ink'}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
