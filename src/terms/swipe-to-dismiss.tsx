import { X } from 'lucide-react'
import { animate, motionValue, type AnimationPlaybackControls, type MotionValue } from 'motion/react'
import { useEffect, useRef, type CSSProperties, type MouseEvent, type PointerEvent, type RefObject } from 'react'
import { scaled } from '@/components/demo/playback'
import { snap, useCycle } from '@/components/demo/use-cycle'
import { usePrefersReducedMotion } from '@/components/demo/use-reduced-motion'
import { GlyphSvg } from '@/components/site/glyph'
import { defineTerm, type Control, type ControlValues, type DemoProps, type GlyphProps } from '@/lib/term-types'

const controls = [
  {
    id: 'threshold',
    type: 'select',
    label: 'Threshold',
    options: [
      { value: 'both', label: 'Distance or velocity' },
      { value: 'distance', label: 'Distance only' },
    ],
    default: 'both',
  },
  {
    id: 'release',
    type: 'select',
    label: 'Release',
    options: [
      { value: 'spring', label: 'Spring (house)' },
      { value: 'ease', label: 'Ease-out 200ms' },
    ],
    default: 'spring',
  },
] as const satisfies readonly Control[]

type V = ControlValues<typeof controls>
export type Sample = { t: number; x: number }
export type Side = -1 | 0 | 1

// The rule: past a third of the width, or flicked at 0.1px/ms (Emil: swipeAmount / timeTaken over 0.10), in the
// direction of the drag. The velocity is read over the last 100ms of movement, so a drag that stops before the
// release has none.
export const DISTANCE = 1 / 3
export const VELOCITY = 0.1
export const WINDOW_MS = 100
// The exit ends this far past the element's own width: clear of its container, with room for a shadow.
const EDGE = 16

/**
 * The two springs in physics form, from Motion's own conversion (as Spring's table), so the release velocity carries:
 * Motion 14 drops `velocity` on duration/bounce springs. The exit is a toast exit, 0.3 and bounce 0; the way back is
 * the house default, 0.5 and bounce 0. swipe-to-dismiss.test.ts holds both to the duration/bounce curves.
 */
export const EXIT_SPRING = { stiffness: 947, damping: 61.6, mass: 1 }
export const BACK_SPRING = { stiffness: 341, damping: 36.9, mass: 1 }
const EXIT_TEXT = '{ type: "spring", duration: 0.3, bounce: 0 }'
const BACK_TEXT = '{ type: "spring", duration: 0.5, bounce: 0 }'
// The mistake: a fixed curve that cannot take the release velocity.
const EASE_MS = 200
const EASE = { css: 'cubic-bezier(0.23, 1, 0.32, 1)', motion: '[0.23, 1, 0.32, 1]' }
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]
// The plain enter the toast comes back with (Enter and Exit).
const ENTER_MS = 200
const TRAVEL = 16

// The cycle: a beat, a slow drag to a quarter of the width and a release, a beat, a flick, and (when it leaves) a beat
// empty before the toast comes back and holds.
const REST_MS = 500
const DRAG_MS = 600
const DRAG_TO = 0.25
const SETTLE_MS = 700
const FLICK_MS = 80
const FLICK_TO = 0.2
const GAP_MS = 450
const EXIT_MS = 300
const HOLD_MS = 900
// After the visitor dismisses it, the toast comes back on its own so the gesture can be tried again.
const RETURN_MS = 800
const HINT = 'Drag the toast sideways, or flick it'

/** Velocity in px/ms over the samples of the last WINDOW_MS before `now`; 0 with fewer than two. */
export function velocityOf(samples: readonly Sample[], now: number): number {
  const recent = samples.filter((s) => s.t >= now - WINDOW_MS)
  if (recent.length < 2) return 0
  const first = recent[0]
  const last = recent[recent.length - 1]
  return last.t === first.t ? 0 : (last.x - first.x) / (last.t - first.t)
}

/** Where a release sends the element: off to one side (the sign), or back to rest (0). */
export function decide(x: number, v: number, width: number, threshold: V['threshold']): Side {
  const side = Math.sign(x) as Side
  if (Math.abs(x) >= width * DISTANCE) return side
  if (threshold === 'both' && Math.abs(v) >= VELOCITY && Math.sign(v) === side) return side
  return 0
}

type Drag = { pointerId: number; startX: number; base: number; samples: Sample[] }

// The wrapper carries the plain enter (and is hidden once dismissed): faded and --t below, or in place, over --d on
// --ease-out. The toast inside carries the drag's translateX, written by JS, so the two transforms never fight. Under
// reduced motion a visitor's dismissal drops the travel and the toast fades back in place; Play keeps its cycle.
const WRAP =
  'transition-[opacity,transform,visibility] duration-(--d) ease-(--ease-out) data-[state=closed]:invisible data-[state=closed]:opacity-0 data-[state=closed]:[transform:translateY(var(--t))] group-data-[snap=true]/stage:transition-none motion-reduce:group-data-[taken-over=true]/stage:[--t:0px]'

