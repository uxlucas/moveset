import { useRef, type CSSProperties, type FocusEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { scaled } from '@/components/demo/playback'
import { snap, useCycle } from '@/components/demo/use-cycle'
import { GlyphSvg } from '@/components/site/glyph'
import { defineTerm, type Control, type ControlValues, type DemoProps, type GlyphProps } from '@/lib/term-types'

const controls = [
  {
    id: 'amount',
    type: 'select',
    label: 'Amount',
    options: [
      { value: '0.97', label: '0.97 (house)' },
      { value: '0.95', label: '0.95' },
      { value: '0.90', label: '0.90 (cartoon)' },
    ],
    default: '0.97',
  },
  {
    id: 'release',
    type: 'select',
    label: 'Release',
    options: [
      { value: 'glide', label: 'Glide' },
      { value: 'snap', label: 'Snap' },
    ],
    default: 'glide',
  },
] as const satisfies readonly Control[]

type V = ControlValues<typeof controls>

// The house press: --duration-1 on --ease-out, the same both ways. Emil ships 0.96; under 0.95 reads as cartoon.
const PRESS_MS = 150
const HOUSE = '0.97'
const FLOOR = '0.95'
const EASE = { css: 'cubic-bezier(0.23, 1, 0.32, 1)', motion: '[0.23, 1, 0.32, 1]' }
const HIT = 44

// Resting beat before the press, how long it is held, and the hold once it is back.
const REST_MS = 500
const HELD_MS = 400
const HOLD_MS = 900
const HINT = 'Press and hold the button'
const HINT_HELD = 'Let go'

const msOf = (v: V) => (v.release === 'glide' ? PRESS_MS : 0)

// One press owns the stage at a time: a pointer (captured) or a key held on a focused target.
type Press = { kind: 'pointer'; pointerId: number; target: HTMLElement } | { kind: 'key'; key: string; target: HTMLElement }

// The primary button: `scale` to --s while pressed, transitioned over --d on --ease-out from the base rule, so the
// press and the release both glide and a release mid-press turns back from where it is. Snap sets --d to 0. Under
// reduced motion a visitor's press keeps the scale and drops the transition; Play keeps its full cycle.
const BUTTON =
  'origin-center transition-[scale] duration-(--d) ease-(--ease-out) data-[pressed=true]:[scale:var(--s)] group-data-[snap=true]/stage:transition-none motion-reduce:group-data-[taken-over=true]/stage:transition-none'
// The dense row opts out: a 150ms colour change on press, never a scale.
const STILL = 'transition-[background-color] duration-150 ease-[ease] data-[pressed=true]:bg-demo-2'

function Frame({ size }: { size: DemoProps['size'] }) {
  const detail = size === 'detail'
  const face = `${BUTTON} flex items-center justify-center rounded-lg bg-demo-subject shadow-card ${detail ? 'h-10 w-32' : 'h-7 w-[84px]'}`
  const label = <span className={`rounded-full bg-surface ${detail ? 'h-2 w-14' : 'h-1.5 w-9'}`} />
  const still = `${STILL} flex items-center justify-center rounded-md bg-surface shadow-card ${detail ? 'size-8' : 'size-5'}`
  const dot = <span className={`rounded-sm bg-demo-2 ${detail ? 'size-2.5' : 'size-1.5'}`} />
  return (
    <div data-press-frame="" className={`relative flex w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-demo ${detail ? 'h-40 gap-5 sm:h-52' : 'h-[112px] gap-3'}`}>
      {/* The primary action. On the entry page it is a real button: a press must not scroll the page sideways, select
          text or open the long-press menu; a vertical swipe still scrolls, and the browser then cancels the pointer. */}
      {detail ? (
        <button
          type="button"
          data-press-button=""
          data-press-target=""
          data-pressed="false"
          aria-label="Primary action: press and hold to see the press scale"
          className={`${face} hit cursor-pointer touch-manipulation select-none [-webkit-touch-callout:none]`}
        >
          {label}
        </button>
      ) : (
        <div data-press-button="" data-pressed="false" className={face}>
          {label}
        </div>
      )}
      {/* A dense row of small controls: the opt-out. Pressed, they change colour and stay the same size. */}
      <div data-press-row="" className={`flex ${detail ? 'gap-2' : 'gap-1.5'}`}>
        {[0, 1, 2, 3].map((i) =>
          detail ? (
            <button
              key={i}
              type="button"
              data-press-still=""
              data-press-target=""
              data-pressed="false"
              aria-label={`Toolbar control ${i + 1}: no press scale`}
              className={`${still} hit cursor-pointer touch-manipulation select-none [-webkit-touch-callout:none]`}
            >
              {dot}
            </button>
          ) : (
            <span key={i} data-press-still="" data-pressed="false" className={still}>
              {dot}
            </span>
          ),
        )}
      </div>
    </div>
  )
}

function PressScaleDemo({ values, playing, replayKey, size, timeScale, onCycleEnd }: DemoProps<V>) {
  const rootRef = useRef<HTMLDivElement>(null)
  // Set when the visitor presses a target; the cycle then leaves the stage alone until a replay or a control change.
  // Pausing (off screen, hidden tab) and resuming keeps the visitor in charge.
  const taken = useRef(false)
  const takenIn = useRef('')
  const press = useRef<Press | null>(null)
  const hintRef = useRef<HTMLParagraphElement>(null)
  const cycleKey = `${replayKey}|${values.amount}|${values.release}`
  const detail = size === 'detail'

  const buttonOf = () => rootRef.current?.querySelector<HTMLElement>('[data-press-button]') ?? null

  const setPressed = (el: HTMLElement | null, on: boolean) => {
    if (el) el.dataset.pressed = String(on)
  }

  const setPress = (p: Press | null) => {
    press.current = p
    if (hintRef.current) hintRef.current.textContent = p ? HINT_HELD : HINT
  }

  const setTaken = (on: boolean) => {
    taken.current = on
    takenIn.current = on ? cycleKey : ''
    if (rootRef.current) rootRef.current.dataset.takenOver = String(on)
    if (!on) setPress(null)
  }

  // One cycle: a beat at rest, the button pressed and held, released, and a hold. It ends at rest, so the still frame,
  // the card loop and a replay all start from the resting button. The dense row never moves.
  useCycle(
    () => {
      const root = rootRef.current
      const releaseAt = REST_MS + HELD_MS
      return {
        steps: [
          [
            0,
            () => {
              if (taken.current && takenIn.current === cycleKey) return
              setTaken(false)
              setPressed(buttonOf(), false)
            },
          ],
          [
            REST_MS,
            () => {
              if (!taken.current) setPressed(buttonOf(), true)
            },
          ],
          [
            releaseAt,
            () => {
              if (!taken.current) setPressed(buttonOf(), false)
            },
          ],
        ],
        endMs: releaseAt + PRESS_MS + HOLD_MS,
        // The still frame honours a press made in this cycle; a new cycle (replay, control change) takes the stage back.
        still: () => {
          if (!root || (taken.current && takenIn.current === cycleKey)) return
          setTaken(false)
          snap(root, () => setPressed(buttonOf(), false))
        },
      }
    },
    { playing, replayKey, timeScale, onCycleEnd },
    `${values.amount}|${values.release}`,
  )

  const targetOf = (target: EventTarget) => (target as HTMLElement).closest<HTMLElement>('[data-press-target]')

  // The first press ends the cycle; the stage then rests as the visitor leaves it.
  const begin = (p: Press) => {
    if (!taken.current) setTaken(true)
    setPress(p)
    setPressed(p.target, true)
  }
  const end = () => {
    const p = press.current
    if (!p) return
    setPress(null)
    setPressed(p.target, false)
  }

  // Press and hold scales the button; letting go glides it back from wherever the scale has got to. The capture keeps
  // the release on the button when the pointer has wandered off it. A press on a dense control changes its colour only.
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const target = targetOf(e.target)
    if (!detail || !target || !e.isPrimary || e.button !== 0 || press.current) return
    target.setPointerCapture(e.pointerId)
    begin({ kind: 'pointer', pointerId: e.pointerId, target })
  }

  // pointerup, pointercancel (a touch that became a scroll), or the capture lost: whichever comes first ends the press.
  const onPointerRelease = (e: PointerEvent<HTMLDivElement>) => {
    const p = press.current
    if (!p || p.kind !== 'pointer' || e.pointerId !== p.pointerId) return
    end()
  }

  // Space and Enter press a focused button the way :active does: held down it stays pressed, keyup releases it. The
  // keydown repeats while held, so only the first one begins the press.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const target = targetOf(e.target)
    if (!detail || !target || (e.key !== ' ' && e.key !== 'Enter') || e.repeat || press.current) return
    begin({ kind: 'key', key: e.key, target })
  }
  const onKeyUp = (e: KeyboardEvent<HTMLDivElement>) => {
    const p = press.current
    if (!p || p.kind !== 'key' || e.key !== p.key) return
    end()
  }
  // Focus leaving a key-pressed button (Tab while holding Space) releases it.
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    const p = press.current
    if (p?.kind === 'key' && e.target === p.target) end()
  }

  const vars = { '--s': values.amount, '--d': `${scaled(msOf(values), timeScale)}ms` } as CSSProperties
  const text = detail ? 'text-[11px]' : 'text-[10px]'
  return (
    <div
      ref={rootRef}
      style={vars}
      data-taken-over="false"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerRelease}
      onPointerCancel={onPointerRelease}
      onLostPointerCapture={onPointerRelease}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={onBlur}
      onContextMenu={(e) => {
        if (press.current) e.preventDefault()
      }}
      className={`group/stage flex h-full flex-col items-center justify-center ${detail ? 'gap-3 px-4' : 'gap-2 px-3'}`}
    >
      <div className={`flex w-full flex-col ${detail ? 'max-w-[400px] gap-2' : 'max-w-[220px] gap-1.5'}`}>
        <Frame size={size} />
        {/* The press's numbers. On the card they sit above the frame, clear of the play button that reduced motion
            adds. */}
        <p data-press-label="" className={`font-mono tabular-nums text-ink-muted ${detail ? text : `order-first ${text}`}`}>
          {values.release === 'glide' ? `scale ${values.amount} · ${PRESS_MS}ms ease-out` : `scale ${values.amount} · snap`}
        </p>
      </div>
      {detail && (
        <p ref={hintRef} aria-hidden className="font-mono text-[11px] text-ink-muted">
          {HINT}
        </p>
      )}
    </div>
  )
}

