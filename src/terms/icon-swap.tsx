import { Check, Copy, Heart, Pause, Play, type LucideProps } from 'lucide-react'
import { useEffect, useRef, type ComponentType, type CSSProperties, type MouseEvent } from 'react'
import { scaled } from '@/components/demo/playback'
import { snap, useCycle } from '@/components/demo/use-cycle'
import { GlyphSvg } from '@/components/site/glyph'
import { defineTerm, type Control, type ControlValues, type DemoProps, type GlyphProps } from '@/lib/term-types'

const controls = [
  {
    id: 'pair',
    type: 'select',
    label: 'Pair',
    options: [
      { value: 'copy', label: 'Copy → check' },
      { value: 'play', label: 'Play → pause' },
      { value: 'heart', label: 'Heart → filled' },
    ],
    default: 'copy',
  },
  {
    id: 'depth',
    type: 'select',
    label: 'Depth',
    options: [
      { value: '0.3', label: '0.3 (house)' },
      { value: '0.8', label: '0.8 (timid)' },
      { value: 'fade', label: 'None (fade only)' },
    ],
    default: '0.3',
  },
  { id: 'blur', type: 'toggle', label: 'Blur 3px', default: true },
] as const satisfies readonly Control[]

type V = ControlValues<typeof controls>
type Pair = V['pair']

type PairSpec = {
  from: string
  to: string
  A: ComponentType<LucideProps>
  B: ComponentType<LucideProps>
  /** props the second icon needs to read as the "on" state */
  bProps?: LucideProps
  /** the button's accessible name off and on; a toggle keeps one name and reports its state in aria-pressed */
  label: [string, string]
  toggle: boolean
  /** announced in a role="status" region on the press; the state then reverts on a timer, and the name never changes */
  status?: string
  /** the Motion tab's state name, component name and lucide imports */
  state: string
  component: string
  icons: [string, string]
}

const PAIRS: Record<Pair, PairSpec> = {
  copy: { from: 'copy', to: 'check', A: Copy, B: Check, label: ['Copy', 'Copy'], toggle: false, status: 'Copied', state: 'copied', component: 'CopyButton', icons: ['Copy', 'Check'] },
  play: { from: 'play', to: 'pause', A: Play, B: Pause, label: ['Play', 'Pause'], toggle: false, state: 'playing', component: 'PlayButton', icons: ['Play', 'Pause'] },
  heart: {
    from: 'heart',
    to: 'filled heart',
    A: Heart,
    B: Heart,
    bProps: { fill: 'currentColor' },
    label: ['Like', 'Like'],
    toggle: true,
    state: 'liked',
    component: 'LikeButton',
    icons: ['Heart', 'Heart'],
  },
}

const cap = (word: string) => word[0].toUpperCase() + word.slice(1)

// The entry page's row: the thing the button acts on, so the icon is the state of something. A command to copy, an
// episode to play, a post to like. The card draws the same row as bars.
const ROWS: Record<Pair, { title: string; line: string; mono?: boolean }> = {
  copy: { title: 'npm install motion', line: 'Install command', mono: true },
  play: { title: 'Design details', line: 'Episode 12 · 42 min' },
  heart: { title: 'Shipped the sidebar', line: 'Ada · 2h ago' },
}

// The house swap: shrink deep, fade, a whisper of blur, no bounce. Without Motion, a firm ease-out stands in for the spring.
const HOUSE_SCALE = 0.3
const BLUR_PX = 3
const SWAP_MS = 300
const SPRING = '{ type: "spring", duration: 0.35, bounce: 0 }'
const EASE = 'cubic-bezier(0.25, 0.1, 0, 1)'

// Resting beat before the swap, how long the swapped icon holds, and the hold once it is back.
const REST_MS = 500
const ON_MS = 1100
const HOLD_MS = 700
// Copy is not a toggle: a press shows the check, and this long after it the icon reverts (the site's copy button).
const REVERT_MS = 1500
const HINT = 'Press the button to swap it'

const scaleOf = (v: V) => (v.depth === 'fade' ? 1 : Number(v.depth))
const blurOf = (v: V) => (v.blur ? BLUR_PX : 0)