function Frame({ size, toastRef }: { size: DemoProps['size']; toastRef: RefObject<HTMLDivElement | null> }) {
  const detail = size === 'detail'
  return (
    <div
      data-swipe-frame=""
      // Focus comes here when the Dismiss button is used from the keyboard, so it does not fall to body.
      tabIndex={detail ? -1 : undefined}
      className={`relative w-full overflow-hidden rounded-lg bg-demo ${detail ? 'h-44 sm:h-56' : 'h-[112px]'}`}
    >
      {/* The page behind the toast. */}
      <div className={`absolute inset-x-0 top-0 flex flex-col ${detail ? 'gap-3 p-3' : 'gap-2 p-2'}`}>
        <span className={`h-1.5 w-1/2 rounded-full bg-demo-2`} />
        <span className="h-1.5 w-2/3 rounded-full bg-demo-2" />
        <span className="h-1.5 w-1/3 rounded-full bg-demo-2" />
      </div>
      {/* The toast spans the frame less its inset, as a toast spans a phone, so its own width plus a margin takes it
          clear of the frame. Resting in place: the still frame. */}
      <div data-swipe-wrap="" data-state="open" className={`${WRAP} absolute inset-x-0 mx-auto ${detail ? 'bottom-3 w-[calc(100%-24px)]' : 'bottom-2 w-[calc(100%-16px)]'}`}>
        <div
          ref={toastRef}
          data-swipe-toast=""
          data-dragging="false"
          // A horizontal drag is ours; a vertical swipe still scrolls the page (the browser then cancels the pointer).
          // No text selection or long-press menu mid-drag.
          className={`flex w-full items-center rounded-lg bg-surface shadow-card ${detail ? 'h-9 gap-2 px-3 touch-pan-y select-none [-webkit-touch-callout:none] cursor-grab data-[dragging=true]:cursor-grabbing' : 'h-6 gap-1.5 px-2'}`}
        >
          <span className={`shrink-0 rounded-full bg-demo-subject ${detail ? 'size-2' : 'size-1.5'}`} />
          <span className="h-1.5 w-2/5 rounded-full bg-demo-2" />
          {detail ? (
            <button
              type="button"
              data-swipe-dismiss=""
              aria-label="Dismiss toast"
              className="hit ml-auto inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-ink-muted transition-[color] duration-150 ease-[ease] hover:text-ink"
            >
              <X size={12} aria-hidden />
            </button>
          ) : (
            <span className="ml-auto inline-flex size-4 items-center justify-center text-ink-muted" aria-hidden>
              <X size={10} />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function SwipeToDismissDemo({ values, playing, replayKey, size, timeScale, onCycleEnd }: DemoProps<V>) {
  const rootRef = useRef<HTMLDivElement>(null)
  const toastRef = useRef<HTMLDivElement>(null)
  // One motion value, written straight to the toast's transform: nothing renders per frame.
  const x = useRef<MotionValue<number>>(null)
  const running = useRef<AnimationPlaybackControls | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  // Set when the visitor drags or dismisses the toast; the cycle then leaves the stage alone until a replay or a
  // control change. Pausing (off screen, hidden tab) and resuming keeps the visitor in charge.
  const taken = useRef(false)
  const takenIn = useRef('')
  const drag = useRef<Drag | null>(null)
  const hintRef = useRef<HTMLParagraphElement>(null)
  const reduced = usePrefersReducedMotion()
  const cycleKey = `${replayKey}|${values.threshold}|${values.release}`
  const detail = size === 'detail'

  const xOf = () => {
    if (!x.current) {
      x.current = motionValue(0)
      x.current.on('change', (v) => {
        if (toastRef.current) toastRef.current.style.transform = `translateX(${v}px)`
      })
    }
    return x.current
  }
  const wrapOf = () => rootRef.current?.querySelector<HTMLElement>('[data-swipe-wrap]') ?? null
  const widthOf = () => toastRef.current?.offsetWidth ?? 0
  const thirdOf = () => Math.round(widthOf() * DISTANCE)

  const setHint = (text: string) => {
    if (hintRef.current) hintRef.current.textContent = text
  }
  const announce = (text: string) => {
    const region = rootRef.current?.querySelector<HTMLElement>('[data-swipe-status]')
    if (region) region.textContent = text
  }

  const setTaken = (on: boolean) => {
    taken.current = on
    takenIn.current = on ? cycleKey : ''
    if (rootRef.current) rootRef.current.dataset.takenOver = String(on)
  }

  const stop = () => {
    running.current?.stop()
    running.current = null
  }

  // The toast comes back with a plain enter: from --t below at opacity 0 to its place over --d.
  const show = () => {
    const wrap = wrapOf()
    if (!wrap) return
    wrap.dataset.state = 'open'
    announce('')
    setHint(HINT)
  }

  // Off screen: hidden with transitions off and the drag reset, so the next show starts from the enter origin.
  const hide = () => {
    const root = rootRef.current
    const wrap = wrapOf()
    if (!root || !wrap) return
    snap(root, () => {
      wrap.dataset.state = 'closed'
      xOf().jump(0)
    })
  }

  // A release sends the toast off to one side on the exit spring, or back to rest on the house spring, from where it
  // is and at the speed it was going (`v` in px/ms). The fixed curve ignores the speed: that is the mistake it shows.
  // Slow motion stretches time: stiffness by timeScale², damping by timeScale, the velocity by timeScale. Under reduced
  // motion a visitor's release jumps to the end state.
  const settle = (target: number, kind: 'exit' | 'back', v: number) => {
    stop()
    const mv = xOf()
    const ts = Math.max(timeScale, 0.01)
    const done = kind === 'exit' ? hide : undefined
    if (reduced && taken.current) {
      mv.jump(target)
      done?.()
      return
    }
    if (values.release === 'ease') {
      running.current = animate(mv, target, { type: 'tween', duration: EASE_MS / 1000 / ts, ease: EASE_OUT, onComplete: done })
      return
    }
    const p = kind === 'exit' ? EXIT_SPRING : BACK_SPRING
    running.current = animate(mv, target, { type: 'spring', stiffness: p.stiffness * ts * ts, damping: p.damping * ts, mass: 1, velocity: v * 1000 * ts, onComplete: done })
  }

  const release = (side: Side, v: number) => {
    if (side === 0) settle(0, 'back', v)
    else settle(side * (widthOf() + EDGE), 'exit', v)
  }

  // One cycle: a slow drag to a quarter of the width that is let go and springs back; a flick that leaves (or, with
  // distance only, springs back); a beat empty; the toast comes back and holds. It ends in place, so the still frame,
  // the card loop and a replay all start from a resting toast.
  useCycle(
    () => {
      const root = rootRef.current
      const ts = Math.max(timeScale, 0.01)
      const releaseAt = REST_MS + DRAG_MS
      const flickAt = releaseAt + SETTLE_MS
      const flickReleaseAt = flickAt + FLICK_MS
      // The flick's speed as the finger would have it, unscaled: the decision does not change in slow motion.
      const flickV = (FLICK_TO * widthOf()) / FLICK_MS
      const leaves = decide(FLICK_TO * widthOf(), flickV, widthOf(), values.threshold) !== 0
      const backAt = flickReleaseAt + EXIT_MS + GAP_MS
      const finger = (to: number, ms: number, ease: 'easeInOut' | 'linear') => {
        if (taken.current) return
        stop()
        running.current = animate(xOf(), to, { type: 'tween', duration: ms / 1000 / ts, ease })
      }
      const letGo = (v: number) => {
        if (taken.current) return
        release(decide(xOf().get(), v, widthOf(), values.threshold), v)
      }
      return {
        steps: [
          [
            0,
            () => {
              if (taken.current && takenIn.current === cycleKey) return
              setTaken(false)
              clearTimeout(timer.current)
              stop()
              if (root) snap(root, () => show())
              xOf().jump(0)
            },
          ],
          [REST_MS, () => finger(DRAG_TO * widthOf(), DRAG_MS, 'easeInOut')],
          [releaseAt, () => letGo(0)],
          [flickAt, () => finger(FLICK_TO * widthOf(), FLICK_MS, 'linear')],
          [flickReleaseAt, () => letGo(flickV)],
          ...(leaves
            ? [
                [
                  backAt,
                  () => {
                    if (!taken.current) show()
                  },
                ] as const,
              ]
            : []),
        ],
        endMs: leaves ? backAt + ENTER_MS + HOLD_MS : flickReleaseAt + SETTLE_MS + HOLD_MS,
        // The still frame honours a gesture made in this cycle; a new cycle (replay, control change) takes the stage back.
        still: () => {
          if (!root || (taken.current && takenIn.current === cycleKey)) return
          setTaken(false)
          clearTimeout(timer.current)
          stop()
          snap(root, () => show())
          xOf().jump(0)
        },
      }
    },
    { playing, replayKey, timeScale, onCycleEnd },
    `${values.threshold}|${values.release}`,
  )

  useEffect(
    () => () => {
      stop()
      clearTimeout(timer.current)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // The first gesture ends the cycle; the stage then rests as the visitor leaves it, except that a dismissed toast
  // comes back after a beat so the gesture can be tried again.
  const takeOver = () => {
    if (!taken.current) setTaken(true)
    clearTimeout(timer.current)
  }

  const dismissed = (text: string) => {
    announce('Dismissed')
    setHint(text)
    timer.current = setTimeout(show, scaled(RETURN_MS, timeScale))
  }

  // The drag starts on the toast body, not on its Dismiss button, and picks the toast up from wherever it is, even
  // mid-spring. The capture keeps the moves and the release on the toast wherever the pointer goes.
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    const toast = target.closest<HTMLElement>('[data-swipe-toast]')
    if (!detail || !toast || !e.isPrimary || e.button !== 0 || drag.current || target.closest('[data-swipe-dismiss]')) return
    if (wrapOf()?.dataset.state !== 'open') return
    toast.setPointerCapture(e.pointerId)
    takeOver()
    stop()
    const base = xOf().get()
    drag.current = { pointerId: e.pointerId, startX: e.clientX, base, samples: [{ t: performance.now(), x: base }] }
    toast.dataset.dragging = 'true'
  }

  // 1:1 with the pointer: the transform is written on every move, and the (time, x) pairs feed the release velocity.
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || e.pointerId !== d.pointerId) return
    const px = d.base + e.clientX - d.startX
    xOf().set(px)
    const now = performance.now()
    d.samples.push({ t: now, x: px })
    if (d.samples.length > 60) d.samples.splice(0, d.samples.length - 30)
    const v = velocityOf(d.samples, now)
    setHint(`${Math.round(Math.abs(px))} of ${thirdOf()}px · ${Math.abs(v).toFixed(2)} px/ms`)
  }

  // pointerup, pointercancel (a touch that became a scroll), or the capture lost: whichever comes first is the release.
  const onPointerRelease = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || e.pointerId !== d.pointerId) return
    drag.current = null
    if (toastRef.current) toastRef.current.dataset.dragging = 'false'
    const now = performance.now()
    const px = xOf().get()
    const v = velocityOf(d.samples, now)
    const side = decide(px, v, widthOf(), values.threshold)
    const fast = Math.abs(v) >= VELOCITY && Math.sign(v) === Math.sign(px)
    const far = Math.abs(px) >= widthOf() * DISTANCE
    if (side === 0) setHint(fast && values.threshold === 'distance' ? `${Math.abs(v).toFixed(2)} px/ms, ${Math.round(Math.abs(px))}px: distance only, back` : `${Math.round(Math.abs(px))} of ${thirdOf()}px, ${Math.abs(v).toFixed(2)} px/ms: back`)
    else dismissed(far ? `${Math.round(Math.abs(px))}px, past a third: gone` : `${Math.abs(v).toFixed(2)} px/ms, a flick: gone`)
    release(side, v)
  }

  // The Dismiss button is the gesture's keyboard and pointer alternative: the same exit, to the right, with no speed.
  // Focus inside the toast moves to the frame first, so a keyboard Dismiss does not drop it on body.
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (!detail || !target.closest('[data-swipe-dismiss]') || wrapOf()?.dataset.state !== 'open') return
    const toast = toastRef.current
    if (toast?.contains(document.activeElement)) rootRef.current?.querySelector<HTMLElement>('[data-swipe-frame]')?.focus({ preventScroll: true })
    takeOver()
    dismissed('Dismiss button: gone')
    release(1, 0)
  }

  const vars = { '--d': `${scaled(ENTER_MS, timeScale)}ms`, '--t': `${TRAVEL}px` } as CSSProperties
  const text = detail ? 'text-[11px]' : 'text-[10px]'
  return (
    <div
      ref={rootRef}
      style={vars}
      data-taken-over="false"
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerRelease}
      onPointerCancel={onPointerRelease}
      onLostPointerCapture={onPointerRelease}
      onContextMenu={(e) => {
        if (drag.current) e.preventDefault()
      }}
      className={`group/stage flex h-full flex-col items-center justify-center ${detail ? 'gap-3 px-4' : 'gap-2 px-3'}`}
    >
      <div className={`flex w-full flex-col ${detail ? 'max-w-[400px] gap-2' : 'max-w-[220px] gap-1.5'}`}>
        <Frame size={size} toastRef={toastRef} />
        {/* The rule's numbers: when a release dismisses, and what carries it. On the card they sit above the frame,
            clear of the play button that reduced motion adds. */}
        <div className={`flex justify-between font-mono tabular-nums text-ink-muted ${detail ? text : `order-first ${text}`}`}>
          <span data-threshold-label="">{values.threshold === 'both' ? `width/3 or ${VELOCITY}px/ms` : 'width/3 only'}</span>
          <span data-release-label="">{values.release === 'spring' ? 'spring' : `ease-out ${EASE_MS}ms`}</span>
        </div>
      </div>
      {detail && (
        <>
          <p ref={hintRef} aria-hidden className="font-mono text-[11px] tabular-nums text-ink-muted">
            {HINT}
          </p>
          <span role="status" data-swipe-status="" className="sr-only" />
        </>
      )}
    </div>
  )
}

