import { animate, motionValue, spring, type AnimationPlaybackControls, type MotionValue } from 'motion/react'
import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react'
import { scaled } from '@/components/demo/playback'
import { useCycle } from '@/components/demo/use-cycle'
import { usePrefersReducedMotion } from '@/components/demo/use-reduced-motion'
import { GlyphSvg } from '@/components/site/glyph'
import { defineTerm, type Control, type ControlValues, type DemoProps, type GlyphProps } from '@/lib/term-types'

const controls = [
  {
    id: 'bounce',
    type: 'select',
    label: 'Bounce',
    options: [
      { value: '0', label: '0 (house)' },
      { value: '0.2', label: '0.2' },
      { value: '0.4', label: '0.4 (playful)' },
    ],
    default: '0',
  },
  {
    id: 'duration',
    type: 'select',
    label: 'Duration',
    options: [
      { value: '0.3', label: '0.3s' },
      { value: '0.5', label: '0.5s' },
      { value: '0.8', label: '0.8s' },
    ],
    default: '0.5',
  },
  {
    id: 'compare',
    type: 'select',
    label: 'Compare',
    options: [
      { value: 'none', label: 'None' },
      { value: 'ease-out', label: 'Ease-out' },
    ],
    default: 'none',
  },
] as const satisfies readonly Control[]

type V = ControlValues<typeof controls>
type Physics = { stiffness: number; damping: number; at40: number }

/**
 * Each duration/bounce spring as mass-1 physics, from Motion's own conversion (findSpring in motion-dom), rounded.
 * The two forms trace the same path (spring.test.ts holds them within 0.5% of the distance). Motion hands each new
 * animation the current velocity, but Motion 14 drops it on duration/bounce (and visualDuration) springs; the physics
 * form keeps it, so only the physics form turns smoothly when redirected.
 * `at40`: ms until the spring has covered 40% of the distance.
 */
export const PHYSICS: Record<V['duration'], Record<V['bounce'], Physics>> = {
  '0.3': {
    '0': { stiffness: 947, damping: 61.6, at40: 45 },
    '0.2': { stiffness: 899, damping: 48, at40: 42 },
    '0.4': { stiffness: 1353, damping: 44.1, at40: 32 },
  },
  '0.5': {
    '0': { stiffness: 341, damping: 36.9, at40: 75 },
    '0.2': { stiffness: 324, damping: 28.8, at40: 70 },
    '0.4': { stiffness: 487, damping: 26.5, at40: 53 },
  },
  '0.8': {
    '0': { stiffness: 133, damping: 23.1, at40: 120 },
    '0.2': { stiffness: 126, damping: 18, at40: 112 },
    '0.4': { stiffness: 190, damping: 16.6, at40: 84 },
  },
}
// How far past the target each bounce carries on an uninterrupted move, in percent of the distance.
export const OVERSHOOT: Record<V['bounce'], number> = { '0': 0, '0.2': 1.5, '0.4': 9.5 }
// The house ease-out, for the comparison twin only.
const TWIN_EASE: [number, number, number, number] = [0.23, 1, 0.32, 1]
// The distance the prompt and code use; the demo measures its own track.
const TRAVEL = 240
const POINTS = 25

const REST_MS = 400
const HOLD_MS = 600
// The demo sends the card back at 40% of the way, but never before this, so the short springs show an outbound leg.
const MIN_BACK_MS = 90
// A press let go this soon and this still is a click: the card goes out and is sent back on the timeline's beat.
const CLICK_MS = 150
const CLICK_PX = 4
const HINT = 'Hold the card, let go early'
const HINT_HELD = 'Release to send it back'

/** ms until the spring has covered `fraction` of the distance, from Motion's own generator. */
function timeTo(p: Physics, fraction: number): number {
  const gen = spring({ keyframes: [0, 1], stiffness: p.stiffness, damping: p.damping, mass: 1 })
  for (let t = 0; t < 2000; t++) if (gen.next(t).value >= fraction) return t
  return 2000
}

type Side = 'a' | 'b'
type Press = { pointerId: number; x: number; y: number; at: number }