// Both icons stay mounted, layered in one box. The hidden one is faded, shrunk to --s and softened by --b; data-on on
// the button picks which is which. Every property transitions over --d on --e, so a second press mid-swap turns back
// from where it is. Under reduced motion --s is 1 and --b is 0: a fade over the same duration.
const ICON =
  'transition-[opacity,transform,filter] duration-(--d) ease-(--e) group-data-[snap=true]/stage:transition-none motion-reduce:[--s:1] motion-reduce:[--b:0px]'
const ICON_A = `${ICON} group-data-[on=true]/button:opacity-0 group-data-[on=true]/button:[transform:scale(var(--s))] group-data-[on=true]/button:[filter:blur(var(--b))]`
const ICON_B = `${ICON} absolute inset-0 opacity-0 [transform:scale(var(--s))] [filter:blur(var(--b))] group-data-[on=true]/button:opacity-100 group-data-[on=true]/button:[transform:none] group-data-[on=true]/button:[filter:blur(0px)]`

function Icons({ pair, size }: { pair: Pair; size: DemoProps['size'] }) {
  const { A, B, bProps } = PAIRS[pair]
  const px = size === 'detail' ? 18 : 14
  // The resting icon is in flow and sets the size; the other sits over it.
  return (
    <span className="relative inline-flex" style={{ width: px, height: px }}>
      <A size={px} aria-hidden data-icon="a" className={ICON_A} />
      <B size={px} aria-hidden data-icon="b" className={ICON_B} {...bProps} />
    </span>
  )
}

