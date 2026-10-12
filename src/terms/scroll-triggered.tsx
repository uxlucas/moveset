import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { BrowserFrame } from '@/components/demo/browser-frame'
import { scaled } from '@/components/demo/playback'
import { useAutoScroll } from '@/components/demo/use-auto-scroll'
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

const THRESHOLD = 0.15
const TRAVEL = 14
const STAGGER_MS = 60
// Cards entering together step 60ms apart, at most 4 steps, so a fast jump never queues a long wave.
const MAX_STEPS = 4
const TILES = 12
const FAILSAFE_MS = 3000

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

// Reveals each tile once, the first time it is 15% inside the scroller. The observer writes data-in on the
// DOM node; no React state per tile. Tiles already in view when a cycle starts are shown without animating,
// like cards on first paint. Off the play path (reduced motion before play, off-screen), it paints a still:
// tiles in the upper part of the window are in, the ones below show as outlines of what comes next.
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
      tile.style.transitionDelay = ''
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

    const waiting: HTMLElement[] = []
    for (const tile of tiles) {
      const inView = visibleRatio(tile, view) >= THRESHOLD
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
          if (stagger) tile.style.transitionDelay = `${scaled(Math.min(i, MAX_STEPS) * STAGGER_MS, timeScale)}ms`
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
    durationMs: 8000,
    stillAt: 0.42,
    returnTrip: true,
  })
  useReveals(scrollRef, pageRef, { playing, cycle, timeScale, duration: Number(values.duration), stagger: values.stagger })
  const detail = size === 'detail'

  return (
    <BrowserFrame scrollRef={scrollRef} size={size} label="Page of tiles that reveal as they scroll into view">
      <div ref={pageRef} style={{ '--e': EASING[values.easing].css } as CSSProperties} className={detail ? 'p-5' : 'p-3'}>
        <div className={detail ? 'mb-5 space-y-2' : 'mb-3 space-y-1.5'}>
          <div className="h-2.5 w-2/5 rounded-full bg-demo-2" />
          <div className="h-1.5 w-3/4 rounded-full bg-demo" />
          <div className="h-1.5 w-1/2 rounded-full bg-demo" />
        </div>
        <div className={`grid grid-cols-2 ${detail ? 'gap-3' : 'gap-2'}`}>
          {Array.from({ length: TILES }, (_, i) => (
            <div
              key={i}
              data-tile=""
              data-in="false"
              data-ghost="false"
              className={`group relative rounded-md bg-demo-2 opacity-0 [transform:translateY(14px)] transition-[opacity,transform] duration-(--d) ease-(--e) data-[ghost=true]:bg-transparent data-[ghost=true]:opacity-100 data-[ghost=true]:shadow-[inset_0_0_0_1px_var(--demo-2)] data-[ghost=true]:[transform:none] data-[in=true]:opacity-100 data-[in=true]:[transform:none] ${detail ? 'h-24' : 'h-14'}`}
            >
              <span className={`absolute left-3 h-1.5 w-2/5 rounded-full bg-demo-subject group-data-[ghost=true]:opacity-0 ${detail ? 'bottom-5' : 'bottom-4'}`} />
              <span className={`absolute left-3 h-1.5 w-1/4 rounded-full bg-demo group-data-[ghost=true]:opacity-0 ${detail ? 'bottom-2.5' : 'bottom-2'}`} />
            </div>
          ))}
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

function timingLine(v: V): string {
  const ms = Number(v.duration)
  const timing =
    v.easing === 'spring'
      ? `- Timing: a spring with bounce 0.2 over ${ms}ms on both properties (Motion: \`{ type: 'spring', duration: ${seconds(v.duration)}, bounce: 0.2 }\`; CSS has no spring, so use \`transition-duration: ${ms}ms\` with \`transition-timing-function: ${SPRING_LINEAR}\`, which samples it). What the spring adds over ease-out is a softer start.`
      : `- Timing: ${ms}ms with \`${EASING[v.easing].css}\` on both properties.`
  const notes = [
    ...(v.easing === 'out' ? [] : ['Note: this is for comparison; ease-out is the house choice.']),
    ...(ms > 500 ? [`${ms}ms is above the 300ms UI budget; use it for editorial pacing only.`] : []),
  ]
  return [timing, ...notes].join(' ')
}

export default defineTerm({
  slug: 'scroll-triggered',
  name: 'Scroll-triggered',
  category: 'scroll',
  order: 1,
  status: 'review',
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
      'A page of gray tiles scrolls down inside a small browser window, then back up. Tiles already in view are simply there. Each tile below fades in and rises 14px the first time it is 15% in view, tiles entering together start a moment apart, and on the way back up every tile stays where it is.',
    controls,
    glyph: ScrollTriggeredGlyph,
  },
  prompt: (v) =>
    [
      'Reveal the cards in this grid as they scroll into view, once each.',
      '',
      `- When a card is 15% inside the viewport, fade it from \`opacity: 0\` to \`1\` and move it from \`translateY(${TRAVEL}px)\` to \`none\`. It plays once and stays. Scrolling back up never replays it.`,
      timingLine(v),
      v.stagger
        ? `- Each observer callback reports every observed card (the first one reports all of them), so filter to entries that are intersecting before staggering. Start those ${STAGGER_MS}ms apart in DOM order, capped at ${MAX_STEPS} steps (${MAX_STEPS * STAGGER_MS}ms) so a fast jump never queues a long wave. Set the delay on the card when it reveals, and clear it once the transition ends.`
        : '- Cards that enter together all start at the same moment. No stagger. Filter each observer callback to entries that are intersecting (the first one reports every card).',
      `- Detect entry with one IntersectionObserver, \`threshold: ${THRESHOLD}\` (with Motion: \`whileInView\` and \`viewport={{ once: true, amount: ${THRESHOLD} }}\`). On intersect, set \`data-in="true"\` on the card (the CSS keys off it) and \`unobserve\` it. Don't use a scroll listener.`,
      `- Hide cards only once JavaScript is running: an inline script in <head> adds a \`js\` class to <html>, and the hidden state is scoped under \`.js\`. The same head script starts a failsafe, \`setTimeout(() => html.classList.remove('js'), ${FAILSAFE_MS})\`, and the observer script clears it when it starts. If that script never runs, the cards show after ${FAILSAFE_MS / 1000}s instead of staying hidden.`,
      '- States to handle: in view on first paint (visible, no animation: in the first observer callback, set `data-in` with transitions off); before reveal (invisible but holding its space, so nothing shifts); revealing; revealed (opacity 1, no transform left); after an instant jump such as an anchor link (cards in view end fully visible; cards never in view reveal when reached); keyboard focus landing in a card that has not revealed (on `focusin` it starts revealing immediately, with the same transition and no stagger delay); printing (`@media print` shows every card).',
      '- Under `prefers-reduced-motion: reduce`: no movement and no stagger. In CSS, drop the transform and fade opacity only, over 150ms. In JS, set no delays, and read the media query inside the callback so a change mid-session counts.',
      '- Transition only `opacity` and `transform`, and name them; never `transition: all`.',
      "- Don't tie the animation's progress to the scroll position; that is scroll-linked.",
    ].join('\n'),
  acceptance: (v) => [
    'Cards in view when the page loads are visible right away and do not animate.',
    'Each card below animates the first time it is 15% inside the viewport, then stays.',
    'Scrolling back up never replays a card that has already revealed.',
    `One card takes ${v.duration}ms from hidden to rest.`,
    v.stagger
      ? `Cards that enter together start ${STAGGER_MS}ms apart in reading order, and none waits more than ${MAX_STEPS * STAGGER_MS}ms.`
      : 'Cards that enter together start at the same moment.',
    'After an instant jump (anchor link or `scrollTo` without smooth), every card in view is fully visible.',
    'Cards hold their space before they reveal; nothing below them moves.',
    `With JavaScript off, every card is visible (the cards must be in the initial HTML). If the observer script fails to run, every card shows within ${FAILSAFE_MS / 1000}s.`,
    'Moving focus into a card that has not revealed starts its reveal immediately, with no stagger delay.',
    'With reduced motion on, cards appear without moving and without a stagger, over at most 150ms.',
    'Printing the page shows every card.',
  ],
  code: (v) => {
    const ms = Number(v.duration)
    const easing = EASING[v.easing]
    return {
      css: [
        ...(easing.token ? [`:root { ${easing.token}: ${TOKENS[easing.token]}; }`, ''] : []),
        '/* Hidden only once JS has run (see the JS tab), so with',
        '   JavaScript off every card is visible. */',
        '.js .reveal {',
        '  opacity: 0;',
        `  transform: translateY(${TRAVEL}px);`,
        '  transition-property: opacity, transform;',
        `  transition-duration: ${ms}ms;`,
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
        '.js .reveal[data-in="true"] {',
        '  opacity: 1;',
        '  transform: none;',
        '}',
        '',
        '@media (prefers-reduced-motion: reduce) {',
        '  .js .reveal {',
        '    transform: none;',
        '    transition-property: opacity;',
        '    transition-duration: 150ms;',
        '  }',
        '}',
        '',
        '@media print {',
        '  .js .reveal { opacity: 1; transform: none; }',
        '}',
      ].join('\n'),
      js: [
        '// In <head>, before the cards render. If the observer script below',
        `// never runs, the failsafe shows every card after ${FAILSAFE_MS / 1000}s.`,
        '//   <script>',
        "//     document.documentElement.classList.add('js')",
        '//     window.revealFailsafe = setTimeout(() => {',
        "//       document.documentElement.classList.remove('js')",
        `//     }, ${FAILSAFE_MS})`,
        '//   </script>',
        '',
        'clearTimeout(window.revealFailsafe)',
        '',
        ...(v.stagger
          ? ["const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches", '']
          : ['// Under prefers-reduced-motion the CSS drops the movement.', '']),
        'function show(card, { delay = 0, instant = false } = {}) {',
        "  if (instant) card.style.transition = 'none'",
        '  if (delay) {',
        '    card.style.transitionDelay = `${delay}ms`',
        "    // Clear it afterwards, so later transitions on the card don't inherit it.",
        "    const clear = () => (card.style.transitionDelay = '')",
        "    card.addEventListener('transitionend', clear, { once: true })",
        '  }',
        "  card.dataset.in = 'true'",
        '  io.unobserve(card) // once',
        '  if (instant) {',
        '    card.offsetWidth // commit the shown state before the transition comes back',
        "    card.style.transition = ''",
        '  }',
        '}',
        '',
        'let first = true',
        'const io = new IntersectionObserver(',
        '  (entries) => {',
        '    // Each callback reports every observed card; keep the ones really in view.',
        '    const entering = entries.filter(',
        `      (e) => e.isIntersecting && e.intersectionRatio >= ${THRESHOLD},`,
        '    )',
        '    if (first) {',
        '      // Cards in view on first paint are already there: no animation.',
        '      first = false',
        '      entering.forEach((e) => show(e.target, { instant: true }))',
        '      return',
        '    }',
        ...(v.stagger
          ? [
              `    // Cards entering together start ${STAGGER_MS}ms apart, at most ${MAX_STEPS} steps.`,
              '    entering.forEach((e, i) => {',
              `      show(e.target, { delay: reduced() ? 0 : Math.min(i, ${MAX_STEPS}) * ${STAGGER_MS} })`,
              '    })',
            ]
          : ['    entering.forEach((e) => show(e.target))']),
        '  },',
        `  { threshold: ${THRESHOLD} },`,
        ')',
        "document.querySelectorAll('.reveal').forEach((card) => io.observe(card))",
        '',
        `// Focus can land in a card before it is ${THRESHOLD * 100}% in view: start its reveal now.`,
        "document.addEventListener('focusin', (e) => {",
        `  const card = e.target.closest('.reveal:not([data-in="true"])')`,
        '  if (card) show(card)',
        '})',
      ].join('\n'),
      motion: [
        "import { motion, type Variants } from 'motion/react'",
        "import type { ReactNode } from 'react'",
        '',
        '// Motion writes `initial` into the server HTML. So the cards still show',
        '// without JavaScript, add this to <head>:',
        '//   <noscript><style>',
        '//     .reveal { opacity: 1 !important; transform: none !important; }',
        '//   </style></noscript>',
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
        '  shown: () => {',
        "    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches",
        '    return {',
        '      opacity: 1,',
        '      y: 0,',
        '      transition: reduce',
        '        ? { duration: 0.15, y: { duration: 0 } }',
        `        : ${easing.motion(seconds(v.duration))}${v.stagger ? ', delay: nextDelay()' : ''} },`,
        '    }',
        '  },',
        '}',
        '',
        '// Pass `above` for cards in the first screen: they render visible and',
        '// never animate.',
        'type RevealProps = { children: ReactNode; above?: boolean }',
        'export function Reveal({ children, above = false }: RevealProps) {',
        '  return (',
        '    <motion.div',
        '      className="reveal"',
        '      variants={variants}',
        "      initial={above ? false : 'hidden'}",
        '      whileInView="shown"',
        `      viewport={{ once: true, amount: ${THRESHOLD} }}`,
        '    >',
        '      {children}',
        '    </motion.div>',
        '  )',
        '}',
      ].join('\n'),
    }
  },
  a11y: `With JavaScript off, every card must be visible, so hide cards only once a script has run, and add a failsafe that shows them if the observer never starts. Focus moving into a card that has not revealed starts its reveal at once. Under reduced motion, show content with a 150ms opacity fade, without movement or stagger.`,
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