/** The spring sampled into a CSS linear() easing over its duration, by Motion's own spring generator. */
function linearPoints(v: V): string[] {
  const ms = Number(v.duration) * 1000
  const gen = spring({ keyframes: [0, 1], duration: ms, bounce: Number(v.bounce) })
  return Array.from({ length: POINTS }, (_, i) => String(Math.round(gen.next((ms * i) / (POINTS - 1)).value * 1000) / 1000))
}

function Track({ size, label, twin }: { size: DemoProps['size']; label?: string; twin?: boolean }) {
  const detail = size === 'detail'
  const face = (
    <>
      <span className={`shrink-0 rounded-sm ${twin ? 'bg-demo-2' : 'bg-demo-subject'} ${detail ? 'size-3.5' : 'size-2.5'}`} />
      <span className="h-1.5 flex-1 rounded-full bg-demo-2" />
    </>
  )
  const box = detail ? 'h-12 w-[72px]' : 'h-8 w-12'
  const card = `relative flex items-center rounded-lg bg-surface shadow-card ${box} ${detail ? 'gap-2 px-2.5' : 'gap-1.5 px-1.5'}`
  // The two spots, drawn as empty slots under the card so the far end reads as a destination.
  const slot = `absolute rounded-lg border border-dashed border-line-strong ${box} ${detail ? 'top-1.5' : 'top-1'}`
  return (
    <div className="w-full" style={{ maxWidth: detail ? 420 : 216 }}>
      {label && <p className={`font-mono text-ink-muted ${detail ? 'mb-2 text-[11px]' : 'mb-1.5 text-[10px]'}`}>{label}</p>}
      <div data-track="" className={`relative rounded-xl bg-demo ${detail ? 'p-1.5' : 'p-1'}`}>
        <span aria-hidden className={`${slot} ${detail ? 'left-1.5' : 'left-1'}`} />
        <span aria-hidden className={`${slot} ${detail ? 'right-1.5' : 'right-1'}`} />
        {twin ? (
          <div data-twin-card="" data-side="a" className={card}>
            {face}
          </div>
        ) : detail ? (
          <button
            type="button"
            data-spring-card=""
            data-side="a"
            aria-pressed="false"
            aria-label="Spring card: press and hold to send it to the other end, release to send it back"
            // A hold must not scroll the page, select text or open the long-press menu.
            className={`${card} cursor-pointer touch-none select-none [-webkit-touch-callout:none]`}
          >
            {face}
          </button>
        ) : (
          <div data-spring-card="" data-side="a" className={card}>
            {face}
          </div>
        )}
      </div>
    </div>
  )
}

// The card's travel inside its track: the track's content width less the card.
function travel(card: HTMLElement): number {
  const track = card.parentElement
  if (!track) return 0
  const pad = parseFloat(getComputedStyle(track).paddingLeft)
  return track.clientWidth - 2 * pad - card.offsetWidth
}

