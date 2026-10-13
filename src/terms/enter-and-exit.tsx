import { X } from 'lucide-react'
import { useRef, type CSSProperties, type MouseEvent, type TransitionEvent } from 'react'
import { scaled } from '@/components/demo/playback'
import { snap, useCycle } from '@/components/demo/use-cycle'
import { GlyphSvg } from '@/components/site/glyph'
import { defineTerm, type Control, type ControlValues, type DemoProps, type GlyphProps } from '@/lib/term-types'

const controls = [
  {
    id: 'exit',
    type: 'select',
    label: 'Exit',
    options: [
      { value: 'quiet', label: 'Quiet' },
      { value: 'mirrored', label: 'Mirrored' },
      { value: 'none', label: 'None' },
    ],
    default: 'quiet',
  },
  {
    id: 'travel',
    type: 'select',
    label: 'Travel',
    options: [
      { value: '8', label: '8px' },
      { value: '16', label: '16px' },
    ],
    default: '16',
  },
] as const satisfies readonly Control[]

type V = ControlValues<typeof controls>
type Exit = V['exit']
type State = 'open' | 'closing' | 'closed'

// The enter: a toast's duration, --duration-2. The house exit: 0.75 × the enter, a few pixels toward the edge.
const ENTER_MS = 200
const QUIET_MS = 150
const QUIET_PX = 4
const EASE = { css: 'cubic-bezier(0.23, 1, 0.32, 1)', motion: '[0.23, 1, 0.32, 1]' }

// Empty beat between the exit and the enter, and the hold once the toast is in place.
const GAP_MS = 450
const HOLD_MS = 900

const s = (ms: number) => ms / 1000
const travelOf = (v: V) => Number(v.travel)

/** The exit's duration and where it ends, in px below the resting spot. `none` ends at the enter origin, in no time. */
function exitOf(v: V): { ms: number; px: number } {
  const t = travelOf(v)
  return { quiet: { ms: QUIET_MS, px: QUIET_PX }, mirrored: { ms: ENTER_MS, px: t }, none: { ms: 0, px: t } }[v.exit]
}

// The toast's three states. The base rule is `closing`: faded, at --c below its spot, and hidden to the tab order once
// the transition ends (visibility stays visible for the whole exit). `closed` is the enter origin, --t below, reached
// in no time, so a show right after the exit starts from the full travel. `open` is in place. A transition takes the
// duration of the state it heads to: --x closing, --d opening. Under reduced motion a visitor's gesture drops both
// offsets, so it fades in place over the same durations; Play keeps the travel, so the exit options still differ.
const TOAST =
  'invisible opacity-0 transition-[opacity,transform,visibility] duration-(--x) ease-(--ease-out) [transform:translateY(var(--c))] data-[state=closed]:[transform:translateY(var(--t))] data-[state=closed]:duration-0 data-[state=open]:visible data-[state=open]:opacity-100 data-[state=open]:duration-(--d) data-[state=open]:[transform:none] group-data-[snap=true]/stage:transition-none motion-reduce:group-data-[taken-over=true]/stage:[--c:0px] motion-reduce:group-data-[taken-over=true]/stage:[--t:0px]'