function SwipeToDismissGlyph({ active }: GlyphProps) {
  return (
    <GlyphSvg kind="swipe-to-dismiss" active={active} clipped>
      <rect x="3" y="3.2" width="6" height="1" rx=".5" fill="currentColor" opacity=".35" />
      <rect x="3" y="5.2" width="4" height="1" rx=".5" fill="currentColor" opacity=".35" />
      <rect className="m" x="2.6" y="7.4" width="6.8" height="1.6" rx=".8" fill="currentColor" />
    </GlyphSvg>
  )
}

const physicsText = (p: typeof EXIT_SPRING) => `{ stiffness: ${p.stiffness}, damping: ${p.damping}, mass: 1 }`

// The prompt's spring text: duration and bounce to design by, physics (mass 1, Motion's default) to ship.
const springText = (text: string) => text.replace('{ type: "spring", ', '{ ')
const shipText = (p: typeof EXIT_SPRING) => `{ stiffness: ${p.stiffness}, damping: ${p.damping} }`

function thresholdLine(v: V): string {
  if (v.threshold === 'both') {
    return `- Threshold: \`|x| ≥ width / 3\`, or \`|v| ≥ ${VELOCITY}px/ms\` (${VELOCITY * 1000}px/s) signed like \`x\`, leaves toward the sign of \`x\`; else back.`
  }
  return `- Threshold, distance only: \`|x| ≥ width / 3\` leaves toward the sign of \`x\`; else back (the mistake; the house also leaves on \`|v| ≥ ${VELOCITY}px/ms\` signed like \`x\`).`
}