function SpringDemo({ values, playing, replayKey, size, timeScale, onCycleEnd }: DemoProps<V>) {
  const rootRef = useRef<HTMLDivElement>(null)
  // One motion value per card node, written straight to its transform: nothing renders per frame.
  const positions = useRef(new WeakMap<HTMLElement, MotionValue<number>>())
  const running = useRef<AnimationPlaybackControls[]>([])
  // Set when the visitor presses the card; the timeline then leaves it alone until a replay or a control change.
  // Pausing (off screen, hidden tab) and resuming keeps the visitor in charge.
  const taken = useRef(false)
  const takenIn = useRef('')
  // Where the card rests between gestures: a hold sends it to the other side, the release brings it back here.
  // Enter and Space move it.
  const home = useRef<Side>('a')
  const press = useRef<Press | null>(null)
  const backTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const hintRef = useRef<HTMLParagraphElement>(null)
  const reduced = usePrefersReducedMotion()
  const cycleKey = `${replayKey}|${values.bounce}|${values.duration}|${values.compare}`
  const physics = PHYSICS[values.duration][values.bounce]
  const seconds = Number(values.duration)
  // When the timeline (and a plain click) sends the card back: at 40% of the way, never before 90ms, so the short
  // springs show an outbound leg, but always before 75% of the way, so the card is still mid-flight.
  const backMs = Math.min(Math.max(physics.at40, MIN_BACK_MS), timeTo(physics, 0.75))

  const setHeld = (pressed: Press | null) => {
    press.current = pressed
    if (hintRef.current) hintRef.current.textContent = pressed ? HINT_HELD : HINT
  }

  const setTaken = (on: boolean) => {
    taken.current = on
    takenIn.current = on ? cycleKey : ''
    if (rootRef.current) rootRef.current.dataset.takenOver = String(on)
    if (on) return
    clearTimeout(backTimer.current)
    setHeld(null)
    home.current = 'a'
  }

  const xOf = (card: HTMLElement) => {
    let x = positions.current.get(card)
    if (!x) {
      x = motionValue(0)
      x.on('change', (v) => (card.style.transform = `translateX(${v}px)`))
      positions.current.set(card, x)
    }
    return x
  }

  // A new animate() on a value replaces the running one from the current position. Motion hands it the current
  // velocity, and the physics spring keeps it (duration/bounce springs would drop it). The velocity is also passed
  // explicitly, so the handoff does not depend on when Motion samples it. The twin's curve starts over from where it is.
  // Slow motion stretches time: stiffness by timeScale², damping by timeScale; the measured velocity is already slowed.
  const send = (side: Side, instant = false) => {
    const root = rootRef.current
    if (!root) return
    const ts = Math.max(timeScale, 0.01)
    running.current = []
    for (const card of root.querySelectorAll<HTMLElement>('[data-spring-card], [data-twin-card]')) {
      card.dataset.side = side
      if (card.hasAttribute('aria-pressed')) card.setAttribute('aria-pressed', String(side === 'b'))
      const x = xOf(card)
      const to = side === 'b' ? travel(card) : 0
      if (instant) {
        x.jump(to)
        continue
      }
      running.current.push(
        'springCard' in card.dataset
          ? animate(x, to, { type: 'spring', stiffness: physics.stiffness * ts * ts, damping: physics.damping * ts, mass: 1, velocity: x.getVelocity() })
          : animate(x, to, { type: 'tween', duration: seconds / ts, ease: TWIN_EASE }),
      )
    }
  }

  // One cycle: home (a no-op unless a replay lands mid-move), a beat, off toward the far end, and sent back home
  // mid-flight. Both cards get each command at the same instant. The still frame is home.
  useCycle(
    () => {
      const go = (side: Side) => () => {
        if (!taken.current) send(side)
      }
      const backAt = REST_MS + backMs
      return {
        steps: [
          [
            0,
            () => {
              if (taken.current && takenIn.current === cycleKey) return
              setTaken(false)
              send('a')
            },
          ],
          [REST_MS, go('b')],
          [backAt, go('a')],
        ],
        endMs: backAt + seconds * 1000 + HOLD_MS,
        still: () => {
          if (taken.current) return
          running.current.forEach((a) => a.stop())
          send('a', true)
        },
      }
    },
    { playing, replayKey, timeScale, onCycleEnd },
    `${values.bounce}|${values.duration}|${values.compare}`,
  )

  // A card resting at the far end follows the track when the stage is resized.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let width = root.clientWidth
    const observer = new ResizeObserver(() => {
      if (root.clientWidth === width) return
      width = root.clientWidth
      root.querySelectorAll<HTMLElement>('[data-side="b"]').forEach((card) => xOf(card).jump(travel(card)))
    })
    observer.observe(root)
    return () => {
      observer.disconnect()
      running.current.forEach((a) => a.stop())
      clearTimeout(backTimer.current)
    }
  }, [])

  // Press and hold sends the card across on the spring; letting go at any moment sends it home from wherever it is,
  // carrying its speed. The visitor picks the moment by releasing, not by reacting to a fast move. The capture keeps
  // the release on the card after it has moved out from under the pointer. Reduced motion: it jumps both times.
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('[data-spring-card]')
    if (size !== 'detail' || !card || !e.isPrimary || e.button !== 0 || press.current) return
    card.setPointerCapture(e.pointerId)
    clearTimeout(backTimer.current)
    setTaken(true)
    setHeld({ pointerId: e.pointerId, x: e.clientX, y: e.clientY, at: performance.now() })
    send(home.current === 'a' ? 'b' : 'a', reduced)
  }

  // pointerup, pointercancel, or the capture lost: whichever comes first ends the hold.
  const onRelease = (e: PointerEvent<HTMLDivElement>) => {
    const pressed = press.current
    if (!pressed || e.pointerId !== pressed.pointerId) return
    setHeld(null)
    const heldMs = performance.now() - pressed.at
    const click = e.type === 'pointerup' && heldMs < CLICK_MS && Math.hypot(e.clientX - pressed.x, e.clientY - pressed.y) < CLICK_PX
    // A plain click plays the lesson by itself: the card is sent back on the timeline's beat, counted from the press.
    const wait = click && !reduced ? scaled(backMs, timeScale) - heldMs : 0
    if (wait > 0) backTimer.current = setTimeout(() => send(home.current), wait)
    else send(home.current, reduced)
  }

  // Pointer clicks are handled as presses above. A click from the keyboard (Enter or Space reports detail 0) moves
  // the card to the other end without animating, as the house rule says.
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('[data-spring-card]')
    if (size !== 'detail' || !card || e.detail !== 0 || press.current) return
    clearTimeout(backTimer.current)
    setTaken(true)
    home.current = home.current === 'a' ? 'b' : 'a'
    send(home.current, true)
  }

  const compare = values.compare === 'ease-out'
  const detail = size === 'detail'
  return (
    <div
      ref={rootRef}
      data-taken-over="false"
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
      onLostPointerCapture={onRelease}
      onContextMenu={(e) => {
        if (press.current) e.preventDefault()
      }}
      className={`flex h-full flex-col items-center justify-center px-4 ${detail ? 'gap-6' : 'gap-4'}`}
    >
      <Track size={size} label={compare ? 'spring' : undefined} />
      {compare && <Track size={size} label="ease-out" twin />}
      {detail && (
        <p ref={hintRef} aria-hidden className="font-mono text-[11px] text-ink-muted">
          {HINT}
        </p>
      )}
    </div>
  )
}

