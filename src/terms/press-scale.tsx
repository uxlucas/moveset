import { Bold, Italic, Link, Send, Strikethrough, Underline, type LucideIcon } from 'lucide-react'
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
// The hit area is a pseudo-element inside the button, so it scales with the press: 46px at rest keeps it over 44px at
// 0.97 (44.6) and about 44 at 0.95 (43.7); at 0.90 it is 41.4.
const HIT = 46
const hitPressed = (v: V) => (HIT * Number(v.amount)).toFixed(1)
// The opt-out's pressed colour in the tabs: one grey step under the browser's resting button (#f0f0f0).
const PRESSED_COLOR = '#e0e0e0'

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
// The toolbar opts out: a 150ms colour change on press, never a scale.
const STILL = 'transition-[background-color] duration-150 ease-[ease] data-[pressed=true]:bg-demo-2'
// A text editor's formatting toolbar: the dense, high-frequency controls the rule exempts.
const TOOLBAR: { name: string; Icon: LucideIcon }[] = [
  { name: 'Bold', Icon: Bold },
  { name: 'Italic', Icon: Italic },
  { name: 'Underline', Icon: Underline },
  { name: 'Strikethrough', Icon: Strikethrough },
  { name: 'Link', Icon: Link },
]

// The entry page shows the real interface; the card is a wireframe of the same layout (a pill button over a pill
// toolbar of five circles), drawn with the demo shapes: a bar for the label, a dot for each icon, no captions.
function Frame({ size, amount }: { size: DemoProps['size']; amount: string }) {
  const detail = size === 'detail'
  // The card button is close to the entry's size (120 × 36 against 128 × 40), so 0.97 reads as a press there too.
  const face = `${BUTTON} flex items-center justify-center gap-2 rounded-full bg-demo-subject font-medium text-surface shadow-card ${detail ? 'h-10 w-32 text-[14px]' : 'h-9 w-[120px]'}`
  const still = `${STILL} flex items-center justify-center rounded-full ${detail ? 'size-8 text-ink' : 'size-5'}`
  // One caption under each element, the same distance from it, so neither rule has to be inferred from the other's.
  const captioned = 'flex flex-col items-center gap-2'
  const caption = 'font-mono tabular-nums text-[11px] text-ink-muted'
  const button = detail ? (
    // The primary action. On the entry page it is a real button: a press must not scroll the page sideways, select
    // text or open the long-press menu; a vertical swipe still scrolls, and the browser then cancels the pointer.
    // Its hit area is 46px (--hit), so it is still over 44px while pressed at 0.97.
    <button
      type="button"
      data-press-button=""
      data-press-target=""
      data-pressed="false"
      className={`${face} hit [--hit:46px] cursor-pointer touch-manipulation select-none [-webkit-touch-callout:none]`}
    >
      <Send size={14} aria-hidden />
      Send
    </button>
  ) : (
    <div data-press-button="" data-pressed="false" className={face}>
      <span className="h-2 w-12 rounded-full bg-surface" />
    </div>
  )
  // The toolbar: the opt-out. Pressed, its buttons change colour and stay the same size.
  const toolbar = (
    <div data-press-row="" className={`flex rounded-full bg-surface p-1 shadow-card ${detail ? 'gap-1' : 'gap-0.5'}`}>
      {TOOLBAR.map(({ name, Icon }) =>
        detail ? (
          <button
            key={name}
            type="button"
            data-press-still=""
            data-press-target=""
            data-pressed="false"
            aria-label={name}
            className={`${still} hit cursor-pointer touch-manipulation select-none [-webkit-touch-callout:none]`}
          >
            <Icon size={16} aria-hidden />
          </button>
        ) : (
          <span key={name} data-press-still="" data-pressed="false" className={still}>
            <span className="size-2 rounded-full bg-demo-2" />
          </span>
        ),
      )}
    </div>
  )
  return (
    <div data-press-frame="" className={`relative flex w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-demo ${detail ? 'h-44 gap-5 sm:h-52' : 'h-[112px] gap-3'}`}>
      {detail ? (
        <>
          <div className={captioned}>
            {button}
            <p data-press-button-caption="" className={caption}>
              button: scale {amount}
            </p>
          </div>
          <div className={captioned}>
            {toolbar}
            <p data-press-row-caption="" className={caption}>
              toolbar: colour only, no scale
            </p>
          </div>
        </>
      ) : (
        <>
          {button}
          {toolbar}
        </>
      )}
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

  // Space and Enter held both press a focused control here: held down it stays pressed, keyup releases it. The demo is
  // not a route: CSS :active presses on Space only and Motion's whileTap on Enter only (the tabs say so). The keydown
  // repeats while held, so only the first one begins the press.
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
        <Frame size={size} amount={values.amount} />
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
  if (v.amount === HOUSE) return `${base} Emil ships 0.96 to 0.97; never below ${FLOOR} (cartoon).`
  if (v.amount === FLOOR) return `${base} The floor; under it is cartoon (the house ships ${HOUSE}).`
  return `${base} Cartoon: under the ${FLOOR} floor (the house ships ${HOUSE}).`
}

function transitionLine(v: V): string {
  if (v.release === 'glide') {
    return `- Transition: \`transition: scale ${PRESS_MS}ms var(--ease-out)\` (\`--duration-1\`) on the base rule, not the pressed one (both directions).`
  }
  return `- No transition: it jumps to \`scale: ${v.amount}\` on press and back on release (the mistake; the house ships \`transition: scale ${PRESS_MS}ms var(--ease-out)\` on the base rule, both directions).`
}

function hitLine(v: V): string {
  const pressed = hitPressed(v)
  const note = v.amount === HOUSE ? `${pressed}px while pressed` : v.amount === FLOOR ? `${pressed}px while pressed, about 44` : `${pressed}px while pressed, under 44`
  return `- Hit area: the button \`position: relative\`; its \`::after\`: \`content: ""\`, \`position: absolute\`, \`inset: 50% auto auto 50%\`, \`translate: -50% -50%\`, \`width\` and \`height\` \`max(100%, ${HIT}px)\`; it scales with the button (${note}); the layout box never changes.`
}

function motionLine(v: V): string {
  // Snap zeroes the scale's transition only: the opt-out colour keeps its 150ms.
  const transition = v.release === 'glide' ? `transition={{ duration: ${PRESS_MS / 1000}, ease: ${EASE.motion} }}` : `transition={{ duration: 0, backgroundColor: { duration: ${PRESS_MS / 1000} } }}`
  return `- Motion route: \`whileTap={{ scale: ${v.amount} }}\`, \`${transition}\`: the pointer, and Enter held (not Space); \`still\`: \`whileTap={{ backgroundColor: "${PRESSED_COLOR}" }}\`. No CSS transition on \`scale\` there.`
}

function cssCode(v: V): string {
  const glide = v.release === 'glide'
  return [
    ':root {',
    `  --ease-out: ${EASE.css};`,
    `  --duration-1: ${PRESS_MS}ms;`,
    `  --button-pressed: ${PRESSED_COLOR}; /* one grey step under the resting #f0f0f0 */`,
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
    `/* The hit area: ${HIT}px whatever the visual size. It sits inside the button, so it`,
    `   scales with the press (${hitPressed(v)}px at ${v.amount}); the layout box never changes. */`,
    '.button::after {',
    "  content: '';",
    '  position: absolute;',
    '  inset: 50% auto auto 50%;',
    `  width: max(100%, ${HIT}px);`,
    `  height: max(100%, ${HIT}px);`,
    '  translate: -50% -50%;',
    '}',
    '/* :active fires for the pointer and for Space held; Enter clicks on keydown with',
    '   no press. A press driven from JS (pointer capture, a demo loop) sets',
    '   data-pressed="true". */',
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
    '   transitions go, the colour one too. */',
    '@media (prefers-reduced-motion: reduce) {',
    '  .button,',
    '  .button[data-still] {',
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
    `// The button is its own hit area, at least ${HIT}px. It scales with the press`,
    `// (${hitPressed(v)}px at ${v.amount}); the layout box never changes.`,
    `const box = { position: 'relative', minBlockSize: ${HIT}, minInlineSize: ${HIT}, transformOrigin: 'center' } as const`,
    '// The opt-out presses by colour: the resting grey, and one step under it.',
    "const surface = '#f0f0f0'",
    `const pressed = '${PRESSED_COLOR}'`,
    '',
    'type Props = ComponentProps<typeof motion.button> & {',
    '  // Dense or high-frequency controls (toolbars, list rows, 100+ uses a day): no scale.',
    '  still?: boolean',
    '}',
    '',
    'export function Button({ still = false, style, ...rest }: Props) {',
    ...(glide
      ? ['  // Reduced motion: the pressed scale stays (feedback, not motion); the transition goes.', '  const reduced = useReducedMotion()']
      : ['  // Reduced motion: nothing to drop here. The house build zeroes its transition', '  // with useReducedMotion() and keeps the pressed scale.']),
    '  return (',
    '    <motion.button',
    '      type="button"',
    '      style={{ ...box, backgroundColor: still ? surface : undefined, ...style }}',
    ...(v.amount === HOUSE
      ? ['      // Emil ships 0.96 to 0.97; never below 0.95, which starts to read as cartoon.']
      : v.amount === FLOOR
        ? ['      // 0.95 is the floor; the house ships 0.97.']
        : ['      // Cartoon: under the 0.95 floor. The house ships 0.97.']),
    `      whileTap={still ? { backgroundColor: pressed } : { scale: ${v.amount} }}`,
    ...(glide
      ? [`      transition={reduced ? { duration: 0 } : { duration: ${PRESS_MS / 1000}, ease }}`]
      : [
          '      // No transition on the scale: the common mistake. It jumps to the pressed',
          `      // scale and back; the opt-out colour keeps its ${PRESS_MS}ms. The house ships`,
          `      // { duration: ${PRESS_MS / 1000}, ease } here.`,
          `      transition={{ duration: 0, backgroundColor: { duration: ${PRESS_MS / 1000} } }}`,
        ]),
    '      // whileTap covers the pointer and Enter held (not Space: that key activates',
    '      // with no press), and ends on pointerup anywhere or pointercancel.',
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
  status: 'published',
  definition: 'A button shrinks slightly while pressed, so the click feels physical.',
  aliases: ['scale on press', 'active scale', 'button press animation', 'tap feedback', 'press feedback', 'pressed state'],
  description:
    'Press feedback answers the finger: while a button is held it scales down a little, and when it is let go it comes back. The amount is small, 0.97 (Emil ships 0.96 to 0.97), and never below 0.95, where it starts to read as cartoon. What makes it feel right is the transition: 150ms on an ease-out curve, declared on the base rule, so it runs both ways: a quick tap or a release mid-press glides back instead of snapping. The layout box never changes, and the hit area is a 46px pseudo-element that scales with the button, so it is still over 44px while pressed at 0.97. And not every button needs it: dense or high-frequency controls opt out with a colour change instead.',
  useWhen: [
    'Primary and secondary buttons, cards that act as buttons, and chips: anything pressed a few times a session.',
    'Touch targets, where the finger covers the control and the scale is the only sign the press landed.',
    'Icon buttons with a hit area extended by a pseudo-element: 46px at rest, so it is still over 44px while pressed at 0.97.',
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
      'On the entry page, a pill-shaped Send button sits in a frame above a text editor\'s formatting toolbar, a pill of five round buttons: Bold, Italic, Underline, Strikethrough and Link. A caption under each says its rule: the button scales to 0.97, the toolbar changes colour only, never scale. The Send button is pressed: it scales down to 0.97 over 150ms on an ease-out curve, holds, and glides back when released; the toolbar never moves. Under the frame, the amount and the transition. The buttons are real: pressing and holding Send, with a mouse, a finger or Space, scales it, and letting go glides it back from wherever it has got to; pressing a toolbar button changes its colour and nothing else. The amount can be set to 0.95, the floor, or 0.90, which reads as cartoon, and the release can be made to snap, the common mistake. The index card is a wireframe of the same layout and motion: a bar for the label, a dot for each icon, no captions inside the frame.',
    controls,
    glyph: PressScaleGlyph,
  },
  prompt: (v) =>
    [
      'Give this button press feedback.',
      '',
      amountLine(v),
      transitionLine(v),
      '- CSS route: pressed selector `:not(:disabled):active`: the pointer, and Space held (Enter clicks with no press). A press driven from JS (pointer capture, a loop) sets `data-pressed="true"`; style both.',
      hitLine(v),
      `- Opt-out: dense or high-frequency controls (toolbars, list rows, 100+ uses a day) get \`background-color: var(--button-pressed)\` (\`${PRESSED_COLOR}\`) over ${PRESS_MS}ms \`ease\` and \`scale: none\`: \`data-still\` (CSS) or a \`still\` prop (Motion).`,
      motionLine(v),
      v.release === 'glide'
        ? '- Reduced motion: keep the pressed scale, drop the transitions (the colour one too). CSS: `transition: none` under `prefers-reduced-motion: reduce`, repeated for `[data-still]`; Motion: `useReducedMotion()` sets `transition={{ duration: 0 }}`.'
        : '- Reduced motion: as shipped, the pressed scale with no transition.',
    ].join('\n'),
  acceptance: (v) => {
    const glide = v.release === 'glide'
    const s = v.amount
    return [
      glide
        ? `CSS route: the button's computed \`transition-property\` is \`scale\`, \`transition-duration\` \`${PRESS_MS / 1000}s\` and \`transition-timing-function\` \`${EASE.css}\`, the same at rest and while pressed. Motion route: the \`transition\` prop is \`{ duration: ${PRESS_MS / 1000}, ease: ${EASE.motion} }\` (in the source; the computed transition is not it).`
        : `CSS route: the button's computed \`transition-duration\` for \`scale\` is \`0s\` at rest and while pressed. Motion route: the \`transition\` prop is \`{ duration: 0, backgroundColor: { duration: ${PRESS_MS / 1000} } }\` (in the source).`,
      glide
        ? `Pressed and held, sampled every frame from \`pointerdown\`: the scale (computed \`scale\`, or the first value of the \`transform\` matrix) falls from 1 toward ${s} without passing it, with in-between frames, and is within 0.001 of ${s} by ${PRESS_MS}ms (±1 frame); held longer, it stays there.`
        : `Pressed, the scale (computed \`scale\`, or the first value of the \`transform\` matrix) is ${s} within two frames of \`pointerdown\` (CSS: the first frame), with no in-between frames, and stays there while held.`,
      glide
        ? `Released, the scale rises from ${s} back to 1 without passing it and is within 0.001 of 1 by ${PRESS_MS}ms (±1 frame) from \`pointerup\`.`
        : 'Released, the scale is 1 within two frames of `pointerup` (CSS: the first frame), with no in-between frames.',
      ...(glide
        ? [
            `Released 50ms into the press, it turns back from where it is: no frame step larger than ${((1 - Number(s)) / 2).toFixed(3)} in \`scale\` (half the press depth), and it never reaches ${s}.`,
          ]
        : []),
      `The primary button's \`offsetWidth\` and \`offsetHeight\` never change during a press. \`elementFromPoint\` 21px above and 21px below its centre (edges exclusive) returns the button at rest${
        Number(s) >= 0.95
          ? ` and while pressed: the \`::after\` is ${HIT}px, ${hitPressed(v)}px pressed.`
          : `; pressed, the \`::after\` is ${hitPressed(v)}px (${HIT}px at rest), so 20px returns it and 21px need not.`
      }`,
      'Held with the pointer, it presses on both routes. Held from the keyboard, Space presses the CSS route and Enter the Motion route; the other key activates it with no feedback. `keyup` releases.',
      `A \`data-still\` (or \`still\`) control pressed the same way keeps \`scale\` at \`none\` (\`transform\` identity) in every frame and changes only its colour, to \`${PRESSED_COLOR}\`, over ${PRESS_MS}ms.`,
      glide
        ? `With reduced motion on, the scale is ${s} within two frames of \`pointerdown\` (CSS: the first frame) and 1 within two frames of \`pointerup\`, with no in-between frames.`
        : `With reduced motion on, nothing changes: the scale is ${s} within two frames of \`pointerdown\` (CSS: the first frame) and 1 within two frames of \`pointerup\`.`,
    ]
  },
  code: (v) => ({ css: cssCode(v), motion: motionCode(v) }),
  a11y:
    'Press feedback is a `<button>` concern: use a real button, so Space and Enter both activate it whatever the feedback does. The feedback is a pointer affordance: `:active` also answers Space held and Motion\'s `whileTap` Enter held, and the other key activates with no press. Keep the hit area at least 46px at rest with a pseudo-element: it scales with the press and is still over 44px at 0.97. Disabled buttons do not press (`:not(:disabled)`). Under reduced motion keep the pressed scale, which is feedback, and drop the transition, which is motion.',
  related: ['spring', 'duration', 'ease-out', 'icon-swap', 'overshoot'],
  sources: [
    { label: 'Emil Kowalski: 7 Practical Animation Tips', url: 'https://emilkowal.ski/ui/7-practical-animation-tips' },
    { label: "Emil Kowalski: You Don't Need Animations", url: 'https://emilkowal.ski/ui/you-dont-need-animations' },
    { label: 'Motion: Gestures', url: 'https://motion.dev/docs/react-gestures' },
  ],
})