function releaseLine(v: V): string {
  if (v.release === 'spring') {
    return `- Exit: to \`±(width + ${EDGE}px)\`, spring \`${springText(EXIT_TEXT)}\` out, \`${springText(BACK_TEXT)}\` back. Ship them as physics, \`${shipText(EXIT_SPRING)}\` and \`${shipText(BACK_SPRING)}\`, plus \`velocity\` (px/s; Motion 14 drops it on duration/bounce springs); remove after the exit.`
  }
  return `- Exit: to \`±(width + ${EDGE}px)\`, and back to 0, both a ${EASE_MS}ms \`var(--ease-out)\` tween; the release velocity is thrown away (the mistake; the house ships springs plus \`velocity\` in px/s: \`${shipText(EXIT_SPRING)}\` out, \`${shipText(BACK_SPRING)}\` back); remove after the exit.`
}

function routeLines(v: V): string[] {
  const spring = v.release === 'spring'
  const call = spring ? '`animate(x, target, { ...spring, velocity: v * 1000 })`' : `\`animate(x, target, { duration: ${EASE_MS / 1000}, ease: ${EASE.motion} })\``
  return [
    `- JS route (\`motion\`'s \`animate\` and \`motionValue\`; \`x.on("change")\` writes \`translateX\`): \`pointerdown\` (not on Dismiss): \`setPointerCapture\`; \`pointermove\`: \`x.set(dx)\`, log \`(t, x)\`; \`pointerup\`, \`pointercancel\`, \`lostpointercapture\`: \`v\` = Δx / Δt over the last ${WINDOW_MS}ms (0 under two), then ${call}.`,
    `- Motion route: \`useMotionValue(0)\`; \`<motion.div drag="x" dragMomentum={false} style={{ x, touchAction: "pan-y" }} onDragEnd>\`; decide on \`info.offset.x\` and \`info.velocity.x\` (px/s), same \`animate\`, \`onDismiss()\` in \`onComplete\`.`,
  ]
}

