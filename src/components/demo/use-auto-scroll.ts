'use client'

import { animate } from 'motion/react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { scaled } from './playback'

type Options = {
  playing: boolean
  replayKey: number
  timeScale: number
  onCycleEnd: () => void
  /** detail size: the visitor can take over by scrolling */
  interactive: boolean
  durationMs?: number
  /** scroll position (0–1) shown as the still frame */
  stillAt?: number
}

const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const
const TAKEOVER_EVENTS = ['wheel', 'pointerdown', 'touchstart', 'keydown'] as const

// Scrolls a container top to bottom once per cycle. Writes scrollTop directly; no React state per frame.
export function useAutoScroll(
  ref: RefObject<HTMLElement | null>,
  { playing, replayKey, timeScale, onCycleEnd, interactive, durationMs = 3200, stillAt = 0.4 }: Options,
) {
  const [takenOver, setTakenOver] = useState(false)
  const onCycleEndRef = useRef(onCycleEnd)
  useEffect(() => {
    onCycleEndRef.current = onCycleEnd
  })
  useEffect(() => {
    setTakenOver(false)
  }, [replayKey])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.dataset.takenOver = String(takenOver)
    const max = el.scrollHeight - el.clientHeight
    if (takenOver) return
    if (!playing) {
      el.scrollTop = max * stillAt
      return
    }

    el.dataset.active = String(Number(el.dataset.active ?? 0) + 1)
    el.scrollTop = 0
    const controls = animate(0, max, {
      duration: scaled(durationMs, timeScale) / 1000,
      ease: EASE_IN_OUT,
      onUpdate: (v) => {
        el.scrollTop = v
      },
      onComplete: () => onCycleEndRef.current(),
    })
    const takeOver = () => {
      controls.stop()
      setTakenOver(true)
    }
    if (interactive) TAKEOVER_EVENTS.forEach((e) => el.addEventListener(e, takeOver, { passive: true }))

    return () => {
      controls.stop()
      el.dataset.active = String(Number(el.dataset.active ?? 1) - 1)
      if (interactive) TAKEOVER_EVENTS.forEach((e) => el.removeEventListener(e, takeOver))
    }
  }, [ref, playing, replayKey, timeScale, takenOver, interactive, durationMs, stillAt])
}
