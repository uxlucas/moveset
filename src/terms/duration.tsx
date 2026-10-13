import { useRef, type CSSProperties, type MouseEvent, type PointerEvent } from 'react'
import { scaled } from '@/components/demo/playback'
import { snap, useCycle } from '@/components/demo/use-cycle'
import { GlyphSvg } from '@/components/site/glyph'
import { defineTerm, type Control, type ControlValues, type DemoProps, type GlyphProps } from '@/lib/term-types'

const controls = [
  {
    id: 'element',
    type: 'select',
    label: 'Element',
    options: [
      { value: 'tooltip', label: 'Tooltip' },
      { value: 'dropdown', label: 'Dropdown' },
      { value: 'sheet', label: 'Sheet' },
    ],
    default: 'dropdown',
  },
  { id: 'exitRatio', type: 'toggle', label: 'Exits 25% faster', default: true },
] as const satisfies readonly Control[]

type V = ControlValues<typeof controls>
type Kind = V['element']

// The three durations the stage compares, the same for every element: the term is about the number.
const COLUMNS = [150, 300, 500] as const
const EXIT_RATIO = 0.75

const EASE_OUT = { css: 'cubic-bezier(0.23, 1, 0.32, 1)', motion: '[0.23, 1, 0.32, 1]', token: 'var(--ease-out)' }
const EASE_DRAWER = { css: 'cubic-bezier(0.32, 0.72, 0, 1)', motion: '[0.32, 0.72, 0, 1]', token: 'var(--ease-drawer)' }

// `range`: the house range for this kind of element (docs/house-rules.md). `ms`: what the prompt ships, as a token.
const KINDS: Record<Kind, { name: string; range: [number, number]; ms: number; token: string; ease: typeof EASE_OUT }> = {
  tooltip: { name: 'tooltip', range: [125, 200], ms: 150, token: '--duration-1', ease: EASE_OUT },
  dropdown: { name: 'dropdown', range: [150, 250], ms: 200, token: '--duration-2', ease: EASE_OUT },
  sheet: { name: 'sheet', range: [200, 300], ms: 300, token: '--duration-4', ease: EASE_DRAWER },
}

const exitOf = (ms: number, v: V) => (v.exitRatio ? ms * EXIT_RATIO : ms)
const s = (ms: number) => ms / 1000

/** How a duration reads for this element: under its range, in it, over it but under the 300ms ceiling, or past it. */
function verdict(ms: number, kind: Kind): string {
  const [lo, hi] = KINDS[kind].range
  if (ms < lo) return 'abrupt'
  if (ms <= hi) return 'right'
  if (ms <= 300) return 'slow'
  return 'too slow'
}

// Closed time between the slowest exit and the next open, and the open hold before the cycle ends.
const CLOSED_MS = 400
const HOLD_MS = 1000
const HINT = 'Hold a frame to play it'
const HINT_HOVER = 'Hover a trigger to play it'
const HINT_HELD = 'Let go to close it'
const HINT_HOVERING = 'Move away to close it'

// One gesture owns the stage at a time: a mouse hovering the tooltip's trigger, or a pointer holding a frame.
type Gesture = { type: 'hover' | 'hold'; pointerId: number; item: HTMLElement }

// Each element's closed and open look. The duration of the state it heads to times the move: --x closing, --d opening.
// Under reduced motion a held element does not move; it fades over the same durations. Play keeps its full cycle.
const ITEM =
  'transition-[opacity,transform] duration-(--x) ease-(--e) data-[open=true]:duration-(--d) group-data-[snap=true]/stage:transition-none motion-reduce:group-data-[taken-over=true]/stage:[transform:none]'
const SHEET_REDUCED =
  'motion-reduce:group-data-[taken-over=true]/stage:opacity-0 motion-reduce:group-data-[taken-over=true]/stage:data-[open=true]:opacity-100'