function jsCode(v: V): string {
  const spring = v.release === 'spring'
  return [
    "import { animate, motionValue } from 'motion'",
    '',
    `// Markup: <div class="toast">…<button class="dismiss">Dismiss</button></div>,`,
    '// shown by <button class="show-toast">. The toast spans its container less an',
    '// inset, so its own width plus a margin takes it clear. No CSS transition on',
    '// .toast: the transform is written here.',
    `const DISTANCE = 1 / 3 // of the width`,
    ...(v.threshold === 'both' ? [`const VELOCITY = ${VELOCITY} // px/ms, Emil's swipeAmount / timeTaken over 0.10`] : ['// Distance only: a flick that stops short goes back. The house also leaves on', `// a velocity of ${VELOCITY}px/ms in the direction of the drag.`]),
    `const WINDOW = ${WINDOW_MS} // ms of movement the velocity is read over`,
    `const EDGE = ${EDGE} // px past the width, so a shadow clears too`,
    ...(spring
      ? [
          `// ${EXIT_TEXT} and ${BACK_TEXT} as physics: the same`,
          '// curves, and they take the release velocity, which Motion 14 drops on',
          '// duration/bounce springs.',
          `const exit = { type: 'spring', ...${physicsText(EXIT_SPRING)} } as const`,
          `const back = { type: 'spring', ...${physicsText(BACK_SPRING)} } as const`,
        ]
      : [
          `// The mistake: a fixed ${EASE_MS}ms curve cannot take the release velocity, so a`,
          '// flick and a slow drag leave the same way. The house ships springs:',
          `// exit { type: 'spring', ...${physicsText(EXIT_SPRING)} }, back { type: 'spring', ...${physicsText(BACK_SPRING)} }.`,
          `const tween = { duration: ${EASE_MS / 1000}, ease: ${EASE.motion} } as const`,
        ]),
    "const reduced = matchMedia('(prefers-reduced-motion: reduce)')",
    '',
    "const toast = document.querySelector('.toast')",
    "const opener = document.querySelector('.show-toast')",
    '// A number Motion can animate from; its change handler writes the transform.',
    'const x = motionValue(0)',
    "x.on('change', (v) => (toast.style.transform = `translateX(${v}px)`))",
    'let drag = null // { pointerId, startX, base, samples: [{ t, x }] }',
    '',
    "toast.addEventListener('pointerdown', (e) => {",
    "  if (!e.isPrimary || e.button !== 0 || drag || e.target.closest('.dismiss')) return",
    '  toast.setPointerCapture(e.pointerId) // moves and the release stay ours',
    '  x.stop() // picked up mid-spring, it comes from where it is',
    '  drag = { pointerId: e.pointerId, startX: e.clientX, base: x.get(), samples: [] }',
    '})',
    '',
    "toast.addEventListener('pointermove', (e) => {",
    '  if (!drag || e.pointerId !== drag.pointerId) return',
    '  const px = drag.base + e.clientX - drag.startX // 1:1 with the pointer',
    '  x.set(px)',
    '  drag.samples.push({ t: performance.now(), x: px })',
    '})',
    '',
    '// Velocity in px/ms over the last WINDOW ms of movement; a drag that stopped',
    '// before the release has none.',
    'function velocityOf(samples, now) {',
    '  const recent = samples.filter((s) => s.t >= now - WINDOW)',
    '  if (recent.length < 2) return 0',
    '  const a = recent[0]',
    '  const b = recent[recent.length - 1]',
    '  return b.t === a.t ? 0 : (b.x - a.x) / (b.t - a.t)',
    '}',
    '',
    '// Past a third of the width, or flicked faster than VELOCITY in the direction of',
    '// the drag: off toward the sign of x. Otherwise back.',
    'function leave(px, v, width) {',
    '  const side = Math.sign(px)',
    ...(v.threshold === 'both'
      ? ['  const fast = Math.abs(v) >= VELOCITY && Math.sign(v) === side', '  return Math.abs(px) >= width * DISTANCE || fast ? side : 0']
      : ['  return Math.abs(px) >= width * DISTANCE ? side : 0']),
    '}',
    '',
    'function release(side, v) {',
    '  const target = side * (toast.offsetWidth + EDGE)',
    '  const onComplete = () => side && toast.remove()',
    '  // Reduced motion: the drag followed the pointer; the release jumps to the end.',
    '  if (reduced.matches) {',
    '    x.jump(target)',
    '    return onComplete()',
    '  }',
    ...(spring
      ? ['  // Motion wants units per second; v is px/ms.', '  animate(x, target, { ...(side ? exit : back), velocity: v * 1000, onComplete })']
      : ['  animate(x, target, { ...tween, onComplete })']),
    '}',
    '',
    'const end = (e) => {',
    '  if (!drag || e.pointerId !== drag.pointerId) return',
    '  const { samples } = drag',
    '  drag = null',
    '  const v = velocityOf(samples, performance.now())',
    '  release(leave(x.get(), v, toast.offsetWidth), v)',
    '}',
    "for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) toast.addEventListener(type, end)",
    '',
    '// The non-gesture way out: the same exit, to the right, with no speed. Focus',
    '// inside the toast goes back to the opener first, or it drops to body.',
    "toast.querySelector('.dismiss').addEventListener('click', () => {",
    '  if (toast.contains(document.activeElement)) opener.focus({ preventScroll: true })',
    '  release(1, 0)',
    '})',
  ].join('\n')
}

