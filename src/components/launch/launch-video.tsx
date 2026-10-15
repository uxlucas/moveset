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

// The launch video: a vague sentence typed out, crossed out and replaced by its name; two more names; a grid of the
// rest; the logo. Twenty seconds, 540 by 540 CSS px, recorded at 2x. It starts when the recorder calls window.__launchStart(), so
// every timer runs on the recorder's clock.
const SENTENCE = 'that thing where the header sticks and the list slides under it'
// Typing: an even cadence, a longer beat after each space.
const TYPE_START = 600
const CHAR_MS = 32
const SPACE_MS = 90
// The three showcases, slowed for the camera where a beat is quick: Stagger's 60ms step at 0.6 speed so each row
// reads, Spring's throw and catch at 0.75. Spring plays twice in its slot (`replay` below): its move is one second.
const SHOWS = [
  { slug: 'sticky', timeScale: 1 },
  { slug: 'stagger', timeScale: 0.6 },
  { slug: 'spring', timeScale: 0.75 },
] as const
const GRID = ['scroll-triggered', 'parallax', 'ease-out', 'press-scale', 'enter-and-exit', 'swipe-to-dismiss'] as const

type State = {
  typed: number
  demo: boolean
  strike: boolean
  sentenceOut: boolean
  label: boolean
  mount: number
  show: number
  replay: number
  grid: boolean
  gridIn: boolean
  end: boolean
  endStep: number
  glitch: boolean
}
const INITIAL: State = {
  typed: 0,
  demo: false,
  strike: false,
  sentenceOut: false,
  label: false,
  mount: -1,
  show: -1,
  replay: 0,
  grid: false,
  gridIn: false,
  end: false,
  endStep: 0,
  glitch: false,
}

// ms from the start. A demo is mounted a beat before it is shown where its cycle opens with a beat of its own
// (Stagger's list leaves before it cascades in; Press Scale rests before it presses), so the crossfade lands on motion.
const STEPS: [number, Partial<State>][] = [
  [3000, { demo: true, mount: 0, show: 0 }],
  [5600, { strike: true }],
  [6500, { sentenceOut: true }],
  [6800, { label: true }],
  [8000, { mount: 1 }],
  [8600, { show: 1 }],
  [12000, { mount: 2, show: 2 }],
  [13500, { replay: 1 }],
  [15200, { grid: true }],
  [15400, { gridIn: true }],
  [18200, { end: true }],
  [18500, { endStep: 1 }],
  [19100, { glitch: true }],
  [19200, { endStep: 2 }],
  [19500, { endStep: 3 }],
]

// When each character of the sentence lands, ms from the start.
const TYPED_AT: number[] = []
for (let i = 0, at = TYPE_START; i < SENTENCE.length; i++) {
  at += SENTENCE[i - 1] === ' ' ? SPACE_MS : CHAR_MS
  TYPED_AT.push(at)
}

const FADE = 'transition-opacity duration-400 ease-(--ease-out)'

/** The sentence as typed so far, split into words. A word is `done` once its space has been typed (or the line is
 * complete); `spaced` says whether a space follows it on screen, which the last word never has. */