function Frame({ size }: { size: DemoProps['size'] }) {
  const detail = size === 'detail'
  const trigger = `inline-flex items-center rounded-md bg-surface font-mono text-ink shadow-card ${detail ? 'h-7 px-2.5 text-[11px]' : 'h-5 px-1.5 text-[9px]'}`
  return (
    <div data-toast-frame="" className={`relative w-full overflow-hidden rounded-lg bg-demo ${detail ? 'h-44 sm:h-56' : 'h-[112px]'}`}>
      {/* The page: an action that shows the toast, and some copy. On the entry page the action is a real button. */}
      <div className={`absolute inset-x-0 top-0 flex flex-col items-start ${detail ? 'gap-3 p-3' : 'gap-2 p-2'}`}>
        {detail ? (
          <button type="button" data-toast-trigger="" className={`${trigger} press hit cursor-pointer`}>
            Show toast
          </button>
        ) : (
          <span className={trigger}>Show toast</span>
        )}
        <span className="h-1.5 w-2/3 rounded-full bg-demo-2" />
        <span className="h-1.5 w-1/2 rounded-full bg-demo-2" />
      </div>
      {/* The toast, resting in place: the still frame, so the first paint shows no entrance. Centred by margins, never
          by a transform, which the enter and exit own. */}
      <div
        data-toast=""
        data-state="open"
        className={`${TOAST} absolute inset-x-0 mx-auto flex items-center rounded-lg bg-surface shadow-card ${detail ? 'bottom-3 h-9 w-[min(220px,calc(100%-24px))] gap-2 px-3' : 'bottom-2 h-6 w-[min(140px,calc(100%-16px))] gap-1.5 px-2'}`}
      >
        <span className={`shrink-0 rounded-full bg-demo-subject ${detail ? 'size-2' : 'size-1.5'}`} />
        <span className="h-1.5 w-2/5 rounded-full bg-demo-2" />
        {detail ? (
          <button
            type="button"
            data-toast-dismiss=""
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
  )
}

function EnterAndExitDemo({ values, playing, replayKey, size, timeScale, onCycleEnd }: DemoProps<V>) {
  const rootRef = useRef<HTMLDivElement>(null)
  // Set when the visitor shows or dismisses the toast; the cycle then leaves the stage alone until a replay or a
  // control change. Pausing (off screen, hidden tab) and resuming keeps the visitor in charge.
  const taken = useRef(false)
  const takenIn = useRef('')
  const exit = exitOf(values)
  const travel = travelOf(values)
  const cycleKey = `${replayKey}|${values.exit}|${values.travel}`
  const detail = size === 'detail'

  const toastOf = () => rootRef.current?.querySelector<HTMLElement>('[data-toast]') ?? null

  const setState = (state: State) => {
    const toast = toastOf()
    if (!toast || !rootRef.current) return
    toast.dataset.state = state
    rootRef.current.dataset.open = String(state === 'open')
  }

  const setTaken = (on: boolean) => {
    taken.current = on
    takenIn.current = on ? cycleKey : ''
    if (rootRef.current) rootRef.current.dataset.takenOver = String(on)
  }

  // Dismissing heads for `closing`; the exit's transitionend (below) then rests it at `closed`, the enter origin. Focus
  // inside the toast moves to the trigger first, so a keyboard Dismiss does not drop it on body.
  const dismiss = () => {
    const toast = toastOf()
    if (toast?.dataset.state !== 'open') return
    if (toast.contains(document.activeElement)) rootRef.current?.querySelector<HTMLElement>('[data-toast-trigger]')?.focus({ preventScroll: true })
    setState('closing')
  }

  // Showing from `closed` or mid-exit from `closing` heads for `open` from where the toast is: no jump, no restart.
  // Showing an open toast is a new toast: it is put back at the origin with transitions off, then enters again.
  const show = () => {
    const root = rootRef.current
    const toast = toastOf()
    if (!root || !toast) return
    if (toast.dataset.state === 'open') snap(root, () => setState('closed'))
    setState('open')
  }

  // One cycle: the exit, a beat empty, the enter, and a hold in place. It ends open, so the still frame, the card loop
  // and a replay all start from a toast resting in place.
  useCycle(
    () => {
      const root = rootRef.current
      const enterAt = exit.ms + GAP_MS
      return {
        steps: [
          [
            0,
            () => {
              if (taken.current && takenIn.current === cycleKey) return
              setTaken(false)
              dismiss()
            },
          ],
          [
            enterAt,
            () => {
              if (!taken.current) show()
            },
          ],
        ],
        endMs: enterAt + ENTER_MS + HOLD_MS,
        // The still frame honours a gesture made in this cycle; a new cycle (replay, control change) takes the stage back.
        still: () => {
          if (!root || (taken.current && takenIn.current === cycleKey)) return
          setTaken(false)
          snap(root, () => setState('open'))
        },
      }
    },
    { playing, replayKey, timeScale, onCycleEnd },
    `${values.exit}|${values.travel}`,
  )

  // The first gesture ends the cycle; the stage then rests as the visitor leaves it. Both buttons are real buttons,
  // so Enter and Space work, and the enter and exit play the same: they add and remove something.
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!detail) return
    const target = e.target as HTMLElement
    const action = target.closest('[data-toast-trigger]') ? show : target.closest('[data-toast-dismiss]') ? dismiss : null
    if (!action) return
    if (!taken.current) setTaken(true)
    action()
  }

  // The exit is over: the toast rests at the enter origin, out of sight, so the next show starts from --t below.
  const onTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    const toast = toastOf()
    if (e.target !== toast || e.propertyName !== 'opacity' || toast?.dataset.state !== 'closing') return
    setState('closed')
  }

  const vars = {
    '--d': `${scaled(ENTER_MS, timeScale)}ms`,
    '--x': `${scaled(exit.ms, timeScale)}ms`,
    '--t': `${travel}px`,
    '--c': `${exit.px}px`,
  } as CSSProperties
  const text = detail ? 'text-[11px]' : 'text-[10px]'
  return (
    <div
      ref={rootRef}
      style={vars}
      data-taken-over="false"
      data-open="true"
      onClick={onClick}
      onTransitionEnd={onTransitionEnd}
      className={`group/stage flex h-full flex-col items-center justify-center ${detail ? 'gap-3 px-4' : 'gap-2 px-3'}`}
    >
      <div className={`flex w-full flex-col ${detail ? 'max-w-[400px] gap-2' : 'max-w-[220px] gap-1.5'}`}>
        <Frame size={size} />
        {/* The pair's numbers: in over --d from --t below, out over --x to --c below. On the card they sit above the
            frame, clear of the play button that reduced motion adds. */}
        <div className={`flex justify-between font-mono tabular-nums text-ink-muted ${detail ? text : `order-first ${text}`}`}>
          <span data-enter-label="">
            enter {ENTER_MS}ms, {travel}px
          </span>
          <span data-exit-label="">{values.exit === 'none' ? 'exit none' : `exit ${exit.ms}ms, ${exit.px}px`}</span>
        </div>
      </div>
    </div>
  )
}