// Spans throughout: on the entry page the frame is a <button>, which holds phrasing content only.
function Element({ kind, ms, detail }: { kind: Kind; ms: number; detail: boolean }) {
  if (kind === 'tooltip') {
    return (
      <>
        <span className={`absolute inset-x-0 flex justify-center ${detail ? 'bottom-[calc(42%+8px)]' : 'bottom-[calc(42%+5px)]'}`}>
          {/* Inverted, as tooltips are, so the whole body carries the fade against the frame. */}
          <span
            data-duration-item=""
            data-ms={ms}
            data-open="true"
            className={`${ITEM} flex origin-bottom items-center rounded-md bg-demo-subject opacity-0 shadow-card [transform:scale(0.97)] data-[open=true]:opacity-100 data-[open=true]:[transform:none] ${detail ? 'h-8 px-3' : 'h-5 px-1.5'}`}
          >
            <span className={`h-1.5 rounded-full bg-surface ${detail ? 'w-12' : 'w-7'}`} />
          </span>
        </span>
        {/* The trigger. On the entry page a mouse hovers it, so `hit` gives the cursor a 44px-tall zone to cross. */}
        <span className={`absolute inset-x-0 top-[58%] flex justify-center`}>
          <span data-duration-trigger="" className={`rounded-md bg-surface shadow-card ${detail ? 'hit h-7 w-14' : 'h-5 w-9'}`} />
        </span>
      </>
    )
  }
  if (kind === 'dropdown') {
    return (
      <>
        <span className={`absolute flex items-center justify-between rounded-md bg-surface shadow-card ${detail ? 'left-3 top-3 h-7 w-[min(80px,calc(100%-24px))] px-2' : 'left-2 top-2 h-5 w-12 px-1.5'}`}>
          <span className={`h-1.5 rounded-full bg-demo-2 ${detail ? 'w-9' : 'w-5'}`} />
          <span className="size-1.5 rotate-45 border-b border-r border-ink-faint" />
        </span>
        <span
          data-duration-item=""
          data-ms={ms}
          data-open="true"
          className={`${ITEM} absolute block origin-top-left rounded-lg bg-surface p-1 opacity-0 shadow-card [transform:scale(0.95)] data-[open=true]:opacity-100 data-[open=true]:[transform:none] ${detail ? 'inset-x-3 top-12' : 'inset-x-2 top-8'}`}
        >
          {[0, 1, 2].map((i) => (
            <span key={i} className={`flex items-center rounded-md ${detail ? 'h-7 gap-2 px-2' : 'h-[18px] gap-1.5 px-1'} ${i === 0 ? 'bg-demo' : ''}`}>
              <span className={`shrink-0 rounded-sm ${i === 0 ? 'bg-demo-subject' : 'bg-demo-2'} ${detail ? 'size-2.5' : 'size-2'}`} />
              <span className={`h-1.5 rounded-full bg-demo-2 ${['w-3/5', 'w-1/2', 'w-2/3'][i]}`} />
            </span>
          ))}
        </span>
      </>
    )
  }
  return (
    <>
      {/* The page behind the sheet. */}
      <span className={`absolute inset-x-0 top-0 flex flex-col ${detail ? 'gap-2 p-3' : 'gap-1.5 p-2'}`}>
        <span className="h-1.5 w-1/2 rounded-full bg-demo-2" />
        <span className="h-1.5 w-2/3 rounded-full bg-demo-2" />
      </span>
      {/* Closed it sits 4px below the frame, so its hairline ring never shows along the bottom edge. */}
      <span
        data-duration-item=""
        data-ms={ms}
        data-open="true"
        className={`${ITEM} ${SHEET_REDUCED} absolute inset-x-1 bottom-0 top-[22%] flex flex-col items-center rounded-t-xl bg-surface shadow-card [transform:translateY(calc(100%_+_4px))] data-[open=true]:[transform:none] ${detail ? 'gap-2.5 px-3 pt-2' : 'gap-1.5 px-2 pt-1.5'}`}
      >
        <span className={`h-1 rounded-full bg-demo-2 ${detail ? 'w-8' : 'w-5'}`} />
        <span className={`h-1.5 self-start rounded-full bg-demo-subject ${detail ? 'w-2/3' : 'w-3/4'}`} />
        <span className="h-1.5 w-full rounded-full bg-demo-2" />
        <span className="h-1.5 w-4/5 self-start rounded-full bg-demo-2" />
      </span>
    </>
  )
}

