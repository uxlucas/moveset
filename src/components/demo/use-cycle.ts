'use client'

import { useEffect, useRef } from 'react'
import type { DemoProps } from '@/lib/term-types'
import { scaled } from './playback'

/** [time in ms from the start of the cycle, what happens then] */
export type CycleStep = readonly [atMs: number, run: () => void]

export type Cycle = {
  steps: readonly CycleStep[]
  /** when the cycle is over and the runtime gets `onCycleEnd` */
  endMs: number
  /** paints the still frame: before play, and whenever playback stops mid-cycle */
  still: () => void
}

/**
 * Runs one cycle: each step at its time divided by `timeScale`, then `onEnd`. Steps at 0 run right away,
 * so a restart acts in the same frame. Returns a function that cancels whatever has not run yet.
 */
export function runCycle(steps: readonly CycleStep[], endMs: number, timeScale: number, onEnd: () => void): () => void {
  const timers: ReturnType<typeof setTimeout>[] = []
  for (const [at, run] of steps) {
    if (at <= 0) run()
    else timers.push(setTimeout(run, scaled(at, timeScale)))
  }
  timers.push(setTimeout(onEnd, scaled(endMs, timeScale)))
  return () => timers.forEach(clearTimeout)
}

type Playback = Pick<DemoProps, 'playing' | 'replayKey' | 'timeScale' | 'onCycleEnd'>

/**
 * A small timeline for demos that are not scroll-driven. The steps only flip attributes; CSS transitions do
 * the animating, so nothing renders per frame. A new cycle starts on replay, on a new speed, and whenever
 * `restartKey` changes (pass the control values, so a changed control plays at once). Not playing paints `still`.
 */
export function useCycle(plan: () => Cycle, { playing, replayKey, timeScale, onCycleEnd }: Playback, restartKey: string) {
  const planRef = useRef(plan)
  const onCycleEndRef = useRef(onCycleEnd)
  useEffect(() => {
    planRef.current = plan
    onCycleEndRef.current = onCycleEnd
  })

  useEffect(() => {
    const { steps, endMs, still } = planRef.current()
    if (!playing) {
      still()
      return
    }
    return runCycle(steps, endMs, timeScale, () => onCycleEndRef.current())
  }, [playing, replayKey, timeScale, restartKey])
}

/** Applies a state change with transitions off for one frame: `root` needs `data-snap`, which the demo's CSS honours. */
export function snap(root: HTMLElement, apply: () => void) {
  root.dataset.snap = 'true'
  apply()
  void root.offsetWidth // commit the new state before transitions come back
  root.dataset.snap = 'false'
}