function SpringGlyph({ active }: GlyphProps) {
  return (
    <GlyphSvg kind="spring" active={active}>
      <rect x="2.5" y="5.6" width="7" height=".8" rx=".4" fill="currentColor" opacity=".3" />
      <circle className="m" cx="6" cy="6" r="1.5" fill="currentColor" />
    </GlyphSvg>
  )
}

const springText = (v: V) => `\`{ type: "spring", duration: ${v.duration}, bounce: ${v.bounce} }\``
const physicsText = (v: V) => {
  const p = PHYSICS[v.duration][v.bounce]
  return `\`{ type: "spring", stiffness: ${p.stiffness}, damping: ${p.damping}, mass: 1 }\``
}

function bounceLine(v: V): string {
  if (v.bounce === '0') return 'Bounce 0, the product UI default: never passes the target.'
  if (v.bounce === '0.2') return 'Bounce 0.2: about 1.5% past the target, once; product UI ships 0.'
  return 'Bounce 0.4: about 9.5% past the target, over the 0.3 cap.'
}

function cssCode(v: V): string {
  const ms = Number(v.duration) * 1000
  const points = linearPoints(v)
  const rows: string[] = []
  for (let i = 0; i < points.length; i += 9) rows.push(`    ${points.slice(i, i + 9).join(', ')}${i + 9 < points.length ? ',' : ''}`)
  return [
    `/* The spring { type: "spring", duration: ${v.duration}, bounce: ${v.bounce} }, sampled into`,
    '   linear() with Motion\'s spring() generator. CSS can only replay it as a',
    '   fixed curve and keeps no velocity: a transition reversed mid-move starts',
    '   the curve over toward the other end and flips direction at speed. Fine',
    '   for moves nothing interrupts; for anything the user can redirect, use',
    '   the JS or Motion tab. */',
    ':root {',
    '  --spring: linear(',
    ...rows,
    '  );',
    '}',
    '',
    '/* Markup: <button class="card" aria-pressed="false">…</button>. On click,',
    '   toggle data-side="b" and aria-pressed. */',
    '.card {',
    '  /* transform only: never left or margin, which relayout every frame. */',
    `  transition: transform ${ms}ms var(--spring);`,
    '}',
    '.card[data-side="b"] {',
    `  transform: translateX(${TRAVEL}px);`,
    '}',
    ...(v.compare === 'ease-out'
      ? [
          '',
          '/* Comparison only: the twin card on the house ease-out curve. Reversed',
          '   mid-move, it starts the curve again at full speed the other way. */',
          '.card.compare {',
          '  transition-timing-function: cubic-bezier(0.23, 1, 0.32, 1);',
          '}',
        ]
      : []),
    '',
    '/* A click from the keyboard jumps too: in the click handler, set data-instant',
    '   when event.detail === 0 (Enter or Space) and remove it otherwise. */',
    '.card[data-instant] {',
    '  transition: none;',
    '}',
    '',
    '/* Reduced motion: the card rests at its target at once, no travel. */',
    '@media (prefers-reduced-motion: reduce) {',
    '  .card {',
    '    transition: none;',
    '  }',
    '}',
  ].join('\n')
}