function typedWords(typed: number): { word: string; done: boolean; spaced: boolean }[] {
  const text = SENTENCE.slice(0, typed)
  const words = text.split(' ')
  const endsWithSpace = text.endsWith(' ')
  return words
    .filter((w, i) => w.length > 0 || i < words.length - 1)
    .map((word, i, all) => {
      const spaced = i < all.length - 1 || endsWithSpace
      return { word, done: spaced || typed === SENTENCE.length, spaced }
    })
}
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
    TYPED_AT.forEach((at, i) => timers.push(setTimeout(() => set((prev) => ({ ...prev, typed: i + 1 })), at)))
    return () => timers.forEach(clearTimeout)
  }, [started])

  return (
    <div data-launch="" className="fixed inset-0 z-50 overflow-hidden bg-canvas text-ink">
      <style>{`
        nextjs-portal { display: none }
        /* The demos' "press the button" hints are for the interactive page. */
        [data-launch] [data-demo] p[aria-hidden] { display: none }

        /* The sentence is typed; each word is a span so it can be crossed out on its own. */
        [data-launch] .word { position: relative; transition: color 300ms ease; }
        @keyframes launch-word { to { opacity: 1; translate: 0 0; } }

        /* Crossed out: a line is drawn through each word in turn, and the words go quiet. */
        [data-launch] .word::after {
          content: '';
          position: absolute;
          left: 0;
          top: 55%;
          height: 2px;
          width: 0;
          background: currentColor;
        }
        [data-launch] [data-strike="true"] .word { color: var(--color-ink-muted); }
        [data-launch] [data-strike="true"] .word::after {
          animation: launch-strike 220ms var(--ease-out) both;
          animation-delay: calc(var(--i) * 55ms);
        }
        @keyframes launch-strike { to { width: calc(100% - 0.3em); } }

        /* The grid's cards rise in one after another. */
        [data-launch] .cell { opacity: 0; translate: 0 8px; }
        [data-launch] [data-grid-in="true"] .cell {
          animation: launch-word 400ms var(--ease-out) both;
          animation-delay: calc(var(--i) * 70ms);
        }

        /* The logo's hover, played once on cue (the same keyframes the header uses). */
        [data-launch] [data-glitch="true"] .logo-word::before { clip-path: inset(0 0 55% 0); animation: glitch-top 0.32s steps(2, end) 1; }
        [data-launch] [data-glitch="true"] .logo-word::after { clip-path: inset(45% 0 0 0); animation: glitch-bottom 0.32s steps(2, end) 1; }
        [data-launch] [data-glitch="true"] .logo-mark { animation: glitch-mark 0.32s steps(3, end) 1; }
      `}</style>

      {/* The story: the sentence, crossed out, then its name, over the demo. */}
      <div className={`absolute inset-0 flex flex-col px-10 pt-14 ${FADE} ${s.grid ? 'opacity-0' : 'opacity-100'}`}>
        <div className="relative h-[88px]">
          <p data-strike={String(s.strike)} className={`absolute inset-x-0 top-0 text-[23px] leading-[1.4] text-ink ${fade(!s.sentenceOut)}`}>
            {typedWords(s.typed).map(({ word, done, spaced }, i) => (
              <span key={i} className={`inline-block ${done ? 'word' : ''}`} style={{ '--i': i } as CSSProperties}>
                {word}
                {spaced && <>&nbsp;</>}
              </span>
            ))}
            {/* A steady cursor, there until the line is crossed out. */}
            {s.typed > 0 && !s.strike && <span aria-hidden className="ml-px inline-block h-[1.05em] w-[2px] translate-y-[0.18em] bg-ink" />}
          </p>
          {SHOWS.map(({ slug }, i) => {
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
            ({ slug, timeScale }, i) =>
              s.mount >= i && (
                <div key={slug} className={`absolute inset-3 ${fade(s.show === i)}`}>
                  <DemoPlayer slug={slug} size="detail" timeScale={timeScale} replayRequest={i === 2 ? s.replay : 0} />
                </div>
              ),
          )}
        </div>
      </div>

      {/* The grid: six more concepts, the index's cards, scaled to fit. */}
      {s.grid && (
        <div className={`absolute inset-0 flex items-center justify-center ${fade(!s.end)}`}>
          <div data-grid-in={String(s.gridIn)} className="grid origin-center grid-cols-2 gap-4 [scale:0.68]" style={{ width: 632 }}>
            {GRID.map((slug, i) => {
              const term = getTerm(slug)
              return (
                <div key={slug} className="cell flex flex-col rounded-2xl bg-surface shadow-card" style={{ '--i': i } as CSSProperties}>
                  <div className="h-44 p-3">
                    <DemoPlayer slug={slug} size="card" />
                  </div>
                  <p className="px-5 pb-4 pt-1 text-[15px] text-ink">{term.name}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* The end card. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div data-glitch={String(s.glitch)} className={`logo flex items-center gap-4 ${fade(s.endStep >= 1)}`}>
          <Mark size={36} className="logo-mark" />
          <span data-text="moveset" className="logo-word relative font-mono text-[32px] font-medium leading-none tracking-[-0.01em]">
            moveset
          </span>
        </div>
        <p className={`text-[17px] text-ink-muted ${fade(s.endStep >= 2)}`}>A visual dictionary of design engineering terms.</p>
        <p className={`mt-2 font-mono text-[13px] text-ink-muted ${fade(s.endStep >= 3)}`}>{SITE_URL.replace('https://', '')}</p>
      </div>
    </div>
  )
}