function EnterAndExitGlyph({ active }: GlyphProps) {
  return (
    <GlyphSvg kind="enter-and-exit" active={active} clipped>
      <rect x="3" y="3.2" width="6" height="1" rx=".5" fill="currentColor" opacity=".35" />
      <rect x="3" y="5.2" width="4" height="1" rx=".5" fill="currentColor" opacity=".35" />
      <rect className="m" x="2.6" y="7.4" width="6.8" height="1.6" rx=".8" fill="currentColor" />
    </GlyphSvg>
  )
}

function exitLine(v: V): string {
  const t = travelOf(v)
  return {
    quiet: `- Exit: \`opacity\` 1 to 0 and \`translateY(0)\` to \`translateY(${QUIET_PX}px)\`, toward the edge it came from, ${QUIET_MS}ms (\`calc(var(--duration-2) * 0.75)\`), same curve. A few pixels, never the full ${t}px back.`,
    mirrored: `- Exit: \`opacity\` 1 to 0 and \`translateY(0)\` to \`translateY(${t}px)\`, ${ENTER_MS}ms: same curve and duration, the full travel back (\`--ease-out\`, not reversed; the house ships ${QUIET_PX}px over ${QUIET_MS}ms, 0.75 × the enter).`,
    none: `- Exit: no transition; it is gone in the next frame (the house ships \`opacity\` to 0 and ${QUIET_PX}px toward the edge over ${QUIET_MS}ms, 0.75 × the enter).`,
  }[v.exit]
}

function cssRoute(v: V): string {
  const t = travelOf(v)
  const x = exitOf(v)
  const states =
    v.exit === 'none'
      ? `\`closed\` at once, the base rule: \`opacity: 0; visibility: hidden; transform: translateY(${t}px)\`, the enter origin, \`transition-duration: 0ms\``
      : `\`closing\`, the base rule: the exit target \`opacity: 0; visibility: hidden; transform: translateY(${x.px}px)\`, ${x.ms}ms, \`transition-property: opacity, transform, visibility\`. \`closed\`, set on its own \`opacity\` \`transitionend\` (\`event.target\` is the toast, \`propertyName === 'opacity'\`): as \`closing\` at \`translateY(${t}px)\`, the enter origin, \`transition-duration: 0ms\``
  return `- CSS route: keep it mounted; \`data-state\` on the toast. \`open\`: \`opacity: 1; visibility: visible; transform: none\`, \`transition-duration: ${ENTER_MS}ms\`. ${states}.`
}

