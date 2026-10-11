'use client'

import { Play } from 'lucide-react'
import { useInView } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { defaultValues } from '@/lib/content'
import type { Values } from '@/lib/term-types'
import { getTerm } from '@/lib/terms'
import { HOLD_MS, isPlaying, scaled } from './playback'
import { usePageVisible } from './use-page-visible'
import { usePrefersReducedMotion } from './use-reduced-motion'

type Props = {
  slug: string
  size: 'card' | 'detail'
  values?: Values
  timeScale?: number
  /** increment to replay from outside (the entry page's Replay button) */
  replayRequest?: number
}

export function DemoPlayer({ slug, size, values, timeScale = 1, replayRequest = 0 }: Props) {
  const term = getTerm(slug)
  const Demo = term.demo.component
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.5 })
  const pageVisible = usePageVisible()
  const reducedMotion = usePrefersReducedMotion()
  const [requested, setRequested] = useState(false)
  const [replayKey, setReplayKey] = useState(0)
  const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const playing = isPlaying({ inView, pageVisible, reducedMotion, requested })

  useEffect(() => {
    if (replayRequest === 0) return
    setRequested(true)
    setReplayKey((k) => k + 1)
  }, [replayRequest])

  useEffect(() => {
    if (!playing) clearTimeout(holdTimer.current)
  }, [playing])
  useEffect(() => () => clearTimeout(holdTimer.current), [])

  const onCycleEnd = useCallback(() => {
    clearTimeout(holdTimer.current)
    const hold = scaled(HOLD_MS, timeScale)
    if (reducedMotion) {
      holdTimer.current = setTimeout(() => setRequested(false), hold)
    } else if (size === 'card') {
      holdTimer.current = setTimeout(() => setReplayKey((k) => k + 1), hold)
    }
  }, [reducedMotion, size, timeScale])

  const play = () => {
    setRequested(true)
    setReplayKey((k) => k + 1)
  }

  return (
    <div ref={ref} data-demo={slug} data-playing={playing} className="relative h-full overflow-hidden rounded-xl bg-canvas">
      <div
        className="h-full"
        inert={size === 'card'}
        aria-hidden={size === 'card' || undefined}
        role={size === 'detail' ? 'group' : undefined}
        aria-label={size === 'detail' ? term.demo.label : undefined}
      >
        <Demo
          values={values ?? defaultValues(term.demo.controls)}
          playing={playing}
          replayKey={replayKey}
          size={size}
          timeScale={timeScale}
          onCycleEnd={onCycleEnd}
        />
      </div>
      {size === 'card' && <p className="sr-only">{term.demo.label}</p>}
      {reducedMotion && !playing && (
        <button
          type="button"
          onClick={play}
          aria-label={`Play ${term.name} demo`}
          className="press absolute bottom-2 right-2 z-10 inline-flex size-8 items-center justify-center rounded-full bg-surface text-ink shadow-card"
        >
          <Play size={14} aria-hidden />
        </button>
      )}
    </div>
  )
}
