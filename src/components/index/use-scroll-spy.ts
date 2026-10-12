'use client'

import { useEffect, type RefObject } from 'react'
import { getSnapshot, setCurrent } from '@/lib/spy-store'

/** Where a card has to reach, as a share of the viewport height, to become the one being read. */
const LINE = 0.42

/** The sidebar only exists from `lg` up; below that the spy does nothing. */
const DESKTOP = '(min-width: 64rem)'

type Card = Pick<HTMLElement, 'getBoundingClientRect' | 'dataset'>
export type Page = { viewportHeight: number; scrollY: number; scrollHeight: number }

const top = (el: Card) => el.getBoundingClientRect().top

/** The card the reader is on: the lowest card whose top has passed the reading line, or null above the first. */
export function pickCurrent<T extends Card>(cards: readonly T[], page: Page, currentSlug: string | null): T | null {
  const { viewportHeight, scrollY, scrollHeight } = page
  const line = viewportHeight * LINE
  let pick: T | null = null
  let best = -Infinity
  for (const card of cards) {
    const t = top(card)
    if (t <= line && t > best + 1) {
      best = t
      pick = card
    }
  }
  const current = currentSlug ? cards.find((c) => c.dataset.slug === currentSlug) : undefined
  // Two cards share a row: keep the one already current instead of flipping to the left one.
  if (pick && current && Math.abs(top(current) - best) < 2) pick = current
  // At the very bottom of a page that scrolls, the last cards can never reach the line: keep a fully
  // visible current card, else take the last fully visible one (the left one when the last two share a row).
  const scrolls = scrollHeight > viewportHeight + 2
  if (scrolls && scrollY + viewportHeight >= scrollHeight - 2) {
    const seen = cards.filter((c) => {
      const r = c.getBoundingClientRect()
      return r.top >= 0 && r.bottom <= viewportHeight
    })
    if (seen.length) {
      const last = seen[seen.length - 1]
      const beforeLast = seen[seen.length - 2]
      if (current && seen.includes(current)) pick = current
      else if (beforeLast && top(beforeLast) === top(last)) pick = beforeLast
      else pick = last
    }
  }
  return pick
}

/** Reports the card being read to the spy store, for the sidebar. `deps` re-measures when the card set changes. */
export function useScrollSpy(rootRef: RefObject<HTMLElement | null>, deps: string) {
  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP)
    let frame = 0
    const spy = () => {
      frame = 0
      const root = rootRef.current
      if (!root || !desktop.matches) return
      const cards = [...root.querySelectorAll<HTMLElement>('[data-testid="term-card"][data-slug]')]
      const page = {
        viewportHeight: window.innerHeight,
        scrollY: window.scrollY,
        scrollHeight: document.documentElement.scrollHeight,
      }
      setCurrent(pickCurrent(cards, page, getSnapshot())?.dataset.slug ?? null)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(spy)
    }
    spy()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [rootRef, deps])

  useEffect(() => () => setCurrent(null), [])
}