function Column({ kind, ms, exit, timeScale, detail }: { kind: Kind; ms: number; exit: number; timeScale: number; detail: boolean }) {
  const word = verdict(ms, kind)
  const text = detail ? 'text-[11px]' : 'text-[10px]'
  // Timing is scaled so slow motion stretches every column alike; the labels and data-ms keep the real numbers.
  const vars = { '--d': `${scaled(ms, timeScale)}ms`, '--x': `${scaled(exit, timeScale)}ms` } as CSSProperties
  const frame = `relative overflow-hidden rounded-lg bg-demo ${detail ? 'h-40 sm:h-52' : 'h-[104px]'}`
  return (
    <div data-duration-column="" data-ms={ms} data-verdict={word} className={`flex min-w-0 flex-1 flex-col ${detail ? 'max-w-44 gap-2' : 'max-w-[92px] gap-1.5'}`}>
      <p className={`font-mono tabular-nums ${text} ${word === 'right' ? 'text-ink' : 'text-ink-muted'}`}>{ms}ms</p>
      {detail ? (
        // On the entry page the frame is held to open its element (the tooltip, with a mouse, is hovered instead, and
        // tooltips never change the cursor). The items start open, so the button starts pressed. A still hold must
        // not select text or open the long-press menu; a vertical swipe still scrolls the page (the browser then
        // cancels the pointer, which closes the element).
        <button
          type="button"
          data-duration-frame=""
          aria-pressed="true"
          aria-label={`${ms}ms ${KINDS[kind].name}`}
          style={vars}
          className={`${frame} touch-pan-y select-none [-webkit-touch-callout:none] ${kind === 'tooltip' ? '' : 'cursor-pointer'}`}
        >
          <Element kind={kind} ms={ms} detail={detail} />
        </button>
      ) : (
        <div data-duration-frame="" style={vars} className={frame}>
          <Element kind={kind} ms={ms} detail={detail} />
        </div>
      )}
      <p className={`font-mono ${text} ${word === 'right' ? 'text-ink' : 'text-ink-muted'}`}>{word}</p>
    </div>
  )
}

/** Opens or closes one element; the frame around it, when it is a button, reports the state. */
function setOpen(item: HTMLElement, open: boolean) {
  item.dataset.open = String(open)
  const frame = item.closest('[data-duration-frame]')
  if (frame?.hasAttribute('aria-pressed')) frame.setAttribute('aria-pressed', String(open))
}