function IconSwapDemo({ values, playing, replayKey, size, timeScale, onCycleEnd }: DemoProps<V>) {
  const rootRef = useRef<HTMLDivElement>(null)
  // Set when the visitor presses the button; the cycle then leaves the stage alone until a replay or a control change.
  // Pausing (off screen, hidden tab) and resuming keeps the visitor in charge.
  const taken = useRef(false)
  const takenIn = useRef('')
  // The copy pair's pending revert, dropped by any other change of state.
  const revert = useRef<ReturnType<typeof setTimeout>>(undefined)
  const pair = PAIRS[values.pair]
  const cycleKey = `${replayKey}|${values.pair}|${values.depth}|${values.blur}`
  const detail = size === 'detail'
  useEffect(() => () => clearTimeout(revert.current), [])

  const buttonOf = () => rootRef.current?.querySelector<HTMLElement>('[data-icon-swap]') ?? null

  // Only a visitor's press is announced; the cycle swaps in silence.
  const announce = (text: string) => {
    const region = rootRef.current?.querySelector<HTMLElement>('[data-swap-status]')
    if (region) region.textContent = text
  }

  // The state lives on the button: data-on for the icons, and the accessible name or aria-pressed for assistive tech,
  // set on the press, never when the swap settles. The copy pair keeps its name (the announcement is separate).
  const setOn = (on: boolean) => {
    clearTimeout(revert.current)
    const button = buttonOf()
    if (!button) return
    button.dataset.on = String(on)
    if (button.hasAttribute('aria-pressed')) button.setAttribute('aria-pressed', String(on))
    else if (button.hasAttribute('aria-label') && pair.label[0] !== pair.label[1]) button.setAttribute('aria-label', pair.label[on ? 1 : 0])
    if (!on) announce('')
  }

  const setTaken = (on: boolean) => {
    taken.current = on
    takenIn.current = on ? cycleKey : ''
    if (rootRef.current) rootRef.current.dataset.takenOver = String(on)
  }

  // One cycle: a beat at rest, the swap, a hold, the swap back, and a hold. It ends at rest, so the still frame, the
  // card loop and a replay all start from the resting icon.
  useCycle(
    () => {
      const root = rootRef.current
      const backAt = REST_MS + ON_MS
      return {
        steps: [
          [
            0,
            () => {
              if (taken.current && takenIn.current === cycleKey) return
              setTaken(false)
              setOn(false)
            },
          ],
          [
            REST_MS,
            () => {
              if (!taken.current) setOn(true)
            },
          ],
          [
            backAt,
            () => {
              if (!taken.current) setOn(false)
            },
          ],
        ],
        endMs: backAt + SWAP_MS + HOLD_MS,
        // The still frame honours a press made in this cycle; a new cycle (replay, control change) takes the stage back.
        still: () => {
          if (!root || (taken.current && takenIn.current === cycleKey)) return
          setTaken(false)
          snap(root, () => setOn(false))
        },
      }
    },
    { playing, replayKey, timeScale, onCycleEnd },
    `${values.pair}|${values.depth}|${values.blur}`,
  )

  // A press swaps the icon and ends the cycle; the stage then rests as the visitor leaves it. It is a real button, so
  // Enter and Space swap it too, with the same animation: the change is one the user caused. Play and the heart
  // toggle; copy sets the check, announces it, and reverts on a timer (a repeat press restarts the timer).
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const button = (e.target as HTMLElement).closest<HTMLElement>('[data-icon-swap]')
    if (!detail || !button) return
    if (!taken.current) setTaken(true)
    if (!pair.status) {
      setOn(button.dataset.on !== 'true')
      return
    }
    setOn(true)
    announce(pair.status)
    revert.current = setTimeout(() => setOn(false), scaled(REVERT_MS, timeScale))
  }

  const vars = {
    '--d': `${scaled(SWAP_MS, timeScale)}ms`,
    '--e': EASE,
    '--s': String(scaleOf(values)),
    '--b': `${blurOf(values)}px`,
  } as CSSProperties
  const face = `group/button inline-flex shrink-0 items-center justify-center rounded-lg bg-demo text-ink ${detail ? 'size-11' : 'size-8'}`
  const caption = [values.depth === 'fade' ? 'no scale' : `scale ${values.depth}`, values.blur ? `blur ${BLUR_PX}px` : 'no blur', `${SWAP_MS}ms`].join(' · ')
  return (
    <div
      ref={rootRef}
      style={vars}
      data-taken-over="false"
      onClick={onClick}
      className={`group/stage flex h-full flex-col items-center justify-center ${detail ? 'gap-3 px-4' : 'gap-2 px-3'}`}
    >
      <div className={`flex w-full flex-col ${detail ? 'max-w-[280px] gap-2' : 'max-w-[200px] gap-1.5'}`}>
        <div className={`flex items-center justify-center rounded-lg bg-demo ${detail ? 'h-40 px-4 sm:h-48' : 'h-[112px] px-3'}`}>
          {/* A row with the action at its end, so the icon is the state of something: a snippet to copy, a track to
              play, a post to like. */}
          <div className={`flex w-full items-center rounded-xl bg-surface shadow-card ${detail ? 'max-w-[240px] gap-3 p-2 pl-3.5' : 'max-w-[160px] gap-2 p-1.5 pl-2.5'}`}>
            {detail ? (
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={`min-w-0 truncate text-ink ${ROWS[values.pair].mono ? 'font-mono text-[12px]' : 'text-[13px]'}`}>{ROWS[values.pair].title}</span>
                <span className="min-w-0 truncate text-[12px] text-ink-muted">{ROWS[values.pair].line}</span>
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="h-1.5 w-3/4 rounded-full bg-demo-subject" />
                <span className="h-1.5 w-1/2 rounded-full bg-demo-2" />
              </div>
            )}
            {detail ? (
              // 44px: the whole button is the hit area. The name says what pressing it does; the state is reported by
              // the name (play), aria-pressed (heart) or the always-mounted status region beside it (copy).
              <>
                <button
                  type="button"
                  data-icon-swap=""
                  data-on="false"
                  aria-label={pair.label[0]}
                  aria-pressed={pair.toggle ? false : undefined}
                  className={`${face} press cursor-pointer`}
                >
                  <Icons pair={values.pair} size={size} />
                </button>
                <span role="status" data-swap-status="" className="sr-only" />
              </>
            ) : (
              <div data-icon-swap="" data-on="false" className={face}>
                <Icons pair={values.pair} size={size} />
              </div>
            )}
          </div>
        </div>
        {/* On the card the label sits above the frame, clear of the play button that reduced motion adds. */}
        <p data-swap-label="" className={`font-mono tabular-nums text-ink-muted ${detail ? 'text-[11px]' : 'order-first text-[10px]'}`}>
          {caption}
        </p>
      </div>
      {detail && (
        <p aria-hidden className="font-mono text-[11px] text-ink-muted">
          {HINT}
        </p>
      )}
    </div>
  )
}

