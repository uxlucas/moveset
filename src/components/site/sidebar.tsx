'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, type ComponentType, type ReactNode } from 'react'
import { groupByCategory, isVisible, progress } from '@/lib/content'
import { useSpy } from '@/lib/spy-store'
import type { GlyphProps } from '@/lib/term-types'
import { terms } from '@/lib/terms'
import { GenericGlyph, IndexGlyph, SoonGlyph } from './glyph'

const groups = groupByCategory(terms)

// 24px rows; a name that wraps grows the row, and the glyph stays on the first line.
const ROW = 'flex min-h-6 items-start gap-2 rounded-[7px] px-1.5 py-1'

type RowProps = {
  id: string
  href: string
  current: boolean
  routeMatch: boolean
  glyph: ComponentType<GlyphProps>
  children: ReactNode
}

function RowLink({ id, href, current, routeMatch, glyph: Glyph, children }: RowProps) {
  return (
    <Link
      href={href}
      data-k={id}
      data-current={current ? 'true' : undefined}
      aria-current={routeMatch ? 'page' : undefined}
      className={`${ROW} transition-colors duration-150 ease-[ease] hover:text-ink ${current ? 'text-ink' : 'text-ink-muted'}`}
    >
      <span className="mt-0.5">
        <Glyph active={current} />
      </span>
      <span className="min-w-0">{children}</span>
    </Link>
  )
}

function DraftRow({ id, current, children }: { id: string; current: boolean; children: ReactNode }) {
  return (
    <span data-k={id} data-current={current ? 'true' : undefined} className={`${ROW} cursor-default text-ink-faint`}>
      <span className="mt-0.5">
        <SoonGlyph />
      </span>
      <span className="min-w-0">
        {children}
        <span className="sr-only"> (soon)</span>
      </span>
    </span>
  )
}

function routeSlug(pathname: string): string | null {
  const match = /^\/terms\/([^/]+)$/.exec(pathname)
  return match ? match[1] : null
}

export function Sidebar() {
  const pathname = usePathname()
  const spied = useSpy()
  const onTerm = routeSlug(pathname)
  // An entry page marks its own term. The index marks the card being read, or "Index" above the first one.
  const current = onTerm ?? (pathname === '/' ? (spied ?? 'index') : null)

  const scrollerRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const indRef = useRef<HTMLDivElement>(null)
  const currentRef = useRef(current)
  // What the highlight last showed; undefined until the first placement, which never scrolls the rail.
  const shownRef = useRef<string | null | undefined>(undefined)

  // Moves the highlight onto the current row. Writes to the DOM directly: this runs on every spy change.
  function place(animate: boolean): HTMLElement | null {
    const rail = railRef.current
    const ind = indRef.current
    if (!rail || !ind) return null
    const row = currentRef.current ? rail.querySelector<HTMLElement>(`[data-k="${currentRef.current}"]`) : null
    if (!row) {
      ind.style.opacity = '0'
      return null
    }
    // Slide only between rows. Appearing (first paint, or after being hidden) jumps straight there.
    const jump = !animate || ind.style.opacity !== '1'
    if (jump) ind.style.transition = 'none'
    ind.style.transform = `translateY(${row.offsetTop}px)`
    ind.style.height = `${row.offsetHeight}px`
    ind.style.opacity = '1'
    if (jump) requestAnimationFrame(() => ind.style.removeProperty('transition'))
    return row
  }

  useLayoutEffect(() => {
    currentRef.current = current
    const shown = shownRef.current
    shownRef.current = current
    const row = place(shown !== undefined)
    const scroller = scrollerRef.current
    if (shown === undefined || shown === current || !row || !scroller) return
    const top = row.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
    const outOfView = top < scroller.scrollTop + 20 || top + row.offsetHeight > scroller.scrollTop + scroller.clientHeight - 80
    if (outOfView) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      scroller.scrollTo({ top: top - scroller.clientHeight / 3, behavior: reduced ? 'auto' : 'smooth' })
    }
  }, [current])

  // Rows can reflow (fonts, window width), so keep the highlight on its row.
  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    const observer = new ResizeObserver(() => place(false))
    observer.observe(rail)
    return () => observer.disconnect()
  }, [])

  return (
    <aside className="hidden lg:block">
      <div
        ref={scrollerRef}
        className="sticky top-0 max-h-dvh overflow-y-auto overscroll-contain pb-14 pl-[26px] pr-[18px] pt-10 text-[12px] leading-4 [mask-image:linear-gradient(to_bottom,#000_calc(100%-56px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div ref={railRef} className="relative isolate">
          <div
            ref={indRef}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-6 rounded-[7px] bg-seg opacity-0 [transition:transform_300ms_var(--ease-out),opacity_200ms_var(--ease-out)] motion-reduce:transition-none"
          />
          <nav aria-label="Site">
            <ul>
              <li>
                <RowLink id="index" href="/" current={current === 'index'} routeMatch={pathname === '/'} glyph={IndexGlyph}>
                  Index
                </RowLink>
              </li>
            </ul>
          </nav>
          <nav aria-label="Terms">
            {groups.map(({ category, terms: list }) => {
              const count = progress(list)
              return (
                <div key={category.slug} className="mt-[18px]">
                  <h2 className="flex items-baseline justify-between gap-3 px-1.5 pb-1 text-[12px] font-normal leading-4 text-ink-muted">
                    {category.name}
                    <span className="text-[11px] tabular-nums text-ink-faint">
                      <span aria-hidden>{count.text}</span>
                      <span className="sr-only"> ({count.label})</span>
                    </span>
                  </h2>
                  <ul>
                    {list.map((t) => (
                      <li key={t.slug}>
                        {isVisible(t) ? (
                          <RowLink
                            id={t.slug}
                            href={`/terms/${t.slug}`}
                            current={current === t.slug}
                            routeMatch={onTerm === t.slug}
                            glyph={t.demo.glyph ?? GenericGlyph}
                          >
                            {t.name}
                          </RowLink>
                        ) : (
                          <DraftRow id={t.slug} current={current === t.slug}>
                            {t.name}
                          </DraftRow>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </nav>
        </div>
      </div>
    </aside>
  )
}