function motionRoute(v: V): string {
  const t = travelOf(v)
  const x = exitOf(v)
  const exit = v.exit === 'none' ? `exit={{ opacity: 0, transition: { duration: 0 } }}` : `exit={{ opacity: 0, y: ${x.px}, transition: { duration: ${s(x.ms)}, ease: ${EASE.motion} } }}`
  return `- Motion route: \`<AnimatePresence initial={false}>\`; \`initial={{ opacity: 0, y: ${t} }}\`, \`animate={{ opacity: 1, y: 0 }}\`, \`transition={{ duration: ${s(ENTER_MS)}, ease: ${EASE.motion} }}\`, \`${exit}\`; it unmounts after the exit.`
}

function cssCode(v: V): string {
  const t = travelOf(v)
  const x = exitOf(v)
  const none = v.exit === 'none'
  return [
    ':root {',
    `  --ease-out: ${EASE.css};`,
    `  --duration-2: ${ENTER_MS}ms;`,
    '}',
    '',
    '/* Markup: <div class="toast" data-state="closed">…<button>Dismiss</button></div>.',
    '   Kept mounted, not display + @starting-style: that also plays on first paint.',
    '   Show: data-state="open". Dismiss: data-state="closing",',
    ...(none
      ? ['   which here is the same as "closed": no exit transition.']
      : [
          '   and on its own transitionend (event.target the toast, propertyName',
          '   "opacity") data-state="closed", the enter origin, so the next show',
          `   starts from ${t}px below.`,
        ]),
    '   Focus inside the toast: trigger.focus({ preventScroll: true }) before',
    '   closing, or it drops to body. */',
    '.toast {',
    ...(none
      ? ['  /* Gone in the next frame. The house ships a 150ms fade, 4px toward the', '     edge: see the Quiet exit. */', '  opacity: 0;', `  transform: translateY(${t}px);`, '  visibility: hidden;', '  transition-property: opacity, transform, visibility;', '  transition-duration: 0ms;']
      : [
          ...(v.exit === 'mirrored'
            ? [
                '  /* The exit target: faded, slid the full travel back to the bottom edge, and',
                '     out of the tab order once the transition ends. visibility is transitioned',
                '     too, so the toast stays visible for the whole exit. A transition takes',
                '     the duration of the state it heads to: this rule times the exit, the',
                '     open rule the enter. */',
              ]
            : [
                '  /* The exit target: faded, nudged toward the bottom edge, and out of the',
                '     tab order once the transition ends. visibility is transitioned too, so',
                '     the toast stays visible for the whole exit. A transition takes the',
                '     duration of the state it heads to: this rule times the exit, the open',
                '     rule the enter. */',
              ]),
          '  opacity: 0;',
          `  transform: translateY(${x.px}px);`,
          '  visibility: hidden;',
          '  transition-property: opacity, transform, visibility;',
          `  transition-duration: ${x.ms}ms;${v.exit === 'mirrored' ? " /* the enter's duration and travel, back; the house ships 150ms, 4px */" : ' /* 0.75 × the enter */'}`,
        ]),
    '  transition-timing-function: var(--ease-out);',
    '}',
    ...(v.exit === 'quiet'
      ? [
          '.toast[data-state="closed"] {',
          `  /* The enter origin: ${t}px below its spot, where the exit nudges toward. In`,
          '     no time, so a show right after the exit starts from the full travel. */',
          `  transform: translateY(${t}px);`,
          '  transition-duration: 0ms;',
          '}',
        ]
      : v.exit === 'mirrored'
        ? [
            '.toast[data-state="closed"] {',
            "  /* Same values as the exit's end; 0ms only so it matches the Quiet route,",
            '     where closed is reached in no time. */',
            '  transition-duration: 0ms;',
            '}',
          ]
        : []),
    '.toast[data-state="open"] {',
    '  opacity: 1;',
    '  transform: none;',
    '  visibility: visible;',
    `  transition-duration: var(--duration-2); /* enter: ${ENTER_MS}ms */`,
    '}',
    '',
    '/* Reduced motion: a fade over the same durations, no travel. */',
    '@media (prefers-reduced-motion: reduce) {',
    '  .toast,',
    '  .toast[data-state] {',
    '    transform: none;',
    '  }',
    '}',
  ].join('\n')
}