function PressScaleGlyph({ active }: GlyphProps) {
  return (
    <GlyphSvg kind="press-scale" active={active}>
      <rect className="m" x="2.6" y="4" width="6.8" height="4" rx="1.2" fill="currentColor" />
    </GlyphSvg>
  )
}

function amountLine(v: V): string {
  const base = `- Pressed: \`scale: ${v.amount}\`, \`transform-origin: center\`.`
  if (v.amount === HOUSE) return `${base} Emil ships 0.96 to 0.97; never below ${FLOOR}, which starts to read as cartoon.`
  if (v.amount === FLOOR) return `${base} The floor: anything smaller reads as cartoon (the house ships ${HOUSE}).`
  return `${base} Cartoon: under the ${FLOOR} floor (the house ships ${HOUSE}).`
}

function transitionLine(v: V): string {
  if (v.release === 'glide') {
    return `- Transition: \`transition: scale ${PRESS_MS}ms var(--ease-out)\` (\`--duration-1\`) on the base rule, not the pressed one, so press and release both glide and a release mid-press turns back from where it is.`
  }
  return `- No transition: it jumps to \`scale: ${v.amount}\` on press and back on release (the mistake; the house ships \`transition: scale ${PRESS_MS}ms var(--ease-out)\` on the base rule, so both ways glide and a release mid-press turns back from where it is).`
}

