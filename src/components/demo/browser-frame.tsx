'use client'

import type { ReactNode, Ref } from 'react'

type Props = {
  children: ReactNode
  scrollRef: Ref<HTMLDivElement>
  size: 'card' | 'detail'
  /** accessible name of the scroll area on the entry page */
  label: string
}

// A mini browser window, so every scroll demo reads as part of one family.
export function BrowserFrame({ children, scrollRef, size, label }: Props) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-surface shadow-card">
      <div className="flex h-7 shrink-0 items-center gap-1.5 border-b border-line px-3">
        <span className="size-2 rounded-full bg-demo-2" />
        <span className="size-2 rounded-full bg-demo-2" />
        <span className="size-2 rounded-full bg-demo-2" />
        <span className="mx-auto h-2.5 w-1/3 rounded-full bg-demo" />
      </div>
      <div
        ref={scrollRef}
        data-scroller=""
        tabIndex={size === 'detail' ? 0 : -1}
        aria-label={size === 'detail' ? label : undefined}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]"
      >
        {children}
      </div>
    </div>
  )
}