function jsCode(v: V): string {
  const p = PHYSICS[v.duration][v.bounce]
  return [
    "import { animate, motionValue } from 'motion'",
    '',
    `// { type: 'spring', duration: ${v.duration}, bounce: ${v.bounce} } as physics: the same path. Motion`,
    '// hands each new animation the current velocity, but Motion 14 drops it on',
    '// duration/bounce (and visualDuration) springs; the physics form keeps it.',
    `const spring = { type: 'spring', stiffness: ${p.stiffness}, damping: ${p.damping}, mass: 1 }`,
    "const reduced = matchMedia('(prefers-reduced-motion: reduce)')",
    '',
    "// Its own class, not the CSS tab's .card: a CSS transition on transform",
    '// would fight the transform written every frame.',
    "const card = document.querySelector('.spring-card')",
    '// A number Motion can measure velocity on. A transform string has none.',
    'const x = motionValue(0)',
    "x.on('change', (v) => (card.style.transform = `translateX(${v}px)`))",
    "let side = 'a'",
    '',
    "card.addEventListener('click', (event) => {",
    "  side = side === 'a' ? 'b' : 'a'",
    "  card.setAttribute('aria-pressed', String(side === 'b'))",
    `  const to = side === 'b' ? ${TRAVEL} : 0`,
    '  // Reduced motion, or a click from the keyboard (Enter or Space report',
    '  // detail 0): jump to the other spot.',
    '  if (reduced.matches || event.detail === 0) return x.jump(to)',
    '  // Retargets mid-move from the current position and velocity. The velocity',
    '  // is passed explicitly so the handoff does not depend on when Motion',
    '  // samples it. Never wait for the move to end.',
    '  animate(x, to, { ...spring, velocity: x.getVelocity() })',
    '})',
    ...(v.compare === 'ease-out'
      ? [
          '',
          '// Comparison only: the twin card on a fixed curve. A tween starts its curve',
          '// again from where it is, so reversed mid-move it turns at full speed:',
          `// animate(twinX, to, { duration: ${v.duration}, ease: [0.23, 1, 0.32, 1] })`,
        ]
      : []),
  ].join('\n')
}