function DurationDemo({ values, playing, replayKey, size, timeScale, onCycleEnd }: DemoProps<V>) {
  const rootRef = useRef<HTMLDivElement>(null)
  // Set when the visitor hovers or holds a frame; the cycle then leaves the stage alone until a replay or a control
  // change. Pausing (off screen, hidden tab) and resuming keeps the visitor in charge.
  const taken = useRef(false)
  const takenIn = useRef('')
  const gesture = useRef<Gesture | null>(null)
  const hintRef = useRef<HTMLParagraphElement>(null)
  const kind = values.element
  const slowestExit = exitOf(COLUMNS[COLUMNS.length - 1], values)
  const cycleKey = `${replayKey}|${values.element}|${values.exitRatio}`

  const items = () => [...(rootRef.current?.querySelectorAll<HTMLElement>('[data-duration-item]') ?? [])]

  // The hint shows the line for the gesture under way (data-gesture), or its resting lines for the pointer at hand.
  const setGesture = (g: Gesture | null) => {
    gesture.current = g
    if (!hintRef.current) return
    if (g) hintRef.current.dataset.gesture = g.type
    else delete hintRef.current.dataset.gesture
  }

  const setTaken = (on: boolean) => {
    taken.current = on
    takenIn.current = on ? cycleKey : ''
    if (rootRef.current) rootRef.current.dataset.takenOver = String(on)
    if (!on) setGesture(null)
  }

  // The first gesture, hover or hold, ends the cycle and hands the stage over closed: the gestured element snaps
  // shut, so its open is seen in full from the first gesture, and the other two close at their exit durations.
  const takeOver = (item: HTMLElement) => {
    const root = rootRef.current
    if (taken.current || !root) return
    setTaken(true)
    snap(root, () => setOpen(item, false))
    for (const el of items()) if (el !== item) setOpen(el, false)
  }

  // Hover and hold are one gesture with two triggers: begin takes the stage and opens the element at its duration,
  // end closes it at its exit duration. One gesture at a time.
  const begin = (type: Gesture['type'], pointerId: number, item: HTMLElement) => {
    takeOver(item)
    setGesture({ type, pointerId, item })
    setOpen(item, true)
  }
  const end = (g: Gesture) => {
    setGesture(null)
    setOpen(g.item, false)
  }

  // One cycle: all three close at once (if open), a beat closed, all three open at the same instant, and hold.
  // It ends open, so the still frame, the card loop and a replay all start from three open elements.
  useCycle(
    () => {
      const root = rootRef.current
      const setAll = (open: boolean) => items().forEach((el) => setOpen(el, open))
      const openAt = slowestExit + CLOSED_MS
      return {
        steps: [
          [
            0,
            () => {
              if (taken.current && takenIn.current === cycleKey) return
              setTaken(false)
              setAll(false)
            },
          ],
          [
            openAt,
            () => {
              if (!taken.current) setAll(true)
            },
          ],
        ],
        endMs: openAt + COLUMNS[COLUMNS.length - 1] + HOLD_MS,
        // The still frame honours a hold made in this cycle; a new cycle (replay, control change) takes the stage back.
        still: () => {
          if (!root || (taken.current && takenIn.current === cycleKey)) return
          setTaken(false)
          snap(root, () => setAll(true))
        },
      }
    },
    { playing, replayKey, timeScale, onCycleEnd },
    `${values.element}|${values.exitRatio}`,
  )

  const frameOf = (target: EventTarget) => (target as HTMLElement).closest<HTMLElement>('[data-duration-frame]')
  const itemOf = (frame: HTMLElement) => frame.querySelector<HTMLElement>('[data-duration-item]')
  const triggerOf = (target: EventTarget) => (target as HTMLElement).closest<HTMLElement>('[data-duration-trigger]')
  // A mouse plays the tooltip by hovering its trigger, as a tooltip is used; every other case is a hold.
  const hovers = (e: PointerEvent<HTMLDivElement>) => kind === 'tooltip' && e.pointerType === 'mouse'

  // The trigger has no children, so pointerover on it is the mouse arriving and pointerout the mouse leaving.
  const onPointerOver = (e: PointerEvent<HTMLDivElement>) => {
    const trigger = triggerOf(e.target)
    const frame = trigger && frameOf(trigger)
    const item = frame && itemOf(frame)
    if (size !== 'detail' || !trigger || !item || !hovers(e) || gesture.current) return
    begin('hover', e.pointerId, item)
  }

  const onPointerOut = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    if (!g || g.type !== 'hover' || e.pointerId !== g.pointerId || !triggerOf(e.target)) return
    end(g)
  }

  // Press and hold opens that frame's element at its duration; letting go closes it at its exit duration. The capture
  // keeps the release on the frame wherever the pointer has gone. With a mouse the tooltip's press does nothing: hover
  // owns it. Under reduced motion the transition still runs, with no scale or slide: a fade over the same durations
  // (ITEM).
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const frame = frameOf(e.target)
    const item = frame && itemOf(frame)
    if (size !== 'detail' || !frame || !item || !e.isPrimary || e.button !== 0 || hovers(e) || gesture.current) return
    frame.setPointerCapture(e.pointerId)
    begin('hold', e.pointerId, item)
  }

  // pointerup, pointercancel, or the capture lost: whichever comes first ends the hold.
  const onRelease = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    if (!g || g.type !== 'hold' || e.pointerId !== g.pointerId) return
    end(g)
  }

  // Pointer clicks are handled as presses or hovers above. A click from the keyboard (Enter or Space reports detail 0)
  // toggles the element open and closed. Opening something with Enter still animates, so these run at the same
  // durations.
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const frame = frameOf(e.target)
    const item = frame && itemOf(frame)
    if (size !== 'detail' || !frame || !item || e.detail !== 0 || gesture.current) return
    takeOver(item)
    setOpen(item, item.dataset.open !== 'true')
  }

  const detail = size === 'detail'
  const [lo, hi] = KINDS[kind].range
  const ease = { '--e': KINDS[kind].ease.css } as CSSProperties
  return (
    <div
      ref={rootRef}
      style={ease}
      data-taken-over="false"
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onPointerDown={onPointerDown}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
      onLostPointerCapture={onRelease}
      onContextMenu={(e) => {
        if (gesture.current?.type === 'hold') e.preventDefault()
      }}
      className={`group/stage flex h-full flex-col items-center justify-center ${detail ? 'gap-3 px-4' : 'px-3'}`}
    >
      {detail && (
        <p className="w-full max-w-[560px] font-mono text-[11px] text-ink-muted">
          {KINDS[kind].name} range {lo}–{hi}ms
        </p>
      )}
      <div className={`flex w-full justify-center ${detail ? 'max-w-[560px] gap-3 sm:gap-6' : 'gap-2.5'}`}>
        {COLUMNS.map((ms) => (
          <Column key={ms} kind={kind} ms={ms} exit={exitOf(ms, values)} timeScale={timeScale} detail={detail} />
        ))}
      </div>
      {detail && (
        // Resting, the tooltip's hint names the gesture for the pointer at hand (a fine pointer hovers, a coarse one
        // holds); the other elements are always held. While a gesture is under way (data-gesture) its line shows.
        <p ref={hintRef} aria-hidden className="group/hint mt-3 font-mono text-[11px] text-ink-muted">
          {kind === 'tooltip' ? (
            <>
              <span className="pointer-coarse:hidden group-data-[gesture]/hint:hidden">{HINT_HOVER}</span>
              <span className="hidden pointer-coarse:inline group-data-[gesture]/hint:hidden">{HINT}</span>
            </>
          ) : (
            <span className="group-data-[gesture]/hint:hidden">{HINT}</span>
          )}
          <span className="hidden group-data-[gesture=hover]/hint:inline">{HINT_HOVERING}</span>
          <span className="hidden group-data-[gesture=hold]/hint:inline">{HINT_HELD}</span>
        </p>
      )}
    </div>
  )
}