function IconSwapGlyph({ active }: GlyphProps) {
  return (
    <GlyphSvg kind="icon-swap" active={active}>
      <circle className="m a" cx="6" cy="6" r="1.7" fill="currentColor" />
      {/* The rotation sits on a group: the keyframes own the rect's transform, so a rotate there would be overridden. */}
      <g transform="rotate(45 6 6)">
        <rect className="m b" x="4.3" y="4.3" width="3.4" height="3.4" rx=".6" fill="currentColor" opacity="0" />
      </g>
    </GlyphSvg>
  )
}

/** The incoming icon's move, as the prompt states it. */
function swapText(v: V): string {
  const parts: string[] = []
  if (v.depth === 'fade') parts.push('`opacity` 0 to 1 only, no scale (a flicker; the house ships `scale` 0.3 to 1)')
  else if (v.depth === '0.8') parts.push('`scale` 0.8 to 1 (a glitch; the house ships 0.3), `opacity` 0 to 1')
  else parts.push('`scale` 0.3 to 1, `opacity` 0 to 1')
  parts.push(v.blur ? '`filter: blur(3px)` to `blur(0px)`' : 'no blur (the house adds `filter: blur(3px)` to `blur(0px)`)')
  return parts.join(', ')
}

/** The hidden icon's declarations, CSS route. */
function hiddenCss(v: V): string[] {
  return [
    'opacity: 0;',
    ...(v.depth === 'fade' ? [] : [`transform: scale(${scaleOf(v)});`]),
    ...(v.blur ? [`filter: blur(${BLUR_PX}px);`] : []),
  ]
}

/** Only the properties that change: a fade-only swap transitions `opacity` alone. */
function transitioned(v: V): string {
  return ['opacity', ...(v.depth === 'fade' ? [] : ['transform']), ...(v.blur ? ['filter'] : [])].join(', ')
}

/** The properties reduced motion must not transition, as the prompt names them. */
function dropped(v: V): string[] {
  return [...(v.depth === 'fade' ? [] : ['`scale`']), ...(v.blur ? ['`filter`'] : [])]
}

/** The reduced-motion override, CSS route: only what the variant animates. */
function reducedCss(v: V): string {
  return [...(v.depth === 'fade' ? [] : ['transform: none']), ...(v.blur ? ['filter: none'] : [])].join('; ')
}

/** The hidden and shown states, Motion route. */
function motionStates(v: V): { hidden: string; shown: string } {
  const hidden = ['opacity: 0', ...(v.depth === 'fade' ? [] : [`scale: ${scaleOf(v)}`]), ...(v.blur ? [`filter: 'blur(${BLUR_PX}px)'`] : [])]
  const shown = ['opacity: 1', ...(v.depth === 'fade' ? [] : ['scale: 1']), ...(v.blur ? ["filter: 'blur(0px)'"] : [])]
  return { hidden: `{ ${hidden.join(', ')} }`, shown: `{ ${shown.join(', ')} }` }
}

/** The button's reporting and what a second click does, per pair. */
function ariaText(v: V): string {
  const p = PAIRS[v.pair]
  if (p.status) {
    return `\`aria-label="${p.label[0]}"\` stays. Set ${p.state} and announce \`${p.status}\` (\`role="status"\`) on the click, not when the swap settles; revert after ${REVERT_MS / 1000}s (a second click restarts it).`
  }
  if (p.toggle) return `\`aria-label="${p.label[0]}"\` and \`aria-pressed\` for the state, set on the click, not when the swap settles; a second click unsets it.`
  return `\`aria-label\` \`${p.label[0]}\`, then \`${p.label[1]}\`, set on the click, not when the swap settles; a second click swaps back.`
}