function motionLine(v: V): string {
  const transition = v.release === 'glide' ? `transition={{ duration: ${PRESS_MS / 1000}, ease: ${EASE.motion} }}` : 'transition={{ duration: 0 }}'
  return `- Motion route: \`whileTap={{ scale: ${v.amount} }}\`, \`${transition}\`; \`whileTap\` already covers the pointer and keyboard Enter. No CSS transition on the same element.`
}

function cssCode(v: V): string {
  const glide = v.release === 'glide'
  return [
    ':root {',
    `  --ease-out: ${EASE.css};`,
    `  --duration-1: ${PRESS_MS}ms;`,
    '}',
    '',
    '/* Markup: <button class="button" type="button">Save</button>. Dense or',
    '   high-frequency controls (toolbars, list rows, 100+ uses a day) add',
    '   data-still: a colour change on press, no scale. */',
    '.button {',
    '  position: relative; /* for the hit area below */',
    '  transform-origin: center;',
    ...(glide
      ? [
          '  /* On the base rule, not :active, so press and release both glide and a',
          '     release mid-press turns back from where it is. */',
          '  transition: scale var(--duration-1) var(--ease-out);',
        ]
      : [
          '  /* No transition: the common mistake. It jumps to the pressed scale and back.',
          '     The house ships transition: scale var(--duration-1) var(--ease-out) here,',
          '     on the base rule, so both ways glide. */',
        ]),
    '}',
    '/* The hit area stays at least 44px whatever the visual size; the scale is on',
    '   the button, so only the visual moves and the layout box never changes. */',
    '.button::after {',
    "  content: '';",
    '  position: absolute;',
    '  top: 50%;',
    '  left: 50%;',
    `  width: max(100%, ${HIT}px);`,
    `  height: max(100%, ${HIT}px);`,
    '  translate: -50% -50%;',
    '}',
    '/* :active fires for the pointer and for keyboard Enter and Space. A press',
    '   driven from JS (pointer capture, a demo loop) sets data-pressed="true". */',
    '.button:not(:disabled):active,',
    '.button[data-pressed="true"] {',
    `  scale: ${v.amount};${v.amount === HOUSE ? ' /* Emil ships 0.96 to 0.97; never below 0.95 */' : v.amount === FLOOR ? ' /* the floor; the house ships 0.97 */' : ' /* cartoon: under the 0.95 floor; the house ships 0.97 */'}`,
    '}',
    '',
    '/* The opt-out: feedback by colour, over the same 150ms, and no scale. */',
    '.button[data-still] {',
    '  transition: background-color var(--duration-1) ease;',
    '}',
    '.button[data-still]:not(:disabled):active,',
    '.button[data-still][data-pressed="true"] {',
    '  scale: none;',
    '  background-color: var(--button-pressed);',
    '}',
    '',
    '/* Reduced motion: the pressed scale stays (it is feedback, not motion); the',
    '   transition goes. */',
    '@media (prefers-reduced-motion: reduce) {',
    '  .button {',
    '    transition: none;',
    '  }',
    '}',
  ].join('\n')
}