function DurationGlyph({ active }: GlyphProps) {
  return (
    <GlyphSvg kind="duration" active={active}>
      <rect x="2.6" y="4.2" width=".8" height="3.6" rx=".4" fill="currentColor" opacity=".35" />
      <rect x="8.6" y="4.2" width=".8" height="3.6" rx=".4" fill="currentColor" opacity=".35" />
      <circle className="m" cx="6" cy="6" r="1.4" fill="currentColor" />
    </GlyphSvg>
  )
}

/** "200ms" or "112.5ms", for prose. */
const msText = (ms: number) => `${ms}ms`

function exitText(v: V): string {
  const k = KINDS[v.element]
  return v.exitRatio ? `calc(var(${k.token}) * 0.75)` : `var(${k.token})`
}

function elementLine(v: V): string {
  const k = KINDS[v.element]
  const exit = exitOf(k.ms, v)
  const look = {
    tooltip: '`opacity` 0 and `transform: scale(0.97)` to `none`, `transform-origin` toward the trigger',
    dropdown: '`opacity` 0 and `transform: scale(0.95)` to `none`, `transform-origin` at the trigger',
    sheet: '`transform: translateY(100%)` to `none`, from the bottom edge',
  }[v.element]
  // --ease-out is defined in the Tokens line; the drawer curve is defined here, the only place it is used.
  const ease = k.ease === EASE_OUT ? `\`${k.ease.token}\`` : `\`${k.ease.token}\` (\`${k.ease.css}\`)`
  return `- This ${k.name}: open ${msText(k.ms)} (\`var(${k.token})\`), close ${msText(exit)} (\`${exitText(v)}\`); ${look}; ${ease}.`
}