function cssCode(v: V): string {
  const p = PAIRS[v.pair]
  const hidden = hiddenCss(v)
  const reducedLines = [...(v.depth === 'fade' ? [] : ['    transform: none;']), ...(v.blur ? ['    filter: none;'] : [])]
  const onClick = p.status
    ? [
        `   </button>. On click, set data-on="true", announce ${p.status} in a role="status"`,
        `   region and revert after ${REVERT_MS / 1000}s (a second click restarts the timer); the`,
        `   name stays ${p.label[0]}. Both icons stay mounted, so a click mid-swap turns back`,
        '   from where it is. */',
      ]
    : p.toggle
      ? [
          '   </button>. On click, toggle data-on="true" and aria-pressed. Both icons stay',
          '   mounted, so a click mid-swap turns back from where it is. */',
        ]
      : [
          `   </button>. On click, toggle data-on="true" and set aria-label to ${p.label[1]},`,
          `   back to ${p.label[0]} on the next. Both icons stay mounted, so a click mid-swap`,
          '   turns back from where it is. */',
        ]
  return [
    `/* Markup: <button class="icon-button" type="button" ${p.toggle ? `aria-label="${p.label[0]}" aria-pressed="false"` : `aria-label="${p.label[0]}"`}>`,
    `     <svg class="icon icon-a">…</svg>  <!-- ${p.from}, in flow -->`,
    `     <svg class="icon icon-b">…</svg>  <!-- ${p.to}, layered over it -->`,
    ...onClick,
    '.icon-button {',
    '  position: relative;',
    '  display: inline-grid;',
    '  place-items: center;',
    '  width: 44px; /* the hit area, whatever the icon size */',
    '  height: 44px;',
    '}',
    '.icon-b {',
    '  position: absolute;',
    '  inset: 0;',
    '  margin: auto;',
    '}',
    '.icon {',
    '  width: 16px;',
    '  height: 16px;',
    `  transition-property: ${transitioned(v)};`,
    `  transition-duration: ${SWAP_MS}ms;`,
    `  transition-timing-function: ${EASE}; /* a firm ease-out, standing in for the spring */`,
    '}',
    ...(v.depth === 'fade'
      ? ['/* The hidden icon only fades, which reads as a flicker; the house shrinks it to scale(0.3) too. */']
      : v.depth === '0.8'
        ? ['/* The hidden icon. 0.8 is timid and reads as a glitch; the house ships 0.3. */']
        : ['/* The hidden icon. scale(0.3), not 0.8: a deep scale reads as a swap, a timid one as a glitch. */']),
    ...(v.blur ? [] : ['/* No blur here; the house adds filter: blur(3px) to bridge the two shapes. */']),
    '.icon-b,',
    '.icon-button[data-on="true"] .icon-a {',
    ...hidden.map((l) => `  ${l}`),
    '}',
    '.icon-button[data-on="true"] .icon-b {',
    '  opacity: 1;',
    ...(v.depth === 'fade' ? [] : ['  transform: none;']),
    ...(v.blur ? ['  filter: blur(0px);'] : []),
    '}',
    '',
    ...(reducedLines.length > 0
      ? ['/* Reduced motion: the fade stays, the scale and blur go. The state selectors', '   are repeated so this outranks them. */']
      : ['/* Reduced motion: already opacity only, so the fade stays as it is. */']),
    '@media (prefers-reduced-motion: reduce) {',
    ...(reducedLines.length > 0
      ? ['  .icon-b,', '  .icon-button[data-on="true"] .icon-a {', ...reducedLines, '  }']
      : ['  .icon {', `    transition-duration: ${SWAP_MS}ms;`, '  }']),
    '}',
  ].join('\n')
}

