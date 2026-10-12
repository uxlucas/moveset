'use client'

import { useEffect, type RefObject } from 'react'
import { getSnapshot, setCurrent } from '@/lib/spy-store'

/** Where a card has to reach, as a share of the viewport height, to become the one being read. */
const LINE = 0.42

const top = (el: Element) => el.getBoundingClientRect().top

/** The card the reader is on: the lowest card whose top has passed the reading line. */
function pickCurrent(cards: HTMLElement[], viewportHeight: number, atBottom: boolean, currentSlug: string | null): HTMLElement | null {
  const line = viewportHeight * LINE
  let pick: HTMLElement | null = null
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
  // At the very bottom the last cards can never reach the line: keep a fully visible current card,
  // else take the last fully visible one (the left one when the last two share a row).
  if (atBottom) {
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
    let frame = 0
    const spy = () => {
      frame = 0
      const root = rootRef.current
      if (!root) return
      const cards = [...root.querySelectorAll<HTMLElement>('[data-testid="term-card"][data-slug]')]
      const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
      const pick = pickCurrent(cards, window.innerHeight, atBottom, getSnapshot())
      setCurrent(pick?.dataset.slug ?? null)
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