function motionCode(v: V): string {
  const t = travelOf(v)
  const x = exitOf(v)
  const exit =
    v.exit === 'none'
      ? ['          // No exit: gone in the next frame. The house ships { opacity: 0, y: 4 }', '          // over 0.15s, 0.75 × the enter.', '          exit={{ opacity: 0, transition: { duration: 0 } }}']
      : [
          v.exit === 'mirrored'
            ? "          // The enter's duration and travel, back on the same curve. The house ships y: 4 over 0.15s, 0.75 × the enter."
            : '          // Quieter and faster: a few pixels toward the edge it came from, 0.75 × the enter.',
          `          exit={{ opacity: 0, y: y(${x.px}), transition: { duration: ${s(x.ms)}, ease } }}`,
        ]
  return [
    "import { AnimatePresence, motion, useReducedMotion } from 'motion/react'",
    "import type { ReactNode } from 'react'",
    '',
    `const ease = ${EASE.motion} as const`,
    '',
    'export function Toast({ open, onDismiss, children }: { open: boolean; onDismiss: () => void; children: ReactNode }) {',
    '  // Reduced motion: a fade over the same durations, no travel.',
    '  const reduced = useReducedMotion()',
    '  const y = (px: number) => (reduced ? 0 : px)',
    '  return (',
    '    // initial={false}: a toast open at first paint is painted in place, with no',
    '    // entrance. It unmounts once the exit has played.',
    '    <AnimatePresence initial={false}>',
    '      {open && (',
    '        <motion.div',
    '          className="toast"',
    `          initial={{ opacity: 0, y: y(${t}) }}`,
    '          animate={{ opacity: 1, y: 0 }}',
    `          transition={{ duration: ${s(ENTER_MS)}, ease }}`,
    ...exit,
    '        >',
    '          {children}',
    '          {/* Dismissing with focus inside: trigger.focus({ preventScroll: true }) first, or focus drops to body. */}',
    '          <button type="button" onClick={onDismiss}>',
    '            Dismiss',
    '          </button>',
    '        </motion.div>',
    '      )}',
    '    </AnimatePresence>',
    '  )',
    '}',
  ].join('\n')
}