function motionCode(v: V): string {
  const p = PAIRS[v.pair]
  const { hidden, shown } = motionStates(v)
  const [IconA, IconB] = p.icons
  const iconA = `<${IconA} size={16} aria-hidden />`
  const iconB = p.toggle ? `<${IconB} size={16} fill="currentColor" aria-hidden />` : `<${IconB} size={16} aria-hidden />`
  const setter = `set${cap(p.state)}`
  const fadeOnly = v.depth === 'fade' && !v.blur
  const reverts = Boolean(p.status)
  // The copy pair sets its state and reverts on a timer; the others toggle.
  const click = reverts
    ? [
        `  // Not a toggle: the check reverts on a timer; the name stays and the status region announces.`,
        '  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)',
        '  useEffect(() => () => clearTimeout(timer.current), [])',
        `  const ${p.from} = () => {`,
        `    ${setter}(true)`,
        '    clearTimeout(timer.current)',
        `    timer.current = setTimeout(() => ${setter}(false), ${REVERT_MS})`,
        '  }',
      ]
    : []
  const button = [
    '<button',
    '  type="button"',
    '  style={box}',
    ...(p.toggle
      ? [`  aria-label="${p.label[0]}"`, `  aria-pressed={${p.state}}`]
      : reverts
        ? [`  aria-label="${p.label[0]}"`]
        : [`  aria-label={${p.state} ? '${p.label[1]}' : '${p.label[0]}'}`]),
    reverts ? `  onClick={${p.from}}` : `  onClick={() => ${setter}(!${p.state})}`,
    '>',
    '  {/* initial={false}: no swap on page load; the first icon is painted at rest. */}',
    '  <AnimatePresence mode="popLayout" initial={false}>',
    '    <motion.span',
    `      key={${p.state} ? '${p.to}' : '${p.from}'}`,
    "      style={{ display: 'grid' }}",
    '      initial={hidden}',
    '      animate={shown}',
    '      exit={hidden}',
    '      transition={swap}',
    '    >',
    `      {${p.state} ? ${iconB} : ${iconA}}`,
    '    </motion.span>',
    '  </AnimatePresence>',
    '</button>',
  ]
  const tree = reverts
    ? ['    <>', ...button.map((l) => `      ${l}`), `      <span role="status" style={hiddenText}>{${p.state} ? '${p.status}' : ''}</span>`, '    </>']
    : button.map((l) => `    ${l}`)
  return [
    `import { ${[...new Set(p.icons)].join(', ')} } from 'lucide-react'`,
    fadeOnly ? "import { AnimatePresence, motion } from 'motion/react'" : "import { AnimatePresence, motion, useReducedMotion } from 'motion/react'",
    reverts ? "import { useEffect, useRef, useState } from 'react'" : "import { useState } from 'react'",
    '',
    '// Bounce 0: an icon is not a toy.',
    `const swap = ${SPRING.replace(/"/g, "'")} as const`,
    '// A 44px grid box (the hit area): popLayout places the leaving icon against it,',
    '// so the two icons coincide and the layout never shifts.',
    "const box = { position: 'relative', display: 'grid', placeItems: 'center', inlineSize: 44, blockSize: 44 } as const",
    ...(reverts
      ? ["const hiddenText = { position: 'absolute', inlineSize: 1, blockSize: 1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' } as const"]
      : []),
    '',
    `export function ${p.component}() {`,
    `  const [${p.state}, ${setter}] = useState(false)`,
    ...click,
    ...(fadeOnly
      ? [
          '  // Already opacity only, so nothing for reduced motion to drop; the house gates',
          '  // its scale and blur with useReducedMotion().',
          `  const hidden = ${hidden}`,
          `  const shown = ${shown}`,
        ]
      : ['  // Reduced motion: opacity only, same duration.', '  const reduced = useReducedMotion()', `  const hidden = reduced ? { opacity: 0 } : ${hidden}`, `  const shown = reduced ? { opacity: 1 } : ${shown}`]),
    '  return (',
    ...tree,
    '  )',
    '}',
  ].join('\n')
}