function motionCode(v: V): string {
  const glide = v.release === 'glide'
  return [
    glide ? "import { motion, useReducedMotion } from 'motion/react'" : "import { motion } from 'motion/react'",
    "import type { ComponentProps } from 'react'",
    '',
    ...(glide ? [`const ease = ${EASE.motion} as const`] : []),
    '// The hit area is the button itself, at least 44px tall; the scale is on the',
    '// button, so only the visual moves and the layout box never changes.',
    "const box = { position: 'relative', minBlockSize: 44, minInlineSize: 44, transformOrigin: 'center' } as const",
    '',
    'type Props = ComponentProps<typeof motion.button> & {',
    '  // Dense or high-frequency controls (toolbars, list rows, 100+ uses a day): no scale.',
    '  still?: boolean',
    '}',
    '',
    'export function Button({ still = false, ...rest }: Props) {',
    ...(glide
      ? ['  // Reduced motion: the pressed scale stays (feedback, not motion); the transition goes.', '  const reduced = useReducedMotion()']
      : ['  // Reduced motion: nothing to drop here. The house build zeroes its transition', '  // with useReducedMotion() and keeps the pressed scale.']),
    '  return (',
    '    <motion.button',
    '      type="button"',
    '      style={box}',
    ...(v.amount === HOUSE
      ? ['      // Emil ships 0.96 to 0.97; never below 0.95, which starts to read as cartoon.']
      : v.amount === FLOOR
        ? ['      // 0.95 is the floor; the house ships 0.97.']
        : ['      // Cartoon: under the 0.95 floor. The house ships 0.97.']),
    `      whileTap={still ? undefined : { scale: ${v.amount} }}`,
    ...(glide
      ? [`      transition={reduced ? { duration: 0 } : { duration: ${PRESS_MS / 1000}, ease }}`]
      : ['      // No transition: the common mistake. It jumps to the pressed scale and back.', `      // The house ships { duration: ${PRESS_MS / 1000}, ease } here.`, '      transition={{ duration: 0 }}']),
    '      // whileTap covers the pointer and keyboard Enter, and ends when the pointer',
    '      // leaves or is cancelled.',
    '      {...rest}',
    '    />',
    '  )',
    '}',
  ].join('\n')
}