export default defineTerm({
  slug: 'enter-and-exit',
  name: 'Enter and Exit',
  category: 'transitions',
  order: 5,
  status: 'review',
  definition: 'The animations an element plays when it is added to the screen and when it is removed.',
  aliases: ['entrance and exit', 'mount and unmount animation', 'appear and disappear', 'fade in and out', 'exit animation', 'enter animation', 'AnimatePresence'],
  description:
    'An enter announces something new: it fades in and travels a short way from where it belongs, over 200 to 250ms on an ease-out curve. The exit is the quieter half of the pair. By the time something leaves, attention has moved on, so it fades with a nudge of a few pixels toward where it came from, about 25% faster, and never slides its full height back. The two are not mirror images. And anything already in place at first paint plays no entrance at all: enters and exits are for changes the user caused.',
  useWhen: [
    'Toasts, dialogs, popovers, menus and tooltips: anything added to the screen and later removed.',
    'List items, tags and chips that come and go while the rest stays.',
    'Anything opened or dismissed from the keyboard: the change still adds or removes something.',
  ],
  avoidWhen: [
    'Content already in place when the page first paints. No entrance; it is just there.',
    'An exit that mirrors the enter: the full travel at the full duration. Cut the distance to a few pixels and the time by about 25%.',
    'An exit that cuts straight to nothing when the enter animated. Fade it, and leave a hint of direction.',
    'Drawers and sheets. They slide fully off, matching their enter, on the drawer curve.',
    'Highlight moves inside a component (arrow keys, shortcut toggles): no animation.',
  ],
  demo: {
    component: EnterAndExitDemo,
    label:
      'A toast rests at the bottom edge of a page frame. It fades out with a nudge of a few pixels toward the edge, quick and quiet; a beat later it enters again: it fades in while rising 16px into place over 200ms, then holds. Beside the frame, the two sets of numbers: the enter and the exit. On the entry page a Show toast button in the frame plays the enter and the Dismiss button on the toast plays the exit. With the Mirrored exit the toast slides the full 16px back down at the enter duration; with None it disappears in one frame.',
    controls,
    glyph: EnterAndExitGlyph,
  },
  prompt: (v) =>
    [
      'Give this toast an enter and an exit. Bottom centre of its `position: relative` container, 16px up.',
      '',
      `- Enter: \`opacity\` 0 to 1 and \`transform: translateY(${travelOf(v)}px)\` to \`none\`, ${ENTER_MS}ms (\`var(--duration-2)\`), \`var(--ease-out)\`.`,
      exitLine(v),
      '- First paint: nothing already on screen gets an entrance. Enters and exits play only for a change the user caused, including from the keyboard (Enter on the trigger or Dismiss). Dismissed with focus inside, `trigger.focus({ preventScroll: true })` before closing.',
      cssRoute(v),
      motionRoute(v),
      '- Reduced motion: `opacity` only, same durations. CSS: `transform: none` in every state; Motion: `useReducedMotion()` zeroes `y`.',
    ].join('\n'),
  acceptance: (v) => {
    const t = travelOf(v)
    const x = exitOf(v)
    // `closed` is reached in 0s on every route (`none` is 0s throughout), so the checklist says so: a correct build
    // read on a closed toast must not fail it.
    const durations =
      v.exit === 'none'
        ? `\`${s(ENTER_MS)}s\` with \`data-state="open"\` and \`0s\` without`
        : `\`${s(ENTER_MS)}s\` with \`data-state="open"\`, \`${s(x.ms)}s\` while \`closing\`, and \`0s\` once \`closed\``
    return [
      `CSS route: the toast's computed \`transition-duration\` is ${durations}. Motion route: the \`transition\` durations are ${s(ENTER_MS)} in and ${s(x.ms)} out.`,
      `Entering, it starts ${t}px below its resting spot at \`opacity\` 0 (the computed values the moment it is shown), rises and fades in with no frame moving down or dimming, and is settled at \`opacity\` 1 and \`transform: none\` within ${ENTER_MS}ms (±1 frame) of the first animated frame (the first frame where its \`opacity\` moves).`,
      {
        quiet: `Exiting, \`opacity\` is 0 within ${QUIET_MS}ms (±1 frame) of the first animated frame. While visible (\`closing\`) the toast ends ${QUIET_PX}px (±0.5) below its spot, never farther and never above it; \`closed\` sits at the enter origin, hidden.`,
        mirrored: `Exiting, \`opacity\` is 0 within ${ENTER_MS}ms (±1 frame) of the first animated frame and the toast ends ${t}px (±0.5) below its spot, the enter origin (the house stops at ${QUIET_PX}px by ${QUIET_MS}ms).`,
        none: 'Dismissed, the toast is gone in the next frame: no in-between opacity or position (the house fades it over 150ms with a 4px nudge).',
      }[v.exit],
      v.exit === 'none'
        ? 'Dismissed while entering, it is gone in the next frame.'
        : "Dismissed while entering, or shown again while exiting, it turns back from where it is with no restart and no jump: no frame steps more than the exit's own largest step.",
      'Loaded with the toast already open, no frame shows it below its spot or under `opacity` 1, and `getAnimations()` on it is empty.',
      'Shown or dismissed from the keyboard, it plays the same enter and exit.',
      'Dismissed from the keyboard, focus lands on the trigger, not `body`.',
      'CSS route: closed, its computed `visibility` is `hidden` and its Dismiss button is not in the tab order.',
      'With reduced motion on, computed `transform` is `none` in every frame while `opacity` fades over the same durations.',
    ]
  },
  code: (v) => ({ css: cssCode(v), motion: motionCode(v) }),
  a11y:
    'The toast is usable from the first frame of its enter: put it in a `role="status"` region that is always mounted, so the announcement comes with the click, not after the enter, and give its Dismiss button a label. Dismissed with focus inside it (a keyboard Dismiss), move focus to the trigger with `preventScroll` before closing, so it does not fall to `body`. Closed, keep it out of the tab order (`visibility: hidden` once the exit transition ends, or unmount it). Opening or dismissing from the keyboard animates like a click. Under reduced motion, drop the travel and keep the fade over the same durations.',
  related: ['duration', 'ease-out', 'stagger', 'scroll-triggered', 'toast'],
  sources: [
    { label: 'Emil Kowalski: Building a Toast Component', url: 'https://emilkowal.ski/ui/building-a-toast-component' },
    { label: 'Emil Kowalski: Good vs Great Animations', url: 'https://emilkowal.ski/ui/good-vs-great-animations' },
    { label: 'Motion: AnimatePresence', url: 'https://motion.dev/docs/react-animate-presence' },
  ],
})
