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
  // Scroll fade: fade only the edge that has more content.
  const mask = `linear-gradient(to right, ${start ? 'transparent' : 'black'}, black 24px, black calc(100% - 24px), ${end ? 'transparent' : 'black'})`
  return (
    <div
      ref={ref}
      role="group"
      aria-label="Filter by category"
      className="-mx-4 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:px-0"
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    >
      {OPTIONS.map((o) => {
        const pressed = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(o.value)}
            className={`press shrink-0 rounded-full px-3 py-1.5 text-sm ${pressed ? 'bg-ink text-canvas' : 'bg-surface text-ink-muted shadow-card hover:text-ink'}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
