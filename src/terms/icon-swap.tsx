import { Check, Copy, Heart, Pause, Play, type LucideProps } from 'lucide-react'
import { useRef, type ComponentType, type CSSProperties, type MouseEvent } from 'react'
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
  /** the Motion tab's state name, component name and lucide imports */
  state: string
  component: string
  icons: [string, string]
}

const PAIRS: Record<Pair, PairSpec> = {
  copy: { from: 'copy', to: 'check', A: Copy, B: Check, label: ['Copy', 'Copied'], toggle: false, state: 'copied', component: 'CopyButton', icons: ['Copy', 'Check'] },
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
  const pair = PAIRS[values.pair]
  const cycleKey = `${replayKey}|${values.pair}|${values.depth}|${values.blur}`
  const detail = size === 'detail'

  const buttonOf = () => rootRef.current?.querySelector<HTMLElement>('[data-icon-swap]') ?? null

  // The state lives on the button: data-on for the icons, and the accessible name or aria-pressed for assistive tech,
  // set on the press, never when the swap settles.
  const setOn = (on: boolean) => {
    const button = buttonOf()
    if (!button) return
    button.dataset.on = String(on)
    if (button.hasAttribute('aria-pressed')) button.setAttribute('aria-pressed', String(on))
    else if (button.hasAttribute('aria-label')) button.setAttribute('aria-label', pair.label[on ? 1 : 0])
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
  // Enter and Space swap it too, with the same animation: the change is one the user caused.
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const button = (e.target as HTMLElement).closest<HTMLElement>('[data-icon-swap]')
    if (!detail || !button) return
    if (!taken.current) setTaken(true)
    setOn(button.dataset.on !== 'true')
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
            <div className={`flex min-w-0 flex-1 flex-col ${detail ? 'gap-2' : 'gap-1.5'}`}>
              <span className="h-1.5 w-3/4 rounded-full bg-demo-subject" />
              <span className="h-1.5 w-1/2 rounded-full bg-demo-2" />
            </div>
            {detail ? (
              // 44px: the whole button is the hit area. The name says what pressing it does, and changes with the state.
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
      <rect className="m b" x="4.3" y="4.3" width="3.4" height="3.4" rx=".6" fill="currentColor" opacity="0" transform="rotate(45 6 6)" />
    </GlyphSvg>
  )
}

/** The incoming icon's move, as the prompt states it. */
function swapText(v: V): string {
  const parts: string[] = []
  if (v.depth === 'fade') parts.push('`opacity` 0 to 1 only, no scale (it reads as a flicker; the house ships `scale` 0.3 to 1)')
  else if (v.depth === '0.8') parts.push('`scale` 0.8 to 1 (timid: it reads as a glitch; the house ships 0.3), `opacity` 0 to 1')
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

/** The hidden and shown states, Motion route. */
function motionStates(v: V): { hidden: string; shown: string } {
  const hidden = ['opacity: 0', ...(v.depth === 'fade' ? [] : [`scale: ${scaleOf(v)}`]), ...(v.blur ? [`filter: 'blur(${BLUR_PX}px)'`] : [])]
  const shown = ['opacity: 1', ...(v.depth === 'fade' ? [] : ['scale: 1']), ...(v.blur ? ["filter: 'blur(0px)'"] : [])]
  return { hidden: `{ ${hidden.join(', ')} }`, shown: `{ ${shown.join(', ')} }` }
}

function ariaText(v: V): string {
  const p = PAIRS[v.pair]
  return p.toggle ? `\`aria-label="${p.label[0]}"\` and \`aria-pressed\` for the state` : `\`aria-label\` \`${p.label[0]}\`, then \`${p.label[1]}\``
}

function cssCode(v: V): string {
  const p = PAIRS[v.pair]
  const hidden = hiddenCss(v)
  const reducedLines = [...(v.depth === 'fade' ? [] : ['    transform: none;']), ...(v.blur ? ['    filter: none;'] : [])]
  return [
    `/* Markup: <button class="icon-button" type="button" ${p.toggle ? `aria-label="${p.label[0]}" aria-pressed="false"` : `aria-label="${p.label[0]}"`}>`,
    `     <svg class="icon icon-a">…</svg>  <!-- ${p.from}, in flow: it sets the size -->`,
    `     <svg class="icon icon-b">…</svg>  <!-- ${p.to}, layered over it -->`,
    `   </button>. On click, toggle data-on and ${p.toggle ? 'aria-pressed' : `set aria-label to ${p.label[1]}`}. Both icons`,
    '   stay mounted, so the swap back animates the same way, and a second click',
    '   mid-swap turns back from where it is. */',
    '.icon-button {',
    '  position: relative;',
    '  display: inline-grid;',
    '  place-items: center;',
    '  width: 44px; /* the hit area */',
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
    '  transition-property: opacity, transform, filter;',
    `  transition-duration: ${SWAP_MS}ms;`,
    `  transition-timing-function: ${EASE}; /* a firm ease-out, standing in for the spring */`,
    '}',
    ...(v.depth === 'fade'
      ? ['/* The hidden icon only fades: it reads as a flicker. The house shrinks it to', '   scale(0.3) as well. */']
      : v.depth === '0.8'
        ? ['/* The hidden icon: faded and shrunk a little. 0.8 is timid and reads as a', '   glitch; the house ships 0.3. */']
        : ['/* The hidden icon: shrunk deep, faded, soft. 0.3, not 0.8: a timid scale', '   reads as a glitch. */']),
    ...(v.blur ? [] : ['/* No blur here; the house adds filter: blur(3px), which bridges the two. */']),
    '.icon-b,',
    '.icon-button[data-on] .icon-a {',
    ...hidden.map((l) => `  ${l}`),
    '}',
    '.icon-button[data-on] .icon-b {',
    '  opacity: 1;',
    ...(v.depth === 'fade' ? [] : ['  transform: none;']),
    ...(v.blur ? ['  filter: blur(0px);'] : []),
    '}',
    '',
    `/* Reduced motion: a fade over the same ${SWAP_MS}ms${reducedLines.length > 0 ? ', no scale and no blur' : ''}. */`,
    '@media (prefers-reduced-motion: reduce) {',
    ...(reducedLines.length > 0
      ? ['  .icon-b,', '  .icon-button[data-on] .icon-a {', ...reducedLines, '  }']
      : ['  /* Already opacity only: nothing to drop. */', '  .icon {', `    transition-duration: ${SWAP_MS}ms;`, '  }']),
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
  return [
    `import { ${[...new Set(p.icons)].join(', ')} } from 'lucide-react'`,
    fadeOnly ? "import { AnimatePresence, motion } from 'motion/react'" : "import { AnimatePresence, motion, useReducedMotion } from 'motion/react'",
    "import { useState } from 'react'",
    '',
    '// Bounce 0: an icon is not a toy.',
    `const swap = ${SPRING.replace(/"/g, "'")} as const`,
    '',
    `export function ${p.component}() {`,
    `  const [${p.state}, ${setter}] = useState(false)`,
    ...(fadeOnly
      ? [
          '  // Already opacity only, so reduced motion changes nothing here; useReducedMotion()',
          '  // would gate the scale and blur the house adds.',
          `  const hidden = ${hidden}`,
          `  const shown = ${shown}`,
        ]
      : ['  // Reduced motion: opacity only, same duration.', '  const reduced = useReducedMotion()', `  const hidden = reduced ? { opacity: 0 } : ${hidden}`, `  const shown = reduced ? { opacity: 1 } : ${shown}`]),
    '  return (',
    '    <button',
    '      type="button"',
    '      className="icon-button"',
    ...(p.toggle
      ? [`      aria-label="${p.label[0]}"`, `      aria-pressed={${p.state}}`]
      : [`      aria-label={${p.state} ? '${p.label[1]}' : '${p.label[0]}'}`]),
    `      onClick={() => ${setter}(!${p.state})}`,
    '    >',
    '      {/* initial={false}: the first icon is painted at rest, no swap on page load.',
    '          popLayout takes the leaving icon out of flow, so the two overlap. */}',
    '      <AnimatePresence mode="popLayout" initial={false}>',
    `        <motion.span key={${p.state} ? '${p.to}' : '${p.from}'} className="icon" initial={hidden} animate={shown} exit={hidden} transition={swap}>`,
    `          {${p.state} ? ${iconB} : ${iconA}}`,
    '        </motion.span>',
    '      </AnimatePresence>',
    '    </button>',
    '  )',
    '}',
  ].join('\n')
}

export default defineTerm({
  slug: 'icon-swap',
  name: 'Icon Swap',
  category: 'transitions',
  order: 7,
  status: 'review',
  definition: 'One icon turns into another in place with a quick scale, fade and blur, like copy becoming a check.',
  aliases: ['icon transition', 'copy to check', 'play to pause', 'icon morph', 'icon cross-fade', 'icon change animation'],
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
    'A timid scale (0.8 to 0.9) or no blur, which read as a glitch or a flicker.',
  ],
  demo: {
    component: IconSwapDemo,
    label:
      'A single icon button sits in a frame, showing a copy icon. The icon shrinks deep, fades and blurs away while a check grows into its place, sharp and settled within 300ms; it holds, then swaps back the same way. Under the frame, the values of the swap. On the entry page the button is real: pressing it swaps the icon and updates its label. The pair can be copy to check, play to pause or an outline heart filling in; the depth runs from the house 0.3 to a timid 0.8 to no scale at all, and the blur can be switched off.',
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
      `- The swap: the incoming icon ${swapText(v)}; the outgoing icon the reverse, at the same time, in the same spot. Bounce 0, no back curve.`,
      `- CSS route: render both icons; the resting one in flow (it sets the size), the other \`position: absolute; inset: 0\`; nothing unmounts. \`data-on\` on the button picks the shown one; the hidden one holds \`${hidden.join(' ')}\`. \`transition-property: opacity, transform, filter\`, ${SWAP_MS}ms, \`${EASE}\`.`,
      `- Motion route: \`<AnimatePresence mode="popLayout" initial={false}>\` around one \`motion.span\` keyed by the state; \`initial\` and \`exit\` \`${mHidden}\`, \`animate\` \`${mShown}\`, \`transition={${SPRING}}\`.`,
      '- No swap on page load: the icon for the first state is painted at rest (`initial={false}`).',
      `- The button: \`<button type="button">\`, a 44px hit area, ${ariaText(v)}, set on the click, not when the swap settles. Enter and Space swap it like a click.`,
      v.depth === 'fade' && !v.blur
        ? '- Reduced motion: already `opacity` only; keep the same duration.'
        : `- Reduced motion: \`opacity\` only, same duration. CSS: \`transform: none; filter: none\` on both icons; Motion: \`useReducedMotion()\` drops${v.depth === 'fade' ? '' : ' `scale`'}${v.depth !== 'fade' && v.blur ? ' and' : ''}${v.blur ? ' `filter`' : ''}.`,
    ].join('\n')
  },
  acceptance: (v) => {
    const p = PAIRS[v.pair]
    const sc = scaleOf(v)
    const hiddenTransform = v.depth === 'fade' ? '`none`' : `\`matrix(${sc}, 0, 0, ${sc}, 0, 0)\``
    const hiddenFilter = v.blur ? `\`blur(${BLUR_PX}px)\`` : '`none`'
    return [
      `CSS route: the hidden icon's computed \`opacity\` is \`0\`, \`transform\` ${hiddenTransform} and \`filter\` ${hiddenFilter}; the shown icon's are \`1\`, \`none\` and \`none\` (or \`blur(0px)\`); both have \`transition-duration\` \`${SWAP_MS / 1000}s\`.`,
      v.depth === 'fade'
        ? `Sampled every frame from the click, the incoming icon's \`opacity\` rises from 0 to 1 and is settled (within 0.01) by ${SWAP_MS}ms (Motion: 350ms) from the first animated frame; its \`transform\` stays \`none\`.`
        : `Sampled every frame from the click, the incoming icon's scale rises from about ${sc} toward 1 without passing it and its \`opacity\` from 0 to 1; both are settled (within 0.01) by ${SWAP_MS}ms (Motion: 350ms) from the first animated frame.`,
      "The button's `offsetWidth` and `offsetHeight` never change during the swap, and the two icons' boxes coincide.",
      'On page load nothing animates: `getAnimations()` on both icons is empty and the resting icon has `opacity` 1 in the first frame.',
      'Clicked again mid-swap, it turns back from where it is: no jump to either end.',
      'Enter and Space swap it with the same animation.',
      p.toggle
        ? `\`aria-label\` stays \`${p.label[0]}\` and \`aria-pressed\` reads \`false\` before the click and \`true\` after; the button's hit area is at least 44 × 44px.`
        : `\`aria-label\` reads \`${p.label[0]}\` before the click and \`${p.label[1]}\` after; the button's hit area is at least 44 × 44px.`,
      v.depth === 'fade' && !v.blur
        ? `With reduced motion on, the swap is unchanged: \`opacity\` fades over ${SWAP_MS}ms.`
        : `With reduced motion on, computed \`transform\` and \`filter\` are \`none\` in every frame while \`opacity\` still fades over ${SWAP_MS}ms.`,
    ]
  },
  code: (v) => ({ css: cssCode(v), motion: motionCode(v) }),
  a11y:
    'An icon-only button needs an `aria-label` that names the action, and a 44px hit area whatever the icon size. When the icon swaps, update the label (`Copy` to `Copied`) or `aria-pressed` for a toggle on the click, not when the animation settles, so assistive tech never waits for it. Enter and Space swap it like a click. Under reduced motion, keep the fade and drop the scale and blur.',
  related: ['overshoot', 'duration', 'ease-out', 'press-scale', 'crossfade'],
  confusedWith: [
    {
      slug: 'crossfade',
      difference: 'Crossfade fades two things in place; an icon swap adds depth with scale and blur so the change reads as one icon becoming another.',
    },
  ],
  sources: [
    { label: 'Emil Kowalski: Great Animations', url: 'https://emilkowal.ski/ui/great-animations' },
    { label: 'Motion: AnimatePresence', url: 'https://motion.dev/docs/react-animate-presence' },
  ],
})