function cssLook(kind: Kind): { base: string[]; open: string[]; reduced: string[] } {
  if (kind === 'sheet') {
    return {
      base: ['  transform: translateY(100%);', '  transition-property: transform;'],
      open: ['  transform: none;'],
      reduced: [
        '  /* No slide: it fades in place over the same durations. */',
        '  .sheet {',
        '    transform: none;',
        '    opacity: 0;',
        '    transition-property: opacity;',
        '  }',
        '  .sheet[data-open] {',
        '    opacity: 1;',
        '  }',
      ],
    }
  }
  const scale = kind === 'tooltip' ? '0.97' : '0.95'
  return {
    base: [
      `  transform-origin: ${kind === 'tooltip' ? 'bottom center; /* toward the trigger below it */' : 'top left; /* grow out of the trigger */'}`,
      '  opacity: 0;',
      `  transform: scale(${scale});`,
      '  transition-property: opacity, transform;',
    ],
    open: ['  opacity: 1;', '  transform: none;'],
    reduced: ['  /* No scale: a fade over the same durations. */', `  .${kind},`, `  .${kind}[data-open] {`, '    transform: none;', '  }'],
  }
}

function cssCode(v: V): string {
  const k = KINDS[v.element]
  const exit = exitOf(k.ms, v)
  const look = cssLook(v.element)
  return [
    '/* Durations by kind of element. Product UI stays at or under --duration-4;',
    '   only page-level transitions go further, to 400ms at most. */',
    ':root {',
    '  --duration-1: 150ms; /* hover, press, color; tooltips */',
    '  --duration-2: 200ms; /* menus, dropdowns, popovers */',
    '  --duration-3: 250ms; /* dialogs, toasts */',
    '  --duration-4: 300ms; /* drawers, sheets: the ceiling */',
    '  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);',
    ...(k.ease === EASE_DRAWER ? ['  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);'] : []),
    '}',
    '',
    '/* Hover and press: the short end, and only color and scale. Color on ease,',
    '   the press scale on --ease-out; both the same length each way. */',
    '.button {',
    '  transition-property: background-color, scale;',
    '  transition-duration: var(--duration-1);',
    '  transition-timing-function: ease, var(--ease-out);',
    '}',
    '@media (hover: hover) and (pointer: fine) {',
    '  .button:hover {',
    '    background-color: var(--button-hover);',
    '  }',
    '}',
    '.button:active {',
    '  scale: 0.97;',
    '}',
    '',
    `/* The ${k.name}. A transition takes the duration of the state it heads`,
    `   to: this closed rule times the close, [data-open] the open. To open, set`,
    '   data-open and remove inert; to close, the reverse. */',
    `.${v.element} {`,
    ...look.base,
    `  transition-timing-function: ${k.ease.token};`,
    `  transition-duration: ${exitText(v)}; /* close: ${exit}ms */`,
    ...(v.exitRatio ? [] : ['  /* Same as the open. The house runs exits 25% faster: × 0.75. */']),
    '}',
    `.${v.element}[data-open] {`,
    ...look.open,
    `  transition-duration: var(${k.token}); /* open: ${k.ms}ms */`,
    '}',
    ...(v.element === 'dropdown'
      ? ['', '/* Arrow keys move the highlight: no transition, ever. */', '.dropdown [role="menuitem"] {', '  transition-property: none;', '}']
      : []),
    '',
    '@media (prefers-reduced-motion: reduce) {',
    '  .button:active {',
    '    scale: none;',
    '  }',
    ...look.reduced,
    '}',
  ].join('\n')
}

