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
  /** still frame in pixels; wins over stillAt when set */
  stillPx?: number
  /** curve for the one-way scroll; defaults to the house ease-in-out */
  ease?: Bezier
  /** scroll back up after a short hold at the bottom, for demos that must be seen running backwards */
  returnTrip?: boolean
}

type Bezier = readonly [number, number, number, number]

const EASE_IN_OUT: Bezier = [0.77, 0, 0.175, 1]
// Down, a short hold at the bottom, back up. A softer curve keeps the pace steady through the middle,
// where effects tied to the scroll position play out and need to be readable.
const RETURN_TIMES = [0, 0.44, 0.56, 1]
const EASE_IN_OUT_SOFT = [0.37, 0, 0.63, 1] as const
const TAKEOVER_EVENTS = ['wheel', 'pointerdown', 'touchstart', 'keydown'] as const

// Scrolls a container top to bottom (and back, with returnTrip) once per cycle. Writes scrollTop directly; no React state per frame.
export function useAutoScroll(
  ref: RefObject<HTMLElement | null>,
  { playing, replayKey, timeScale, onCycleEnd, interactive, durationMs = 3200, stillAt = 0.4, stillPx, ease = EASE_IN_OUT, returnTrip = false }: Options,
) {
  const [takenOver, setTakenOver] = useState(false)
  const onCycleEndRef = useRef(onCycleEnd)
  const stillPxRef = useRef(stillPx)
  useEffect(() => {
    onCycleEndRef.current = onCycleEnd
    stillPxRef.current = stillPx
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
      el.scrollTop = stillPxRef.current ?? max * stillAt
      return
    }

    el.dataset.active = String(Number(el.dataset.active ?? 0) + 1)
    el.scrollTop = 0
    const options = {
      duration: scaled(durationMs, timeScale) / 1000,
      onUpdate: (v: number) => {
        el.scrollTop = v
      },
      onComplete: () => onCycleEndRef.current(),
    }
    const controls = returnTrip
      ? animate(0, [0, max, max, 0], { ...options, times: RETURN_TIMES, ease: [EASE_IN_OUT_SOFT, 'linear', EASE_IN_OUT_SOFT] })
      : animate(0, max, { ...options, ease })
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
  }, [ref, playing, replayKey, timeScale, takenOver, interactive, durationMs, stillAt, ease, returnTrip])

  // A measured still frame can arrive after mount; move to it without restarting a cycle in flight.
  useEffect(() => {
    const el = ref.current
    if (el && stillPx !== undefined && !playing && !takenOver) el.scrollTop = stillPx
  }, [ref, stillPx, playing, takenOver])
}
