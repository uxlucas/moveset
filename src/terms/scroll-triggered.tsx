import { Clock, Download, Globe, Keyboard, Layers, Lock, Search, Share2, Shield, Tag, WifiOff, Zap, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { BrowserFrame } from '@/components/demo/browser-frame'
import { scaled } from '@/components/demo/playback'
import { useAutoScroll, type TrackPoint } from '@/components/demo/use-auto-scroll'
import { GlyphSvg } from '@/components/site/glyph'
import { defineTerm, type Control, type ControlValues, type DemoProps, type GlyphProps } from '@/lib/term-types'
import { TOKENS } from '@/lib/tokens'

const controls = [
  {
    id: 'duration',
    type: 'select',
    label: 'Duration',
    options: [
      { value: '300', label: '300ms' },
      { value: '500', label: '500ms' },
      { value: '800', label: '800ms' },
    ],
    default: '500',
  },
  {
    id: 'easing',
    type: 'select',
    label: 'Easing',
    options: [
      { value: 'out', label: 'Ease-out' },
      { value: 'inout', label: 'Ease-in-out' },
      { value: 'spring', label: 'Spring' },
    ],
    default: 'out',
  },
  { id: 'stagger', type: 'toggle', label: 'Stagger', default: true },
] as const satisfies readonly Control[]

type V = ControlValues<typeof controls>
type Easing = V['easing']

// The observed card never moves (only its inner box does), so this is the share of the card on screen.
const THRESHOLD = 0.15
const TRAVEL = 14
const STAGGER_MS = 60
// Cards entering together step 60ms apart, at most 4 steps, so a fast jump never queues a long wave.
const MAX_STEPS = 4
const TILES = 12
const FAILSAFE_MS = 3000

// The entry page's cards: a landing page's feature grid, one card per tile. At 375px a card's text column is 113px,
// about 18 characters of body: each title fits one line and each body breaks into two, never three, so a card is an
// icon, a title and two lines of body in its 96px.
const FEATURES: { Icon: LucideIcon; title: string; body: string }[] = [
  { Icon: Zap, title: 'Instant sync', body: 'Edits reach every device at once.' },
  { Icon: Shield, title: 'Stays private', body: 'Encrypted on your device first.' },
  { Icon: WifiOff, title: 'Works offline', body: 'Keep writing; it catches up later.' },
  { Icon: Keyboard, title: 'Keyboard first', body: 'Every action has a shortcut.' },
  { Icon: Layers, title: 'Shared layouts', body: 'One template for the whole team.' },
  { Icon: Clock, title: 'Version history', body: 'Every save, back to the first.' },
  { Icon: Globe, title: 'Any language', body: 'Thirty languages in one interface.' },
  { Icon: Search, title: 'Fast search', body: 'Finds notes as you type.' },
  { Icon: Lock, title: 'Locked notes', body: 'A passcode for the private ones.' },
  { Icon: Share2, title: 'Share a link', body: 'Anyone with the link can read.' },
  { Icon: Tag, title: 'Tags', body: 'Sort notes any way you like.' },
  { Icon: Download, title: 'Export anytime', body: 'Markdown, PDF or plain text.' },
]

// Down at an unhurried pace (rows reveal about half a second apart), a short hold, then a quicker way back
// up, which only has to show that nothing replays. With the runtime's 1.2s hold the card loops in 6.8s.
const SOFT = [0.37, 0, 0.63, 1] as const
const TRACK: readonly TrackPoint[] = [
  [0, 0],
  [3600, 1, SOFT],
  [4100, 1, 'linear'],
  [5600, 0, SOFT],
]

// CSS has no spring. These are Motion's { type: 'spring', duration: 0.5, bounce: 0.2 } sampled at even steps.
// A duration-based spring keeps its shape at any duration, so the curve pairs with whichever one is picked.
const SPRING_POINTS = [0, 0.117, 0.344, 0.569, 0.748, 0.872, 0.949, 0.99, 1.009, 1.015, 1.014, 1.011, 1.008, 1.005, 1.002, 1.001, 1]
const SPRING_LINEAR = `linear(${SPRING_POINTS.join(', ')})`

// Rows of `perRow` values for a code block, with commas between rows but not after the last.
const wrapList = (values: readonly number[], perRow: number) =>
  Array.from({ length: Math.ceil(values.length / perRow) }, (_, i) => values.slice(i * perRow, (i + 1) * perRow).join(', ')).map(
    (row, i, rows) => (i < rows.length - 1 ? `${row},` : row),
  )

const EASING: Record<Easing, { token?: string; css: string; motion: (seconds: number) => string }> = {
  out: { token: '--ease-out', css: 'var(--ease-out)', motion: (s) => `{ duration: ${s}, ease: [0.23, 1, 0.32, 1]` },
  inout: { token: '--ease-in-out', css: 'var(--ease-in-out)', motion: (s) => `{ duration: ${s}, ease: [0.77, 0, 0.175, 1]` },
  spring: { css: SPRING_LINEAR, motion: (s) => `{ type: 'spring', duration: ${s}, bounce: 0.2` },
}

// Bumps on Replay and on every control change, so both restart the cycle from the top in the same way.
function useCycleKey(replayKey: number, values: V) {
  const signature = `${replayKey}|${values.duration}|${values.easing}|${values.stagger}`
  const [seen, setSeen] = useState(signature)
  const [cycle, setCycle] = useState(0)
  if (signature !== seen) {
    setSeen(signature)
    setCycle((c) => c + 1)
  }
  return cycle
}

// Fraction of the tile inside the scroller, 0 to 1.
function visibleRatio(tile: HTMLElement, view: DOMRect) {
  const r = tile.getBoundingClientRect()
  return Math.max(0, Math.min(r.bottom, view.bottom) - Math.max(r.top, view.top)) / r.height
}

// The inner box of a tile: the part that animates.
const inner = (tile: HTMLElement) => tile.firstElementChild as HTMLElement

// Reveals each tile once, the first time 15% of it is inside the scroller. The observer watches the outer
// tile, which never moves, and writes data-in on it; the inner box animates. No React state per tile.
// Tiles already in view when a cycle starts are shown without animating, like cards on first paint.
// Off the play path (reduced motion before play, off-screen), it paints a still: tiles in the upper part
// of the window are in, the ones below show as outlines of what comes next.
function useReveals(
  rootRef: RefObject<HTMLDivElement | null>,
  pageRef: RefObject<HTMLDivElement | null>,
  { playing, cycle, timeScale, duration, stagger }: { playing: boolean; cycle: number; timeScale: number; duration: number; stagger: boolean },
) {
  useEffect(() => {
    const root = rootRef.current
    const page = pageRef.current
    if (!root || !page) return
    const tiles = [...root.querySelectorAll<HTMLElement>('[data-tile]')]
    const view = root.getBoundingClientRect()

    // Reset with transitions off, so tiles snap to their start state instead of fading.
    page.style.setProperty('--d', '0ms')
    for (const tile of tiles) {
      tile.dataset.ghost = 'false'
      inner(tile).style.transitionDelay = ''
    }

    if (!playing) {
      const line = root.clientHeight * 0.55
      for (const tile of tiles) {
        const above = tile.getBoundingClientRect().top - view.top < line
        tile.dataset.in = String(above)
        tile.dataset.ghost = String(!above)
      }
      return
    }

    // A new cycle starts at the top. The auto-scroll does this too, but after a visitor takeover it only
    // runs a render later; measuring at the old position would stagger in tiles that belong on screen.
    root.scrollTop = 0
    const waiting: HTMLElement[] = []
    for (const tile of tiles) {
      const inView = visibleRatio(tile, view) > 0
      tile.dataset.in = String(inView)
      if (!inView) waiting.push(tile)
    }
    void page.offsetHeight // commit the start state before transitions come back
    page.style.setProperty('--d', `${scaled(duration, timeScale)}ms`)

    const io = new IntersectionObserver(
      (entries) => {
        const entering = entries.filter((e) => e.isIntersecting && e.intersectionRatio >= THRESHOLD)
        entering.forEach((entry, i) => {
          const tile = entry.target as HTMLElement
          if (stagger) inner(tile).style.transitionDelay = `${scaled(Math.min(i, MAX_STEPS) * STAGGER_MS, timeScale)}ms`
          tile.dataset.in = 'true'
          io.unobserve(tile)
        })
      },
      { root, threshold: THRESHOLD },
    )
    waiting.forEach((tile) => io.observe(tile))
    return () => io.disconnect()
  }, [rootRef, pageRef, playing, cycle, timeScale, duration, stagger])
}

function ScrollTriggeredDemo({ values, playing, replayKey, size, timeScale, onCycleEnd }: DemoProps<V>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const cycle = useCycleKey(replayKey, values)
  // Down, hold, back up: the way up shows that nothing replays. The auto-scroll sets the scroll position
  // before the reveals read it, so the order of these two hooks matters.
  useAutoScroll(scrollRef, {
    playing,
    replayKey: cycle,
    timeScale,
    onCycleEnd,
    interactive: size === 'detail',
    track: TRACK,
    stillAt: 0.42,
  })
  useReveals(scrollRef, pageRef, { playing, cycle, timeScale, duration: Number(values.duration), stagger: values.stagger })
  const detail = size === 'detail'

  // The inner box is what animates (and what the observer leaves alone); on the entry page it is a feature card, on
  // the index card a tile with two bars. A ghost (the still frame's "to come") is the outline of either.
  const box =
    'absolute inset-0 overflow-hidden rounded-md opacity-0 [transform:translateY(14px)] transition-[opacity,transform] duration-(--d) ease-(--e) group-data-[ghost=true]:bg-transparent group-data-[ghost=true]:opacity-100 group-data-[ghost=true]:shadow-[inset_0_0_0_1px_var(--demo-2)] group-data-[ghost=true]:[transform:none] group-data-[in=true]:opacity-100 group-data-[in=true]:[transform:none]'

  return (
    <BrowserFrame scrollRef={scrollRef} size={size} label="Landing page of feature cards that reveal as they scroll into view">
      <div ref={pageRef} style={{ '--e': EASING[values.easing].css } as CSSProperties} className={detail ? 'p-5' : 'p-3'}>
        {detail ? (
          // 38px, the same as the card's three bars, so the grid starts where it did.
          <div className="mb-5 space-y-0.5">
            <p className="text-[15px] font-semibold leading-5 text-ink">Features</p>
            <p className="text-[12px] leading-4 text-ink-muted">Included on every plan.</p>
          </div>
        ) : (
          <div className="mb-3 space-y-1.5">
            <div className="h-2.5 w-2/5 rounded-full bg-demo-2" />
            <div className="h-1.5 w-3/4 rounded-full bg-demo" />
            <div className="h-1.5 w-1/2 rounded-full bg-demo" />
          </div>
        )}
        <div className={`grid grid-cols-2 ${detail ? 'gap-3' : 'gap-2'}`}>
          {Array.from({ length: TILES }, (_, i) => {
            const { Icon, title, body } = FEATURES[i % FEATURES.length]
            return (
              <div
                key={i}
                data-tile=""
                data-in="false"
                data-ghost="false"
                className={`group relative ${detail ? 'h-24' : 'h-14'}`}
              >
                {detail ? (
                  <div className={`${box} bg-demo`}>
                    <div className="flex h-full flex-col justify-between p-2.5 group-data-[ghost=true]:opacity-0">
                      <Icon size={16} aria-hidden className="text-ink" />
                      <div>
                        <p className="text-[13px] font-medium leading-[18px] text-ink">{title}</p>
                        <p className="text-[12px] leading-4 text-ink-muted">{body}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`${box} bg-demo-2`}>
                    <span className="absolute bottom-4 left-3 h-1.5 w-2/5 rounded-full bg-demo-subject group-data-[ghost=true]:opacity-0" />
                    <span className="absolute bottom-2 left-3 h-1.5 w-1/4 rounded-full bg-demo group-data-[ghost=true]:opacity-0" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </BrowserFrame>
  )
}

function ScrollTriggeredGlyph({ active }: GlyphProps) {
  return (
    <GlyphSvg kind="scroll-triggered" active={active}>
      <rect x="3" y="3" width="6" height="1.3" rx=".65" fill="currentColor" opacity=".5" />
      <rect className="m" x="3" y="5.6" width="6" height="3.2" rx="1" fill="currentColor" />
    </GlyphSvg>
  )
}

const seconds = (ms: string) => Number(ms) / 1000

// Non-default durations get a two-word note on where they fit.
const DURATION_TAG: Record<V['duration'], string> = { '300': ' (app UI)', '500': '', '800': ' (editorial only)' }

function cssCode(v: V): string {
  const easing = EASING[v.easing]
  return [
    ...(easing.token ? [`:root { ${easing.token}: ${TOKENS[easing.token]}; }`, ''] : []),
    '/* Markup: <div class="reveal"><div class="reveal-inner">…</div></div>',
    '   The observer watches .reveal, which never moves; .reveal-inner animates.',
    '   The JS tab adds .js only after marking the cards already in view, so the',
    '   first screen is never hidden, and with JavaScript off nothing is. */',
    '.js .reveal:not([data-in="true"]) > .reveal-inner {',
    '  opacity: 0;',
    `  transform: translateY(${TRAVEL}px);`,
    '}',
    '',
    '/* The transition lives on the revealed state only, so hiding is instant. */',
    '.js .reveal[data-in="true"] > .reveal-inner {',
    '  transition-property: opacity, transform;',
    `  transition-duration: ${v.duration}ms;`,
    ...(v.easing === 'spring'
      ? [
          "  /* CSS has no real spring. This linear() samples Motion's spring",
          '     with bounce 0.2; the shape holds at any duration. */',
          '  transition-timing-function: linear(',
          ...wrapList(SPRING_POINTS, 9).map((row) => `    ${row}`),
          '  );',
        ]
      : [`  transition-timing-function: ${easing.css};`]),
    '}',
    '',
    '@media (prefers-reduced-motion: reduce) {',
    '  .js .reveal:not([data-in="true"]) > .reveal-inner { transform: none; }',
    '  .js .reveal[data-in="true"] > .reveal-inner {',
    '    transition-property: opacity;',
    '    transition-duration: 150ms;',
    '  }',
    '}',
    '',
    '@media print {',
    '  .js .reveal:not([data-in="true"]) > .reveal-inner { opacity: 1; transform: none; }',
    '  .js .reveal-inner { transition: none !important; }',
    '}',
  ].join('\n')
}

function jsCode(v: V): string {
  return [
    '// Load at the end of <body>, or with defer, so it runs by DOMContentLoaded. It',
    '// shows the cards already on screen before it hides anything, so the first',
    '// screen never flashes or waits, and if it fails to load, every card stays visible.',
    ...(v.stagger
      ? ["const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches"]
      : ['// Under prefers-reduced-motion the CSS drops the movement.']),
    '',
    '// The card is observed and gets data-in; its .reveal-inner is what animates.',
    'function show(card, delay = 0) {',
    '  if (delay) {',
    "    const inner = card.querySelector('.reveal-inner')",
    '    inner.style.transitionDelay = `${delay}ms`',
    "    // Clear it afterwards, so later transitions on the card don't inherit it.",
    "    const clear = () => (inner.style.transitionDelay = '')",
    "    inner.addEventListener('transitionend', clear, { once: true })",
    '  }',
    "  card.dataset.in = 'true'",
    '  io.unobserve(card) // once',
    '}',
    '',
    `// The card itself never moves, so threshold ${THRESHOLD} means ${THRESHOLD * 100}% of it on screen.`,
    'const io = new IntersectionObserver(',
    '  (entries) => {',
    '    // The first callback reports every observed card; later ones only the',
    '    // cards whose visibility changed, leaving ones included. Keep entering ones.',
    '    const entering = entries.filter(',
    `      (e) => e.isIntersecting && e.intersectionRatio >= ${THRESHOLD},`,
    '    )',
    ...(v.stagger
      ? [
          `    // Cards entering together start ${STAGGER_MS}ms apart, at most ${MAX_STEPS} steps.`,
          '    entering.forEach((e, i) => {',
          `      show(e.target, reduced() ? 0 : Math.min(i, ${MAX_STEPS}) * ${STAGGER_MS})`,
          '    })',
        ]
      : ['    entering.forEach((e) => show(e.target))']),
    '  },',
    `  { threshold: ${THRESHOLD} },`,
    ')',
    '',
    '// First paint: any card with part of it on screen, or already scrolled past,',
    '// is shown without animating. The threshold above is only for cards to come.',
    'function showOnScreen() {',
    "  const cards = [...document.querySelectorAll('.reveal:not([data-in=\"true\"])')]",
    '  const onScreen = cards.filter((card) => card.getBoundingClientRect().top < innerHeight)',
    "  const inners = onScreen.map((card) => card.querySelector('.reveal-inner'))",
    "  for (const inner of inners) inner.style.transition = 'none'",
    '  for (const card of onScreen) show(card)',
    '  document.body.offsetWidth // commit the shown state before transitions come back',
    "  for (const inner of inners) inner.style.transition = ''",
    '}',
    '',
    'showOnScreen()',
    "document.querySelectorAll('.reveal:not([data-in=\"true\"])').forEach((card) => io.observe(card))",
    '// Only now hide the cards that are still to come.',
    "document.documentElement.classList.add('js')",
    '// A #hash jump lands at load: run the pass again for the cards it brought on screen.',
    "addEventListener('load', showOnScreen, { once: true })",
    '',
    '// Focus can land in a card before it reaches the threshold: start its reveal now.',
    "document.addEventListener('focusin', (e) => {",
    `  const card = e.target.closest('.reveal:not([data-in="true"])')`,
    '  if (card) show(card)',
    '})',
  ].join('\n')
}

function motionCode(v: V): string {
  const easing = EASING[v.easing]
  const timing = `${easing.motion(seconds(v.duration))}${v.stagger ? ', delay: delay.current' : ''} }`
  return [
    "import { motion, type Variants } from 'motion/react'",
    `import { useEffect, ${v.stagger ? 'useRef, ' : ''}useState, type ReactNode${v.stagger ? ', type RefObject' : ''} } from 'react'`,
    '',
    '// Add this to <head>. Motion writes `initial` into the server HTML, so the',
    '// cards start hidden there; these show them without JavaScript, in print,',
    `// and after ${FAILSAFE_MS / 1000}s if the bundle never hydrates. If hydration takes longer`,
    `// than ${FAILSAFE_MS / 1000}s, the failsafe stays on: cards show without animating.`,
    '//   <noscript>',
    '//     <style>.reveal-inner { opacity: 1 !important; transform: none !important; }</style>',
    '//   </noscript>',
    '//   <style>',
    '//     .reveal-failsafe .reveal-inner { opacity: 1 !important; transform: none !important; }',
    '//     @media print {',
    '//       .reveal-inner { opacity: 1 !important; transform: none !important;',
    '//                       transition: none !important; }',
    '//     }',
    '//   </style>',
    '//   <script>',
    '//     window.revealFailsafe = setTimeout(() => {',
    "//       document.documentElement.classList.add('reveal-failsafe')",
    `//     }, ${FAILSAFE_MS})`,
    '//   </script>',
    '',
    'declare global {',
    '  interface Window {',
    '    revealFailsafe?: number',
    '  }',
    '}',
    '',
    '// Render once near the root: the bundle has hydrated, so cancel the failsafe.',
    'export function RevealFailsafe() {',
    '  useEffect(() => clearTimeout(window.revealFailsafe), [])',
    '  return null',
    '}',
    '',
    ...(v.stagger
      ? [
          `// Cards that enter view in the same frame start ${STAGGER_MS}ms apart, at most`,
          `// ${MAX_STEPS} steps: the same rule as the CSS and JS version.`,
          'let step = 0',
          'let frame = 0',
          'function nextDelay() {',
          '  if (!frame) frame = requestAnimationFrame(() => (step = frame = 0))',
          `  return Math.min(step++, ${MAX_STEPS}) * ${STAGGER_MS / 1000}`,
          '}',
          '',
        ]
      : []),
    'const variants: Variants = {',
    `  hidden: { opacity: 0, y: ${TRAVEL} },`,
    '  // Resolved on the client when the card reveals, so the server HTML never',
    '  // depends on the reduced-motion setting and hydration stays clean.',
    ...(v.stagger
      ? [
          '  // Motion can resolve it more than once per card, so each card keeps its',
          '  // delay in `custom` and takes a stagger step only once.',
          '  shown: (delay: RefObject<number | undefined>) => {',
        ]
      : ['  shown: () => {']),
    "    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {",
    '      return { opacity: 1, y: 0, transition: { duration: 0.15, y: { duration: 0 } } }',
    '    }',
    ...(v.stagger ? ['    delay.current ??= nextDelay()'] : []),
    '    return {',
    '      opacity: 1,',
    '      y: 0,',
    `      transition: ${timing},`,
    '    }',
    '  },',
    '}',
    '',
    '// `above` renders a card visible and never animates it: use it for cards on',
    '// the first screen. It is decided at render time, so on a taller viewport,',
    '// cards in view on load that are not marked start hidden in the server HTML',
    '// and fade in after hydration. Mark generously.',
    'type RevealProps = { children: ReactNode; above?: boolean }',
    'export function Reveal({ children, above = false }: RevealProps) {',
    ...(v.stagger ? ['  const delay = useRef<number>(undefined)'] : []),
    '  const [focused, setFocused] = useState(false)',
    '  return (',
    `    // The outer div is observed and never moves, so amount ${THRESHOLD} is ${THRESHOLD * 100}% of the`,
    '    // card on screen. Its variant labels pass down to the inner div, which animates.',
    '    <motion.div',
    '      className="reveal"',
    "      initial={above ? false : 'hidden'}",
    "      whileInView={above ? undefined : 'shown'}",
    "      animate={focused ? 'shown' : undefined}",
    `      viewport={{ once: true, amount: ${THRESHOLD} }}`,
    '      // Focus can land in a card before it reaches that line: reveal it now.',
    ...(v.stagger
      ? [
          '      onFocus={() => {',
          '        delay.current ??= 0',
          '        setFocused(true)',
          '      }}',
        ]
      : ['      onFocus={() => setFocused(true)}']),
    '    >',
    `      <motion.div className="reveal-inner" variants={variants}${v.stagger ? ' custom={delay}' : ''}>`,
    '        {children}',
    '      </motion.div>',
    '    </motion.div>',
    '  )',
    '}',
  ].join('\n')
}

export default defineTerm({
  slug: 'scroll-triggered',
  name: 'Scroll-triggered',
  category: 'scroll',
  order: 1,
  status: 'published',
  definition: 'An animation that plays once when an element scrolls into view.',
  aliases: [
    'reveal on scroll',
    'animate on scroll',
    'in-view animation',
    'scroll reveal',
    'fade in when scrolled to',
    'appear as you scroll',
  ],
  description:
    'The element waits just out of sight. When enough of it enters the viewport, it plays an ordinary timed transition, with its own duration and easing, and finishes no matter what the scroll does next. It plays once: scrolling back up leaves it where it is, which is what separates it from scroll-linked motion. Ease-out at 300 to 500ms is right for an entrance; the other easing options are there so you can feel why.',
  useWhen: [
    'Marketing and editorial pages, where sections arriving one after another set the pace of the story.',
    'A grid of features or cards further down a long page, with a short stagger so each row arrives as a group.',
    'Drawing the eye to one figure, quote or result as the reader reaches it.',
  ],
  avoidWhen: [
    'App UI people need right away, like tables, dashboards, search results and settings. Waiting for content to fade in slows the work down.',
    'Every element on the page. When everything reveals, nothing stands out, and fast scrolling turns into waiting.',
    'Motion that should follow the scrollbar and reverse when scrolling back. That is scroll-linked.',
  ],
  demo: {
    component: ScrollTriggeredDemo,
    label:
      'On the entry page, a landing page scrolls down inside a small browser window, then back up: a Features heading over a grid of twelve feature cards, each with an icon, a title and one line of text. Cards already in view are simply there. Each card below fades in and rises 14px the first time it is 15% in view, cards entering together start a moment apart, and on the way back up every card stays where it is. The index card is a wireframe of the same page: grey tiles with two bars each, no text.',
    controls,
    glyph: ScrollTriggeredGlyph,
  },
  prompt: (v) => {
    const ms = Number(v.duration)
    const compare = 'comparison only; ease-out is the default'
    const easing = EASING[v.easing]
    const timing =
      v.easing === 'spring'
        ? `${ms === 800 ? 'an' : 'a'} ${ms}ms${DURATION_TAG[v.duration]} spring, bounce 0.2 (CSS: \`${SPRING_LINEAR}\`; ${compare})`
        : `${ms}ms${DURATION_TAG[v.duration]} \`${easing.css}\` (\`${TOKENS[easing.token!]}\`${v.easing === 'out' ? '' : `; ${compare}`})`
    return [
      'Reveal each card once as it scrolls into view.',
      '',
      `- Inner box: \`opacity\` 0 to 1, \`translateY(${TRAVEL}px)\` to \`none\`, ${timing}. Transition only those.`,
      '- Observe the card itself (it never moves; only the inner box animates) with `threshold: 0.15`. On intersect: `data-in="true"`, `unobserve`.',
      v.stagger
        ? `- Each callback: keep \`isIntersecting\` entries with \`intersectionRatio >= 0.15\`, skip entries already revealed (focus, first paint), DOM order; delay = min(index, ${MAX_STEPS}) × ${STAGGER_MS}ms, cleared on \`transitionend\`.`
        : '- Each callback: keep `isIntersecting` entries with `intersectionRatio >= 0.15`, skip entries already revealed (focus, first paint). No stagger.',
      '- First paint: cards with any pixel on screen show without animating: run the pass at DOMContentLoaded and again at `load` (`#hash` jumps), with inline `transition: none` on the inner box for that pass, restored after a reflow.',
      '- Observer script (end of `<body>` or deferred): mark those and cards scrolled past with `data-in="true"`, then add `js` to `<html>`; hide `.js .reveal:not([data-in="true"]) > .reveal-inner`, transition only when revealed.',
      '- Cards are in the initial HTML (server-rendered or static), keeping their space.',
      `- Motion/SSR: \`initial\` is in the server HTML; add \`<noscript>\`, print and ${FAILSAFE_MS / 1000}s-failsafe styles forcing \`.reveal-inner\` visible.`,
      '- `focusin` on an unrevealed card: reveal now, no delay.',
      '- `@media print`: all cards visible, no transition.',
      v.stagger ? '- Reduced motion: no transform, opacity over 150ms, no JS delays.' : '- Reduced motion: no transform, opacity over 150ms.',
    ].join('\n')
  },

  acceptance: (v) => [
    'Cards in view when the page loads are visible from the first frame and do not animate.',
    'Each card below animates the first time it is about 15% inside the viewport, then stays.',
    'Scrolling back up never replays a card that has already revealed.',
    `One card takes ${v.duration}ms from hidden to rest.`,
    v.stagger
      ? `Cards that enter together start ${STAGGER_MS}ms apart in reading order, and none waits more than ${MAX_STEPS * STAGGER_MS}ms.`
      : 'Cards that enter together start at the same moment.',
    'After an instant jump (anchor link or `scrollTo` without smooth), every card in view is fully visible.',
    'Cards hold their space before they reveal; nothing below them moves.',
    'With JavaScript off, or if the observer script fails to load, every card is visible (the cards must be in the initial HTML).',
    'Moving focus into a card that has not revealed starts its reveal immediately, with no stagger delay.',
    'With reduced motion on, cards appear without moving and without a stagger, over at most 150ms.',
    'Printing the page shows every card.',
  ],
  code: (v) => ({ css: cssCode(v), js: jsCode(v), motion: motionCode(v) }),
  a11y: 'With JavaScript off, or when the script fails, every card must be visible: hide cards only from the script that reveals them, and never the ones already on screen. Focus moving into a card that has not revealed starts its reveal at once. Under reduced motion, show content with a 150ms opacity fade, without movement or stagger.',

  related: ['scroll-linked', 'stagger', 'enter-and-exit'],
  confusedWith: [
    {
      slug: 'scroll-linked',
      difference:
        'Scroll-triggered plays once on its own clock when something enters view. Scroll-linked has no clock: its progress is the scroll position, so it runs backwards when you scroll up.',
    },
  ],
  sources: [
    { label: 'MDN: Intersection Observer API', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API' },
    { label: 'Motion: whileInView', url: 'https://motion.dev/docs/react-scroll-animations' },
  ],
})