export default defineTerm({
  slug: 'press-scale',
  name: 'Press Scale',
  category: 'gestures',
  order: 1,
  status: 'review',
  definition: 'A button shrinks slightly while pressed, so the click feels physical.',
  aliases: ['scale on press', 'active scale', 'button press animation', 'tap feedback', 'press feedback', 'pressed state'],
  description:
    'Press feedback answers the finger: while a button is held it scales down a little, and when it is let go it comes back. The amount is small, 0.97 (Emil ships 0.96 to 0.97), and never below 0.95, where it starts to read as cartoon. What makes it feel right is the transition: 150ms on an ease-out curve, declared on the base rule so it runs both ways, so a quick tap or a release mid-press glides back instead of snapping. Only the visual scales; the hit area stays where it was and at least 44px. And not every button needs it: dense or high-frequency controls opt out with a colour change instead.',
  useWhen: [
    'Primary and secondary buttons, cards that act as buttons, and chips: anything pressed a few times a session.',
    'Touch targets, where the finger covers the control and the scale is the only sign the press landed.',
    'Icon buttons with a hit area extended by a pseudo-element: the visual scales, the hit area does not.',
  ],
  avoidWhen: [
    'Dense or high-frequency UI: toolbars, list rows, keyboard-driven menus, anything used 100+ times a day. A 150ms colour change, or nothing.',
    'Scales under 0.95. The button reads as a toy.',
    'A transition declared only on the pressed state, or none at all: the release snaps.',
    'Links in running text and anything that moves on press for another reason (a drag handle, a slider thumb).',
  ],
  demo: {
    component: PressScaleDemo,
    label:
      'A primary button sits in a frame above a dense row of four small controls. The button is pressed: it scales down to 0.97 over 150ms on an ease-out curve, holds, and glides back when released; the small controls never move. Beside the frame, the amount and the transition. On the entry page the button is real: pressing and holding it, with a mouse, a finger or Space, scales it, and letting go glides it back from wherever it has got to; pressing a small control changes its colour and nothing else. The amount can be set to 0.95, the floor, or 0.90, which reads as cartoon, and the release can be made to snap, the common mistake.',
    controls,
    glyph: PressScaleGlyph,
  },
  prompt: (v) =>
    [
      'Give this button press feedback.',
      '',
      amountLine(v),
      transitionLine(v),
      '- Pressed selector: `:not(:disabled):active`, which fires for the pointer and for keyboard Enter and Space. A press driven from JS (pointer capture, a loop) sets `data-pressed="true"`; style both.',
      `- Hit area: \`position: relative\` and a \`::after\` of at least ${HIT} × ${HIT}px (\`width: max(100%, ${HIT}px)\`, centred); the scale is on the button, so the layout box never changes.`,
      `- Opt-out: dense or high-frequency controls (toolbars, list rows, 100+ uses a day) get \`background-color\` over ${PRESS_MS}ms and \`scale: none\`: \`data-still\` (CSS) or a \`still\` prop (Motion).`,
      motionLine(v),
      v.release === 'glide'
        ? '- Reduced motion: keep the pressed scale, drop the transition. CSS: `transition: none` under `prefers-reduced-motion: reduce`; Motion: `useReducedMotion()` sets `transition={{ duration: 0 }}`.'
        : '- Reduced motion: as shipped, the pressed scale with no transition.',
    ].join('\n'),
  acceptance: (v) => {
    const glide = v.release === 'glide'
    const s = v.amount
    return [
      glide
        ? `CSS route: the button's computed \`transition-property\` is \`scale\`, \`transition-duration\` \`${PRESS_MS / 1000}s\` and \`transition-timing-function\` \`${EASE.css}\`, the same at rest and while pressed. Motion route: the \`transition\` is \`{ duration: ${PRESS_MS / 1000}, ease: ${EASE.motion} }\`.`
        : `CSS route: the button's computed \`transition-duration\` for \`scale\` is \`0s\` at rest and while pressed. Motion route: the \`transition\` is \`{ duration: 0 }\`.`,
      glide
        ? `Pressed and held, sampled every frame from \`pointerdown\`: the scale (computed \`scale\`, or the first value of the \`transform\` matrix) falls from 1 toward ${s} without passing it, with in-between frames, and is within 0.001 of ${s} by ${PRESS_MS}ms (±1 frame); held longer, it stays there.`
        : `Pressed, the scale (computed \`scale\`, or the first value of the \`transform\` matrix) is ${s} in the first frame after \`pointerdown\`, with no in-between frames, and stays there while held.`,
      glide
        ? `Released, the scale rises from ${s} back to 1 without passing it and is within 0.001 of 1 by ${PRESS_MS}ms (±1 frame) from \`pointerup\`.`
        : 'Released, the scale is 1 in the first frame after `pointerup`, with no in-between frames.',
      ...(glide
        ? [
            `Released 50ms into the press, it turns back from where it is: no frame steps more than the press's own largest step (±0.002), and it never reaches ${s}.`,
          ]
        : []),
      "The button's `offsetWidth` and `offsetHeight` never change during a press, and `elementFromPoint` 22px from its centre in any direction still returns the button (the `::after` is its hit area).",
      'Held with Space or Enter from the keyboard, it is pressed the same way; `keyup` releases it.',
      'A `data-still` (or `still`) control pressed the same way keeps `scale` at `none` (`transform` identity) in every frame and changes only its colour.',
      glide
        ? `With reduced motion on, the scale is ${s} in the first frame after \`pointerdown\` and 1 in the first frame after \`pointerup\`, with no in-between frames.`
        : `With reduced motion on, nothing changes: the scale is ${s} in the first frame after \`pointerdown\` and 1 in the first frame after \`pointerup\`.`,
    ]
  },
  code: (v) => ({ css: cssCode(v), motion: motionCode(v) }),
  a11y:
    'Press feedback is a `<button>` concern: use a real button, so Space and Enter press it, and let `:active` (or Motion\'s `whileTap`) answer the keyboard the way it answers the pointer. Keep the hit area at least 44px and never scale it: extend it with a pseudo-element and scale only the visual. Disabled buttons do not press (`:not(:disabled)`). Under reduced motion keep the pressed scale, which is feedback, and drop the transition, which is motion.',
  related: ['spring', 'duration', 'ease-out', 'icon-swap', 'overshoot'],
  sources: [
    { label: 'Emil Kowalski: 7 Practical Animation Tips', url: 'https://emilkowal.ski/ui/7-practical-animation-tips' },
    { label: "Emil Kowalski: You Don't Need Animations", url: 'https://emilkowal.ski/ui/you-dont-need-animations' },
    { label: 'Motion: Gestures', url: 'https://motion.dev/docs/react-gestures' },
  ],
})