function motionCode(v: V): string {
  const spring = v.release === 'spring'
  return [
    "import { animate, motion, useMotionValue, useReducedMotion, type PanInfo } from 'motion/react'",
    "import { useRef, type ReactNode, type RefObject } from 'react'",
    '',
    'const DISTANCE = 1 / 3 // of the width',
    ...(v.threshold === 'both' ? [`const VELOCITY = ${VELOCITY * 1000} // px/s (${VELOCITY}px/ms), Emil's swipeAmount / timeTaken over 0.10`] : ['// Distance only: a flick that stops short goes back. The house also leaves on', `// a velocity of ${VELOCITY * 1000}px/s in the direction of the drag.`]),
    `const EDGE = ${EDGE} // px past the width, so a shadow clears too`,
    ...(spring
      ? [
          `// ${EXIT_TEXT} and ${BACK_TEXT} as physics: the same`,
          '// curves, and they take the release velocity, which Motion 14 drops on',
          '// duration/bounce springs.',
          `const exit = { type: 'spring', ...${physicsText(EXIT_SPRING)} } as const`,
          `const back = { type: 'spring', ...${physicsText(BACK_SPRING)} } as const`,
        ]
      : [
          `// The mistake: a fixed ${EASE_MS}ms curve cannot take the release velocity, so a`,
          '// flick and a slow drag leave the same way. The house ships springs:',
          `// exit { type: 'spring', ...${physicsText(EXIT_SPRING)} }, back { type: 'spring', ...${physicsText(BACK_SPRING)} }.`,
          `const tween = { duration: ${EASE_MS / 1000}, ease: ${EASE.motion} } as const`,
        ]),
    '// The toast spans its container (a flex column, or give it margin-inline: auto)',
    '// less an inset, so its own width plus a margin takes it clear. A vertical',
    '// swipe still scrolls the page.',
    "const box = { position: 'relative', inlineSize: 'calc(100% - 24px)', touchAction: 'pan-y', userSelect: 'none' } as const",
    '',
    'type Props = { onDismiss: () => void; opener: RefObject<HTMLElement | null>; children: ReactNode }',
    '',
    'export function Toast({ onDismiss, opener, children }: Props) {',
    '  const ref = useRef<HTMLDivElement>(null)',
    '  const x = useMotionValue(0)',
    '  const reduced = useReducedMotion()',
    '',
    '  // Off toward the sign of x, or back to 0, from where it is and at the speed it',
    '  // was going. Under reduced motion the release jumps to the end.',
    '  const release = (side: number, velocity: number) => {',
    '    const target = side * ((ref.current?.offsetWidth ?? 0) + EDGE)',
    '    const onComplete = () => side && onDismiss()',
    '    if (reduced) {',
    '      x.jump(target)',
    '      return onComplete()',
    '    }',
    spring ? '    animate(x, target, { ...(side ? exit : back), velocity, onComplete })' : '    animate(x, target, { ...tween, onComplete })',
    '  }',
    '',
    '  // Past a third of the width, or flicked faster than VELOCITY in the direction of',
    '  // the drag. info.velocity.x is px/s.',
    '  const onDragEnd = (_: unknown, info: PanInfo) => {',
    '    const width = ref.current?.offsetWidth ?? 0',
    '    const side = Math.sign(info.offset.x)',
    ...(v.threshold === 'both'
      ? ['    const fast = Math.abs(info.velocity.x) >= VELOCITY && Math.sign(info.velocity.x) === side', '    release(Math.abs(info.offset.x) >= width * DISTANCE || fast ? side : 0, info.velocity.x)']
      : ['    release(Math.abs(info.offset.x) >= width * DISTANCE ? side : 0, info.velocity.x)']),
    '  }',
    '',
    '  return (',
    '    // drag="x" follows the pointer 1:1; dragMomentum={false} leaves the release to',
    '    // us, so one spring (not an inertia animation) carries the velocity.',
    '    <motion.div ref={ref} className="toast" style={{ ...box, x }} drag="x" dragMomentum={false} onDragEnd={onDragEnd}>',
    '      {children}',
    '      {/* The non-gesture way out: the same exit, to the right, with no speed. Focus',
    '          goes back to the opener first, or it drops to body. */}',
    '      <button',
    '        type="button"',
    '        onClick={() => {',
    '          opener.current?.focus({ preventScroll: true })',
    '          release(1, 0)',
    '        }}',
    '      >',
    '        Dismiss',
    '      </button>',
    '    </motion.div>',
    '  )',
    '}',
  ].join('\n')
}