function motionCode(v: V): string {
  const k = KINDS[v.element]
  const enter = s(k.ms)
  const exit = s(exitOf(k.ms, v))
  const Name = v.element[0].toUpperCase() + v.element.slice(1)
  const states =
    v.element === 'sheet'
      ? [
          '  // Reduced motion: no slide, a fade over the same durations.',
          '  const hidden = useReducedMotion() ? { opacity: 0 } : { y: "100%" }',
          '  const shown = { opacity: 1, y: 0 }',
        ]
      : [
          `  // Reduced motion: no scale, a fade over the same durations.`,
          `  const hidden = { opacity: 0, scale: useReducedMotion() ? 1 : ${v.element === 'tooltip' ? 0.97 : 0.95} }`,
          '  const shown = { opacity: 1, scale: 1 }',
        ]
  return [
    "import { AnimatePresence, motion, useReducedMotion } from 'motion/react'",
    "import type { ReactNode } from 'react'",
    '',
    '// Seconds by kind: hover and press 0.15, tooltip 0.15, dropdown 0.2, dialog',
    '// and toast 0.25, sheet 0.3. Page-level transitions only: up to 0.4.',
    v.exitRatio ? '// Exits run at 0.75 × the enter.' : '// Exits here match the enter; the house runs them at 0.75 ×.',
    `export function ${Name}({ open, children }: { open: boolean; children: ReactNode }) {`,
    ...states,
    '  return (',
    '    <AnimatePresence>',
    '      {open && (',
    '        <motion.div',
    `          className="${v.element}-panel"`,
    ...(v.element === 'sheet' ? [] : [`          style={{ transformOrigin: '${v.element === 'tooltip' ? 'bottom center' : 'top left'}' }}`]),
    '          initial={hidden}',
    '          animate={shown}',
    `          transition={{ duration: ${enter}, ease: ${k.ease.motion} }}`,
    `          exit={{ ...hidden, transition: { duration: ${exit}, ease: ${k.ease.motion} } }}`,
    '        >',
    '          {children}',
    '        </motion.div>',
    '      )}',
    '    </AnimatePresence>',
    '  )',
    '}',
  ].join('\n')
}