function motionCode(v: V): string {
  const p = PHYSICS[v.duration][v.bounce]
  return [
    "import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react'",
    "import { useState, type MouseEvent } from 'react'",
    '',
    `// { type: 'spring', duration: ${v.duration}, bounce: ${v.bounce} } as physics: the same path. Motion`,
    '// hands each new animation the current velocity, but Motion 14 drops it on',
    '// duration/bounce (and visualDuration) springs; the physics form keeps it.',
    `// For a one-shot move nothing interrupts, transition={{ type: 'spring',`,
    `// duration: ${v.duration}, bounce: ${v.bounce} }} on a motion.div works as written.`,
    `const spring = { type: 'spring', stiffness: ${p.stiffness}, damping: ${p.damping}, mass: 1 } as const`,
    ...(v.compare === 'ease-out'
      ? [
          '',
          `// Comparison only: the twin card uses { duration: ${v.duration}, ease: [0.23, 1, 0.32, 1] }.`,
          '// A tween starts its curve again from where it is: reversed mid-move, it',
          '// turns at full speed.',
        ]
      : []),
    '',
    'export function SpringCard() {',
    '  const [on, setOn] = useState(false)',
    '  const reduced = useReducedMotion()',
    '  // A number Motion can measure velocity on. A transform string has none.',
    '  const x = useMotionValue(0)',
    '',
    '  const toggle = (event: MouseEvent) => {',
    '    const to = on ? 0 : ' + TRAVEL,
    '    setOn(!on)',
    '    // Reduced motion, or a click from the keyboard (Enter or Space report',
    '    // detail 0): jump to the other spot.',
    '    if (reduced || event.detail === 0) return x.jump(to)',
    '    // Retargets mid-move from the current position and velocity. The velocity',
    '    // is passed explicitly so the handoff does not depend on when Motion',
    '    // samples it. Never wait for the move to end.',
    '    animate(x, to, { ...spring, velocity: x.getVelocity() })',
    '  }',
    '',
    '  return (',
    '    <motion.button',
    '      type="button"',
    "      // Its own class, not the CSS tab's .card: a CSS transition on transform",
    '      // would fight the transform Motion writes every frame.',
    '      className="spring-card"',
    '      aria-pressed={on}',
    '      onClick={toggle}',
    '      style={{ x }}',
    '    />',
    '  )',
    '}',
  ].join('\n')
}

