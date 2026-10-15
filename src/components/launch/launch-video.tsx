'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { DemoPlayer } from '@/components/demo/demo-player'
import { Mark } from '@/components/site/mark'
import { getCategory } from '@/lib/categories'
import { SITE_URL } from '@/lib/site'
import { getTerm } from '@/lib/terms'

declare global {
  interface Window {
    __launchStart?: () => void
  }
}

// The launch video: a vague sentence, the thing it names, three names. 540 by 540 CSS px, recorded at 2x.
// It starts when the recorder calls window.__launchStart(), so every timer runs on the recorder's clock.
const SENTENCE = 'that thing where the header sticks and the list slides under it'
const SHOWS = ['sticky', 'stagger', 'press-scale'] as const

type State = { words: boolean; demo: boolean; sentenceOut: boolean; label: boolean; mount: number; show: number; end: boolean; endStep: number }
const INITIAL: State = { words: false, demo: false, sentenceOut: false, label: false, mount: -1, show: -1, end: false, endStep: 0 }

// ms from the start. A demo is mounted a beat before it is shown where its cycle opens by clearing the stage
// (Stagger's list leaves before it cascades in), so the crossfade lands on motion, not on an empty panel.
const STEPS: [number, Partial<State>][] = [
  [600, { words: true }],
  [2600, { demo: true, mount: 0, show: 0 }],
  [6600, { sentenceOut: true }],
  [7000, { label: true }],
  [8000, { mount: 1 }],
  [8600, { show: 1 }],
  [11000, { mount: 2, show: 2 }],
  [13000, { end: true }],
  [13300, { endStep: 1 }],
  [13600, { endStep: 2 }],
  [13900, { endStep: 3 }],
]

const FADE = 'transition-opacity duration-400 ease-(--ease-out)'
const fade = (on: boolean) => `${FADE} ${on ? 'opacity-100' : 'opacity-0'}`

export function LaunchVideo() {
  const [s, set] = useState<State>(INITIAL)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    window.__launchStart = () => setStarted(true)
    return () => {
      delete window.__launchStart
    }
  }, [])

  useEffect(() => {
    if (!started) return
    const timers = STEPS.map(([at, patch]) => setTimeout(() => set((prev) => ({ ...prev, ...patch })), at))
    return () => timers.forEach(clearTimeout)
  }, [started])

  return (
    <div data-launch="" className="fixed inset-0 z-50 overflow-hidden bg-canvas text-ink">
      <style>{`
        nextjs-portal { display: none }
        /* The demos' "press the button" hints are for the interactive page. */
        [data-launch] [data-demo] p[aria-hidden] { display: none }
        [data-launch] .word { opacity: 0; translate: 0 4px; }
        [data-launch] [data-words="true"] .word {
          animation: launch-word 300ms var(--ease-out) both;
          animation-delay: calc(var(--i) * 70ms);
        }
        @keyframes launch-word { to { opacity: 1; translate: 0 0; } }
      `}</style>

      {/* The story: the sentence, then its name, over the demo. */}
      <div className={`absolute inset-0 flex flex-col px-10 pt-14 ${FADE} ${s.end ? 'opacity-0' : 'opacity-100'}`}>
        <div className="relative h-[88px]">
          <p data-words={String(s.words)} className={`absolute inset-x-0 top-0 text-[23px] leading-[1.4] text-ink ${fade(!s.sentenceOut)}`}>
            {SENTENCE.split(' ').map((word, i) => (
              <span key={i} className="word inline-block" style={{ '--i': i } as CSSProperties}>
                {word}&nbsp;
              </span>
            ))}
          </p>
          {SHOWS.map((slug, i) => {
            const term = getTerm(slug)
            return (
              <div key={slug} className={`absolute inset-x-0 top-0 flex items-baseline gap-3 ${fade(s.label && s.show === i)}`}>
                <span className="text-[28px] font-medium leading-tight">{term.name}</span>
                <span className="text-[15px] text-ink-muted">{getCategory(term.category).name}</span>
              </div>
            )
          })}
        </div>
        <div
          className={`relative mt-5 h-[320px] rounded-2xl bg-surface p-3 shadow-card transition-[opacity,translate] duration-300 ease-(--ease-out) ${s.demo ? 'opacity-100' : 'translate-y-4 opacity-0'}`}
        >
          {SHOWS.map(
            (slug, i) =>
              s.mount >= i && (
                <div key={slug} className={`absolute inset-3 ${fade(s.show === i)}`}>
                  <DemoPlayer slug={slug} size="detail" />
                </div>
              ),
          )}
        </div>
      </div>

      {/* The end card. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className={`flex items-center gap-4 ${fade(s.endStep >= 1)}`}>
          <Mark size={36} />
          <span className="font-mono text-[32px] font-medium leading-none tracking-[-0.01em]">moveset</span>
        </div>
        <p className={`text-[17px] text-ink-muted ${fade(s.endStep >= 2)}`}>A visual dictionary of design engineering terms.</p>
        <p className={`mt-2 font-mono text-[13px] text-ink-muted ${fade(s.endStep >= 3)}`}>{SITE_URL.replace('https://', '')}</p>
      </div>
    </div>
  )
}