export default defineTerm({
  slug: 'duration',
  name: 'Duration',
  category: 'motion',
  order: 5,
  status: 'published',
  definition: 'How long an animation takes, which decides whether it feels instant, smooth or slow.',
  aliases: ['timing', 'how long it takes', 'animation length', 'feels slow', 'too fast', 'ms', 'animation speed'],
  description:
    'Duration is how long an animation runs from start to finish, and it shapes how an interface feels: a 180ms dropdown reads as a response, the same dropdown at 400ms reads as the interface thinking. Product UI stays at or under 300ms. Exits run about 25% faster than enters, because the user has already moved on. Size and distance pick the spot inside the range: a tooltip that moves a few pixels needs less time than a sheet crossing the screen, so one number is right for one element and wrong for the next. Something used 100+ times a day gets no animation at all.',
  useWhen: [
    'Hover, press and color changes: 100 to 150ms.',
    'Tooltips and small popovers: 125 to 200ms. Menus and dropdowns: 150 to 250ms.',
    'Dialogs, drawers, sheets and toasts: 200 to 300ms.',
    'Page-level transitions: 300 to 400ms, the only place UI goes past 300ms.',
  ],
  avoidWhen: [
    'Anything in product UI over 300ms, other than a page-level transition. If it feels slow, cut the duration before touching the curve.',
    'A duration inherited from a snippet or a library default. Pick it from the kind of element and how far it moves.',
    'One duration for every element. At 300ms a sheet is right and a tooltip drags.',
    'Exits as long as enters. The user has decided; let it go about 25% faster.',
    'Actions used 100+ times a day, or changes driven by the keyboard inside a component (arrow-key highlight, shortcut toggles). Give them no animation at all, not a shorter one.',
  ],
  demo: {
    component: DurationDemo,
    label:
      'Three identical frames side by side, labelled 150ms, 300ms and 500ms. In each, the same dropdown opens at the same instant on the same curve, so the 150ms one lands first and the 500ms one last; under each, a verdict says whether that duration suits the element. They hold, then close about 25% faster. On the entry page, holding a frame opens that one element at its duration, and letting go closes it at its exit duration. With a mouse, the tooltip opens when the pointer moves onto its trigger and closes when it moves away; on touch it is held like the others. Switching to a tooltip or a full-height sheet changes the element and the verdicts: 150ms is right for a tooltip and abrupt for a sheet.',
    controls,
    glyph: DurationGlyph,
  },
  prompt: (v) => {
    const k = KINDS[v.element]
    const sheet = v.element === 'sheet'
    const exit = s(exitOf(k.ms, v))
    return [
      `Time this ${k.name}.`,
      '',
      '- Tokens: `--duration-1: 150ms; --duration-2: 200ms; --duration-3: 250ms; --duration-4: 300ms; --ease-out: cubic-bezier(0.23, 1, 0.32, 1)`.',
      '- By kind, for reference: hover and color 100 to 150ms (`--duration-1`, `ease`); press `--duration-1` on `--ease-out`; tooltips 125 to 200ms; menus and dropdowns 150 to 250ms (`--duration-2`); dialogs and toasts `--duration-3`; drawers and sheets `--duration-4`. Only page-level transitions pass 300ms, 400ms at most.',
      v.exitRatio
        ? '- Exits of overlays (menus, tooltips, dialogs, sheets, toasts): enter × 0.75, `calc(var(--duration-N) * 0.75)`. Hover and press are symmetric.'
        : '- Exits of overlays (menus, tooltips, dialogs, sheets, toasts): same as the enter (the house default is enter × 0.75). Hover and press are symmetric.',
      '- Bigger elements and longer travel take the long end; never one duration for everything.',
      '- Used 100+ times a day, or driven by the keyboard inside a component (arrow-key highlight, shortcut toggles): no animation.',
      elementLine(v),
      ...(sheet ? ['- Backdrop, if any: `opacity` on the same open and close durations and curve.'] : []),
      `- CSS route: \`transition-property: ${sheet ? 'transform' : 'opacity, transform'}\`; the base rule holds the close duration, \`[data-open]\` the open; closed, it stays mounted with \`inert\`.`,
      `- Motion route: \`transition={{ duration: ${s(k.ms)}, ease: ${k.ease.motion} }}\`, \`exit={{ …, transition: { duration: ${exit}, ease: ${k.ease.motion} } }}\`, inside \`AnimatePresence\`; \`useReducedMotion()\` drops the ${sheet ? 'slide' : 'scale'}.`,
      ...(v.element === 'dropdown' ? ['- Arrow-key highlight inside the menu: instant.'] : []),
      sheet
        ? '- Reduced motion: no slide, `opacity` only (CSS: `transition-property: opacity`, closed `opacity: 0`, `transform: none`), same durations.'
        : '- Reduced motion: no scale, `opacity` only, same durations.',
    ].join('\n')
  },
  acceptance: (v) => {
    const k = KINDS[v.element]
    const exit = exitOf(k.ms, v)
    const sheet = v.element === 'sheet'
    return [
      `CSS route: the ${k.name}'s computed \`transition-duration\` is \`${s(k.ms)}s\` with \`[data-open]\` and \`${s(exit)}s\` without. Motion route: the \`transition\` durations are ${s(k.ms)} in and ${s(exit)} out.`,
      v.exitRatio
        ? `The close is configured at no more than 75% of the open: ${exit}ms against ${k.ms}ms.`
        : `The close is configured as long as the open, ${k.ms}ms (the house ships 75%).`,
      `Its computed \`transition-timing-function\` is \`${k.ease.css}\` (CSS route).`,
      ...(sheet ? [`The backdrop, if there is one, fades on the same durations and curve as the sheet: ${k.ms}ms open, ${exit}ms close.`] : []),
      'No transition or animation in the UI is longer than 0.3s, except page-level transitions, which stay at or under 0.4s.',
      'Hover and press changes finish within 150ms.',
      v.element === 'dropdown'
        ? 'Moving the highlight with the arrow keys shows in the next frame with no transition.'
        : 'Changes made from the keyboard inside the component show in the next frame with no transition.',
      `With reduced motion on, the ${k.name} ${sheet ? 'fades without sliding' : 'fades without changing size'}, over the same durations.`,
    ]
  },
  code: (v) => ({ css: cssCode(v), motion: motionCode(v) }),
  a11y: 'Duration has no accessibility cost of its own as long as nothing waits for it: make the element usable from the first frame of the enter, and move focus when it opens, not when the animation ends. Changes made from the keyboard inside a component should not animate. Under reduced motion, drop the movement and keep at most a fade over the same short durations.',
  related: ['ease-out', 'ease-in-out', 'enter-and-exit', 'spring', 'stagger'],
  sources: [
    { label: "Emil Kowalski: You Don't Need Animations", url: 'https://emilkowal.ski/ui/you-dont-need-animations' },
    { label: 'Emil Kowalski: 7 Practical Animation Tips', url: 'https://emilkowal.ski/ui/7-practical-animation-tips' },
  ],
})