export default defineTerm({
  slug: 'icon-swap',
  name: 'Icon Swap',
  category: 'transitions',
  order: 7,
  status: 'published',
  definition: 'One icon turns into another in place with a quick scale, fade and blur, like copy becoming a check.',
  aliases: ['icon transition', 'copy to check', 'play to pause', 'icon cross-fade', 'icon change animation'],
  description:
    'An icon that changes with state deserves more than a visibility toggle, and less than a flourish. The incoming icon grows from 30% while it fades in, with a 3px blur sharpening away; the outgoing one does the reverse at the same time, in the same spot, so the change reads as one icon becoming another. The depth of the scale does the work: 0.3 reads as a swap, 0.8 reads as a glitch, and no scale reads as a flicker. The blur bridges the two shapes. A bounce-free spring, or a firm 300ms ease-out, carries it; bounce on an icon is a toy. Nothing swaps on page load: the icon for the first state is just there.',
  useWhen: [
    'State icons on buttons: copy to check, play to pause, like to liked, mute to unmute.',
    'Loading to success and other indicators that change in place.',
    'Icons inside contextual toolbars and actions revealed on hover.',
  ],
  avoidWhen: [
    'Permanent navigation icons and decorative marks: nothing changes, so nothing swaps.',
    'The first paint. The icon for the initial state is rendered at rest, with no entrance.',
    'Text labels. Swap words with a crossfade or a plain change, not a scale.',
    'Any bounce or overshoot. An icon that wobbles reads as a toy.',
    'A timid scale (0.8 to 0.9) or none, which read as a glitch or a flicker. Without blur, the two shapes show at once.',
  ],
  demo: {
    component: IconSwapDemo,
    label:
      'On the entry page, a row holds the thing the button acts on and the icon button at its end: an install command (npm install motion) with a copy button, a podcast episode with a play button, or a post with a heart. The icon shrinks deep, fades and blurs away while the other grows into its place, sharp and settled within 300ms; it holds, then swaps back the same way. Beside the frame, the values of the swap. The button is real: pressing it swaps the icon and reports the state (the copy button announces Copied and reverts after 1.5 seconds). The pair can be copy to check, play to pause or an outline heart filling in; the depth runs from the house 0.3 to a timid 0.8 to no scale at all, and the blur can be switched off. The index card is a wireframe of the same row: two bars and the button, no text.',
    controls,
    glyph: IconSwapGlyph,
  },
  prompt: (v) => {
    const p = PAIRS[v.pair]
    const hidden = hiddenCss(v)
    const { hidden: mHidden, shown: mShown } = motionStates(v)
    return [
      `Swap this button's icon when its state changes: ${p.from} to ${p.to}.`,
      '',
      `- The incoming icon ${swapText(v)}; the outgoing icon the reverse, together, in the same spot. Bounce 0.`,
      `- The button: \`<button type="button">\`, \`position: relative; display: grid; place-items: center\`, 44px square; icons 16px. ${ariaText(v)}`,
      `- CSS route: both icons in the button, the first state's in flow, the other \`position: absolute; inset: 0; margin: auto; width: 16px; height: 16px\`; nothing unmounts. \`data-on="true"\` on the button (\`"false"\` off) picks the shown one; the hidden one holds \`${hidden.join(' ')}\`. \`transition-property: ${transitioned(v)}\`, ${SWAP_MS}ms, \`${EASE}\`.`,
      `- Motion route: in the button, \`<AnimatePresence mode="popLayout" initial={false}>\` around one \`motion.span\`, \`display: grid\`, keyed by the state; \`initial\` and \`exit\` \`${mHidden}\`, \`animate\` \`${mShown}\`, \`transition={${SPRING}}\`.`,
      "- No swap on page load: the first icon is painted at rest (`initial={false}`).",
      v.depth === 'fade' && !v.blur
        ? '- Reduced motion: as the default, `opacity` only over the same duration; no `transform` or `filter` transition is declared.'
        : `- Reduced motion: \`opacity\` only, same duration. CSS: \`${reducedCss(v)}\`, repeating the state selectors (or \`!important\`), or \`[data-on="true"]\` wins; Motion: \`useReducedMotion()\` drops ${dropped(v).join(' and ')}.`,
    ].join('\n')
  },
  acceptance: (v) => {
    const p = PAIRS[v.pair]
    const sc = scaleOf(v)
    const hiddenTransform = v.depth === 'fade' ? '`none`' : `\`matrix(${sc}, 0, 0, ${sc}, 0, 0)\``
    const hiddenFilter = v.blur ? `\`blur(${BLUR_PX}px)\`` : '`none`'
    const shownFilter = v.blur ? '`none` (or `blur(0px)`)' : '`none`'
    // One-sided settle times let a 150ms swap pass: the curve's 90% point is near 200ms, so that is the floor.
    const settle = `settled (within 0.01) by ${SWAP_MS}ms (Motion: 350ms) and not before 200ms from the first animated frame (the first frame where the incoming icon's \`opacity\` is above 0)`
    const noJump = "no frame steps more than the swap's own largest step"
    return [
      `CSS route: the hidden icon's computed \`opacity\` is \`0\`, \`transform\` ${hiddenTransform} and \`filter\` ${hiddenFilter}; the shown icon's are \`1\`, \`none\` and ${shownFilter}; both have \`transition-duration\` \`${SWAP_MS / 1000}s\`${v.depth === 'fade' && !v.blur ? ' and transition `opacity` alone' : ''}.`,
      v.depth === 'fade'
        ? `Sampled every frame from the click, the incoming icon's \`opacity\` rises from 0 to 1 and is ${settle}; its \`transform\` stays \`none\`.`
        : `Sampled every frame from the click, the incoming icon's scale rises from about ${sc} toward 1 without passing it and its \`opacity\` from 0 to 1; both are ${settle}.`,
      "The button's `offsetWidth` and `offsetHeight` never change during the swap, and the two icons' boxes coincide.",
      'On page load nothing animates: `getAnimations()` on both icons is empty and the resting icon has `opacity` 1 in the first frame.',
      p.status
        ? `Clicked again while \`${p.status}\` is showing, the timer restarts and nothing visible changes; clicked while swapping back, it turns around from where it is with no jump (${noJump}).`
        : `Clicked again mid-swap, it turns back from where it is with no jump (${noJump}).`,
      'Enter and Space swap it with the same animation.',
      p.status
        ? `\`aria-label\` stays \`${p.label[0]}\`; the \`role="status"\` region reads \`${p.status}\` on the click, and the icon reverts ${REVERT_MS / 1000}s (±100ms) later; the button's hit area is at least 44 × 44px.`
        : p.toggle
          ? `\`aria-label\` stays \`${p.label[0]}\` and \`aria-pressed\` reads \`false\` before the click, \`true\` after and \`false\` after the next; the button's hit area is at least 44 × 44px.`
          : `\`aria-label\` reads \`${p.label[0]}\` before the click, \`${p.label[1]}\` after and \`${p.label[0]}\` after the next; the button's hit area is at least 44 × 44px.`,
      v.depth === 'fade' && !v.blur
        ? `With reduced motion on, the swap is unchanged: \`opacity\` fades over the route's own duration (${SWAP_MS}ms CSS, 0.35s Motion) from the first animated frame, and no \`transform\` or \`filter\` transition is declared.`
        : `With reduced motion on, computed \`transform\` is \`none\` and \`filter\` is ${shownFilter} in every frame, while \`opacity\` fades over the route's own duration (${SWAP_MS}ms CSS, 0.35s Motion) from the first animated frame.`,
    ]
  },
  code: (v) => ({ css: cssCode(v), motion: motionCode(v) }),
  a11y:
    'An icon-only button needs an `aria-label` that names the action, and a 44px hit area whatever the icon size. Report the swap on the click, not when the animation settles, so assistive tech never waits for it: a copy button keeps its name and announces `Copied` in an always-mounted `role="status"` region, then reverts after about 1.5s; play to pause swaps the name; a toggle like Like keeps its name and flips `aria-pressed`. Enter and Space swap it like a click. Under reduced motion, keep the fade and drop the scale and blur.',
  related: ['overshoot', 'duration', 'ease-out', 'press-scale', 'crossfade'],
  confusedWith: [
    {
      slug: 'crossfade',
      difference: 'Crossfade fades two things in place; an icon swap adds depth with scale and blur so the change reads as one icon becoming another.',
    },
  ],
  sources: [
    { label: 'Jakub Krehel: Details that make interfaces feel better', url: 'https://jakub.kr/writing/details-that-make-interfaces-feel-better' },
    { label: 'Emil Kowalski: 7 Practical Animation Tips', url: 'https://emilkowal.ski/ui/7-practical-animation-tips' },
    { label: 'Motion: AnimatePresence', url: 'https://motion.dev/docs/react-animate-presence' },
  ],
})