export default defineTerm({
  slug: 'spring',
  name: 'Spring',
  category: 'motion',
  order: 3,
  status: 'review',
  definition: 'Motion driven by physics instead of a fixed duration, so it can carry velocity and settle naturally.',
  aliases: ['physics-based animation', 'springy motion', 'bouncy', 'it bounces a bit', 'spring physics', 'stiffness and damping'],
  description:
    'A spring moves an element the way a weight on a spring would, instead of following a curve over a set time. It always knows its own velocity, so a new target mid-move picks up from where the element is and how fast it is going: it slows, turns and settles, where a curve would drop its speed and snap into reverse, or stop and start over. Duration and bounce are the easy way to reason about it: duration is roughly how long it takes to settle, and bounce 0 settles without passing the target, the default for product UI. Design it in duration and bounce; when it can be redirected, ship the matching stiffness and damping, because Motion 14 drops velocity on duration/bounce springs.',
  useWhen: [
    'Gesture-driven motion: sheets, swipe to dismiss, a drag released with momentum.',
    'Anything the user can interrupt or reverse mid-move, like a toggle clicked twice quickly.',
    'Things meant to feel physical, like a knob, a card that settles into a slot or a Dynamic Island-style morph.',
  ],
  avoidWhen: [
    'Dialogs, menus and icon swaps: use bounce 0 or an ease-out curve. Bounce belongs on marketing and decorative moments.',
    'Bounce above 0.3, anywhere. Product UI ships bounce 0.',
    'Changes triggered from the keyboard. Do not animate them.',
    'Moves with a set rhythm, like a progress bar or a marquee. Use a curve or linear.',
  ],
  demo: {
    component: SpringDemo,
    label:
      'A card sits at the left end of a track. It springs toward the right end and, partway there, is sent back: it keeps its speed for a moment, slows, turns and settles at the start without stopping dead. On the entry page, holding the card sends it toward the other end, and letting go at any moment sends it back from wherever it is. With a comparison picked, a twin card below makes the same moves on a fixed ease-out curve and reverses at full speed.',
    controls,
    glyph: SpringGlyph,
  },
  prompt: (v) => {
    const ms = Number(v.duration) * 1000
    return [
      'Animate this card between two spots with a spring.',
      '',
      `- Setup: the card is a \`<button type="button">\`; each click toggles it between A (\`x: 0\`) and B (\`x: ${TRAVEL}px\`) and sets \`aria-pressed\`. Mid-move it retargets from where it is; never restart or queue.`,
      `- Spring: ${springText(v)}, settled by ${ms}ms. ${bounceLine(v)}`,
      `- Motion route (no curve, no \`transition-duration\`): \`const x = useMotionValue(0)\`, \`style={{ x }}\`; each click \`animate(x, target, { ...spring, velocity: x.getVelocity() })\`, \`spring\` = ${physicsText(v)}. Motion hands each new animation the current velocity, but Motion 14 drops it on \`duration\`/\`bounce\` (and \`visualDuration\`) springs; the physics form keeps it. \`transform\` strings have no velocity.`,
      `- One-shots (entrances): \`animate={{ transform: "translateX(${TRAVEL}px)" }}\` with the duration/bounce form runs on the compositor.`,
      '- `transform` only; never `left` or `margin`.',
      `- CSS route: \`transition: transform ${ms}ms linear(…)\`, at least 20 points sampled from the spring. No velocity: reversed mid-move it flips direction at speed.`,
      ...(v.compare === 'ease-out'
        ? [`- Comparison only: a twin card below on \`cubic-bezier(0.23, 1, 0.32, 1)\` (ease-out), ${ms}ms, same instants.`]
        : []),
      '- Reduced motion, or a keyboard click (`event.detail === 0`): the card is at its target next frame, no travel. Motion: `x.jump(target)`; CSS: `transition: none`. Entrances fade in at their end spot over 150ms instead.',
    ].join('\n')
  },
  acceptance: (v) => {
    const ms = Number(v.duration) * 1000
    const over = OVERSHOOT[v.bounce]
    return [
      'Motion route: the card has no CSS transition on `transform` (computed `transition-duration` is `0s`).',
      `All routes: left alone, a move is settled by ${ms}ms (±1 frame): from then on \`x\` stays within 0.5px of the spot.`,
      v.bounce === '0'
        ? `All routes: sampled every frame, \`x\` never passes the target: at most ${TRAVEL}.5px on the way to B, at least -0.5px on the way to A.`
        : `All routes: sampled every frame, \`x\` passes the target once by about ${over}% of the distance (${Math.round((TRAVEL * over) / 100)}px of ${TRAVEL}px)${v.bounce === '0.2' ? ', under 5%,' : ''} then settles.`,
      'Motion route: after a mid-flight click, the next frame still moves toward the old target by less than the frame before; it then turns once and never reverses within a single frame.',
      'Motion route: five clicks within a second never jump and never queue; each click retargets at once from where the card is.',
      'CSS route: clicked mid-move, the card heads for the other spot from where it is, with no jump in position; it reverses at speed, since CSS keeps no velocity.',
      'All routes: only `transform` changes; the card\'s `offsetLeft` stays the same throughout.',
      ...(v.compare === 'ease-out'
        ? [`The comparison card moves at the same instants on \`cubic-bezier(0.23, 1, 0.32, 1)\` over ${ms}ms, and clicked mid-move it reverses within one frame (comparison only).`]
        : []),
      'All routes: with reduced motion on, or activated with Enter or Space, the card is painted at its target in the first frame after the event, with no in-between positions.',
    ]
  },
  code: (v) => ({ css: cssCode(v), js: jsCode(v), motion: motionCode(v) }),
  a11y: 'Make the moving card a real `<button>` and keep its state in `aria-pressed`, updated on click rather than when the motion settles, so assistive tech never waits for the spring. Do not animate changes made from the keyboard. Under reduced motion, skip the travel and put the element in its new place at once; for something entering, a 150ms opacity fade is enough.',
  related: ['ease-out', 'interruptibility', 'drag-with-momentum', 'overshoot'],
  confusedWith: [
    {
      slug: 'overshoot',
      difference: 'A spring is the physics; overshoot is one thing a spring (or a back curve) can do. A spring with bounce 0 never overshoots.',
    },
  ],
  sources: [
    { label: 'Emil Kowalski: Great Animations', url: 'https://emilkowal.ski/ui/great-animations' },
    { label: 'Motion: spring', url: 'https://motion.dev/docs/spring' },
  ],
})