export default defineTerm({
  slug: 'swipe-to-dismiss',
  name: 'Swipe to Dismiss',
  category: 'gestures',
  order: 3,
  status: 'review',
  definition: 'Dragging an element off screen closes it, and a quick flick counts as much as a long drag.',
  aliases: ['swipe away', 'drag to dismiss', 'flick to dismiss', 'swipe gesture', 'swipeable toast', 'swipe to delete'],
  description:
    'A swipeable element follows the finger 1:1 while it is dragged: a transform written on every move, with no transition to lag behind it. The release decides. Past about a third of its width, or flicked faster than about 0.1px/ms in the direction of the drag, it leaves in that direction on a spring that carries the release velocity; otherwise it springs back to rest. A quick flick counts as much as a long drag, which is what makes the gesture feel like throwing something away instead of filing it. A full off-screen slide is right here, because where it went is the information. And there is always a way to dismiss without the gesture.',
  useWhen: [
    'Toasts and notifications, where a swipe is already what people do on their phones.',
    'List rows, cards and chips that can be removed or archived, with an undo.',
    'Sheets and drawers dragged shut, where the same distance-or-velocity rule decides whether they close.',
  ],
  avoidWhen: [
    'Anything destructive without an undo: a flick is too easy to do by accident.',
    'Elements inside a horizontal scroller or carousel: the two gestures fight over the same axis.',
    'A drag that lags behind the finger (a transition on the dragged transform) or resists it: direct manipulation means 1:1.',
    'As the only way out. Keep a visible Dismiss control for the keyboard and for anyone who cannot swipe.',
  ],
  demo: {
    component: SwipeToDismissDemo,
    label:
      'A toast rests at the bottom of a page frame. It is dragged slowly to a quarter of its width and let go: it springs back. Then it is flicked a short way, fast: it flies off the side on a spring that keeps the speed of the flick, and after a beat a new toast enters and rests. Beside the frame, the rule: past a third of the width or 0.1 pixels per millisecond, on a spring. On the entry page the toast is real: drag it with a mouse or a finger and it follows 1:1, with the distance and speed read out under the frame; let go and it leaves or comes back; the Dismiss button on it does the same exit from the keyboard. With distance only, the flick springs back; with a fixed ease-out, the exit ignores the speed of the flick.',
    controls,
    glyph: SwipeToDismissGlyph,
  },
  prompt: (v) =>
    [
      'Let this toast be swiped away sideways.',
      '',
      '- Dragged, it follows the pointer 1:1 (`translateX` per move, no transition); `touch-action: pan-y`; pointer capture; `user-select: none`.',
      thresholdLine(v),
      releaseLine(v),
      ...routeLines(v),
      '- Visible Dismiss button on the toast (Enter, Space too) runs the exit to the right, `velocity: 0`; focus inside returns to the opener (`focus({ preventScroll: true })`); always-mounted `role="status"` region.',
      '- Reduced motion: the drag still follows the pointer; release by `x.jump(target)`, gone or at rest next frame (`matchMedia`; Motion: `useReducedMotion()`).',
    ].join('\n'),
  acceptance: (v) => {
    const spring = v.release === 'spring'
    return [
      'The toast has no CSS transition on `transform` (computed `transition-duration` is `0s`), and while dragged its `translateX` equals the pointer\'s `clientX` minus its value at `pointerdown`, ±0.5px, on every move; `touch-action` computes to `pan-y`.',
      'Released from a third of its width (±0.5px) or further, with no movement in the last 100ms, it leaves toward the side it was dragged to; released short of a third with no movement, it goes back to `x: 0`.',
      v.threshold === 'both'
        ? `A flick: released at a fifth of its width after moving at ${VELOCITY}px/ms or more in that direction over the last 100ms, it leaves; the same distance at under ${VELOCITY}px/ms goes back.`
        : `Distance only: released at a fifth of its width, it goes back however fast it moved, even ${VELOCITY}px/ms or more (the house would leave).`,
      spring
        ? `Leaving, sampled every frame from \`pointerup\`: \`x\` moves on from its release value in the release direction, every frame further than the one before, and the first frame's step is at least the release velocity times the frame length (±2px): the speed carries. It passes \`±width\` and settles within 0.5px of \`±(width + ${EDGE}px)\` by 300ms (±1 frame); it is then removed.`
        : `Leaving, sampled every frame from \`pointerup\`: \`x\` runs from its release value to \`±(width + ${EDGE}px)\` on \`${EASE.css}\` and is within 0.5px of it by ${EASE_MS}ms (±1 frame), whatever the release velocity; it is then removed.`,
      spring
        ? 'Going back from a release with no movement in the last 100ms, `x` never passes 0 (bounce 0) and is within 0.5px of 0 by 500ms (±1 frame) from `pointerup`; released while moving toward 0, it carries that speed and may pass 0 once.'
        : `Going back, \`x\` is within 0.5px of 0 by ${EASE_MS}ms (±1 frame) from \`pointerup\`.`,
      'Grabbed while it is going back, it stops where it is and follows the pointer again from there; released again, the rule applies from the new `x`.',
      'Enter or Space on the Dismiss button plays the exit to the right from `x: 0`, and focus lands on the opener, not on `body`.',
      'A vertical swipe that starts on the toast scrolls the page; the pointer is cancelled and the toast goes back to `x: 0`.',
      'With reduced motion on, the drag still follows the pointer, and after `pointerup` the next frame has the toast at `±(width + 16px)` (then removed) or at `x: 0`, with no in-between frames.',
    ]
  },
  code: (v) => ({ js: jsCode(v), motion: motionCode(v) }),
  a11y:
    'The gesture is never the only way out: keep a visible Dismiss button on the element, and let Enter and Space run the same exit. Keep the toast in an always-mounted `role="status"` region, so it is announced when it appears and nothing waits for the motion. If focus is inside when it is dismissed, move it back to where it was before (`focus({ preventScroll: true })`) so it does not fall to `body`. The drag follows the pointer under reduced motion too: it is direct manipulation, not an animation; only the release animation is replaced by a jump to the end state.',
  related: ['spring', 'enter-and-exit', 'drag-with-momentum', 'rubber-banding', 'interruptibility'],
  confusedWith: [
    {
      slug: 'drag-with-momentum',
      difference: 'Momentum keeps an element moving after release; a swipe decides whether it leaves.',
    },
  ],
  sources: [
    { label: 'Emil Kowalski: Building a Toast Component', url: 'https://emilkowal.ski/ui/building-a-toast-component' },
    { label: 'Sonner', url: 'https://sonner.emilkowal.ski/' },
    { label: 'Rauno Freiberg: Invisible Details of Interaction Design', url: 'https://rauno.me/craft/interaction-design' },
    { label: 'Motion: Drag', url: 'https://motion.dev/docs/react-drag' },
  ],
})
