import { useEffect, useRef, type CSSProperties, type RefObject } from 'react'
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

// CSS has no spring. These are Motion's { type: 'spring', duration: 0.5, bounce: 0.2 } sampled at even steps.
// A duration-based spring keeps its shape at any duration, so the curve pairs with whichever one is picked.
const SPRING_POINTS = [0, 0.117, 0.344, 0.569, 0.748, 0.872, 0.949, 0.99, 1.009, 1.015, 1.014, 1.011, 1.008, 1.005, 1.002, 1.001, 1]
const SPRING_LINEAR = `linear(${SPRING_POINTS.join(', ')})`

// Rows of `perRow` values for a code block, with commas between rows but not after the last.
const wrapList = (values: readonly number[], perRow: number) =>
  Array.from({ length: Math.ceil(values.length / perRow) }, (_, i) => values.slice(i * perRow, (i + 1) * perRow).join(', ')).map(
    (row, i, rows) => (i < rows.length - 1 ? `${row},` : row),
  )

const EASING: Record<Easing, { token?: string; css: string; words: string; motion: (seconds: number) => string }> = {
  out: { token: '--ease-out', css: 'var(--ease-out)', words: '`var(--ease-out)`', motion: (s) => `{ duration: ${s}, ease: [0.23, 1, 0.32, 1] }` },
  inout: { token: '--ease-in-out', css: 'var(--ease-in-out)', words: '`var(--ease-in-out)`', motion: (s) => `{ duration: ${s}, ease: [0.77, 0, 0.175, 1] }` },
  spring: {
    css: SPRING_LINEAR,
    words: 'a spring with bounce 0.2',
    motion: (s) => `{ type: 'spring', duration: ${s}, bounce: 0.2 }`,
  },
}

// Reveals each tile once, the first time it is 15% inside the scroller. The observer writes data-in on the
// DOM node; no React state per tile. Off the play path (reduced motion before play, off-screen), it paints a
// still: tiles in the upper part of the window are in, the ones below show as outlines of what comes next.
function useReveals(
  rootRef: RefObject<HTMLDivElement | null>,
  pageRef: RefObject<HTMLDivElement | null>,
  { playing, replayKey, timeScale, duration, stagger }: { playing: boolean; replayKey: number; timeScale: number; duration: number; stagger: boolean },
) {
  useEffect(() => {
    const root = rootRef.current
    const page = pageRef.current
    if (!root || !page) return
    const tiles = [...root.querySelectorAll<HTMLElement>('[data-tile]')]

    // Reset with transitions off, so hidden tiles snap back instead of fading out.
    page.style.setProperty('--d', '0ms')
    for (const tile of tiles) {
      tile.dataset.in = 'false'
      tile.dataset.ghost = 'false'
      tile.style.transitionDelay = ''
    }

    if (!playing) {
      const top = root.getBoundingClientRect().top
      const line = root.clientHeight * 0.55
      for (const tile of tiles) {
        const above = tile.getBoundingClientRect().top - top < line
        tile.dataset.in = String(above)
        tile.dataset.ghost = String(!above)
      }
      return
    }

    void page.offsetHeight // commit the hidden state before transitions come back
    page.style.setProperty('--d', `${scaled(duration, timeScale)}ms`)
    const io = new IntersectionObserver(
      (entries) => {
        let step = 0
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const tile = entry.target as HTMLElement
          if (stagger) tile.style.transitionDelay = `${scaled(Math.min(step++, MAX_STEPS) * STAGGER_MS, timeScale)}ms`
          tile.dataset.in = 'true'
          io.unobserve(tile)
        }
      },
      { root, threshold: THRESHOLD },
    )
    tiles.forEach((tile) => io.observe(tile))
    return () => io.disconnect()
  }, [rootRef, pageRef, playing, replayKey, timeScale, duration, stagger])
}

function ScrollTriggeredDemo({ values, playing, replayKey, size, timeScale, onCycleEnd }: DemoProps<V>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  // Order matters: the auto-scroll sets the scroll position first, then the reveals read it.
  useAutoScroll(scrollRef, { playing, replayKey, timeScale, onCycleEnd, interactive: size === 'detail', durationMs: 5200, stillAt: 0.42 })
  useReveals(scrollRef, pageRef, { playing, replayKey, timeScale, duration: Number(values.duration), stagger: values.stagger })
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
              className={`group relative rounded-md bg-demo opacity-0 [transform:translateY(14px)] transition-[opacity,transform] duration-(--d) ease-(--e) data-[ghost=true]:bg-transparent data-[ghost=true]:opacity-100 data-[ghost=true]:shadow-[inset_0_0_0_1px_var(--demo-2)] data-[ghost=true]:[transform:none] data-[in=true]:opacity-100 data-[in=true]:[transform:none] ${detail ? 'h-24' : 'h-14'}`}
            >
              <span className={`absolute left-3 h-1.5 w-1/2 rounded-full bg-demo-2 group-data-[ghost=true]:opacity-0 ${detail ? 'bottom-5' : 'bottom-4'}`} />
              <span className={`absolute left-3 h-1.5 w-1/3 rounded-full bg-demo-2 group-data-[ghost=true]:opacity-0 ${detail ? 'bottom-2.5' : 'bottom-2'}`} />
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

export default defineTerm({
  slug: 'scroll-triggered',
  name: 'Scroll-triggered',
  category: 'scroll',
  order: 1,
  status: 'review',
  definition: 'An animation that plays once when an element scrolls into view.',
  aliases: [
    'reveal on scroll',
    'animate on enter',
    'in-view animation',
    'scroll reveal',
    'fade in when scrolled to',
    'appear as you scroll',
  ],
  description:
    'The element waits just out of sight. When enough of it enters the viewport, it plays an ordinary timed transition, with its own duration and easing, and finishes no matter what the scroll does next. It plays once: scrolling back up leaves it where it is, which is what separates it from scroll-linked motion. Most reveal-on-scroll effects on marketing pages are this.',
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
      'A page of gray tiles scrolls inside a small browser window. Each tile fades in and rises 14px the first time it is 15% in view, tiles in the same row start a moment apart, and every tile stays visible after it has appeared.',
    controls,
    glyph: ScrollTriggeredGlyph,
  },
  prompt: (v) => {
    const ms = Number(v.duration)
    const easing = EASING[v.easing]
    return [
      'Reveal the cards in this grid as they scroll into view, once each.',
      '',
      `- When a card is 15% inside the viewport, fade it from \`opacity: 0\` to \`1\` and move it from \`translateY(${TRAVEL}px)\` to \`none\`. It plays once and stays. Scrolling back up never replays it.`,
      v.easing === 'spring'
        ? `- Timing: a spring with bounce 0.2 over ${ms}ms, on both properties. In Motion: \`transition={{ type: "spring", duration: ${seconds(v.duration)}, bounce: 0.2 }}\`. CSS has no real spring, so in CSS use \`transition-duration: ${ms}ms\` with \`transition-timing-function: ${SPRING_LINEAR}\`, which samples the same spring.`
        : `- Timing: ${ms}ms with ${easing.words} on both properties.`,
      v.stagger
        ? `- Cards that enter in the same observer callback start ${STAGGER_MS}ms apart, in DOM order, capped at ${MAX_STEPS} steps (${MAX_STEPS * STAGGER_MS}ms) so a fast jump never queues a long wave. Set the delay on the card when it reveals, not up front.`
        : '- Cards that enter together all start at the same moment. No stagger.',
      `- Detect entry with one IntersectionObserver, \`threshold: ${THRESHOLD}\`. On intersect, set \`data-in="true"\` on the card (the CSS keys off it) and \`unobserve\` it. Don't use a scroll listener.`,
      '- Hide cards only once JavaScript is running: an inline script in <head> adds a `js` class to <html>, and the hidden state is scoped under `.js`. With Motion, add a <noscript> style that forces the cards visible. Content must never be stuck invisible because a script failed.',
      '- States to handle: before reveal (invisible but holding its space, so nothing shifts); revealing; revealed (opacity 1, no transform left); jumped past with End, an anchor link or a fast fling (every card that has been in view ends fully visible); keyboard focus landing in a card that has not revealed yet (reveal it at once on `focusin`).',
      '- Under `prefers-reduced-motion: reduce`, drop the movement and the stagger: show cards immediately, or fade opacity only over 150ms.',
      '- Transition only `opacity` and `transform`, and name them; never `transition: all`. Never animate top, margin or height.',
      "- Don't tie the animation's progress to the scroll position (that is scroll-linked), and don't replay it when a card leaves and comes back.",
    ].join('\n')
  },
  acceptance: (v) => [
    'Each card animates the first time it is 15% inside the viewport, then stays.',
    'Scrolling back up never replays a card that has already revealed.',
    `One card takes ${v.duration}ms from hidden to rest${v.easing === 'spring' ? ', settling with a slight overshoot' : ''}.`,
    v.stagger
      ? `Cards that enter together start ${STAGGER_MS}ms apart in reading order, and none waits more than ${MAX_STEPS * STAGGER_MS}ms.`
      : 'Cards that enter together start at the same moment.',
    'After pressing End or following an anchor link, every card in view is fully visible; nothing is stuck half-faded.',
    'Cards hold their space before they reveal; nothing below them moves.',
    'With JavaScript turned off, every card is visible.',
    'Tabbing to a link inside a card that has not revealed yet shows the card at once.',
    'With reduced motion on, cards appear without moving: at once, or with a 150ms opacity fade.',
  ],
  code: (v) => {
    const ms = Number(v.duration)
    const easing = EASING[v.easing]
    return {
      css: [
        ...(easing.token ? [`:root { ${easing.token}: ${TOKENS[easing.token]}; }`, ''] : []),
        '/* Hidden only once JS has run (see the JS tab),',
        '   so content is never stuck invisible. */',
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
      ].join('\n'),
      js: [
        '// In <head>, before the cards render, so they never flash:',
        "//   <script>document.documentElement.classList.add('js')</script>",
        '',
        ...(v.stagger ? ["const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches", ''] : []),
        'function show(card, delay = 0) {',
        "  card.style.transitionDelay = delay ? `${delay}ms` : ''",
        "  card.dataset.in = 'true'",
        '  io.unobserve(card) // once',
        '}',
        '',
        'const io = new IntersectionObserver(',
        '  (entries) => {',
        ...(v.stagger
          ? [
              '    let step = 0',
              '    for (const entry of entries) {',
              '      if (!entry.isIntersecting) continue',
              `      // Cards entering together start ${STAGGER_MS}ms apart, at most ${MAX_STEPS} steps.`,
              `      show(entry.target, reduce ? 0 : Math.min(step++, ${MAX_STEPS}) * ${STAGGER_MS})`,
              '    }',
            ]
          : ['    for (const entry of entries) {', '      if (entry.isIntersecting) show(entry.target)', '    }']),
        '  },',
        `  { threshold: ${THRESHOLD} },`,
        ')',
        "document.querySelectorAll('.reveal').forEach((card) => io.observe(card))",
        '',
        '// Keyboard focus can land in a card before it has scrolled into view.',
        "document.addEventListener('focusin', (e) => {",
        `  const card = e.target.closest('.reveal:not([data-in="true"])')`,
        '  if (card) show(card)',
        '})',
      ].join('\n'),
      motion: [
        "import { motion, useReducedMotion, type Transition } from 'motion/react'",
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
              "// step: the card's position in its row (0, 1, …), so cards entering",
              `// together start ${STAGGER_MS}ms apart.`,
              'type RevealProps = { children: ReactNode; step?: number }',
              'export function Reveal({ children, step = 0 }: RevealProps) {',
            ]
          : ['export function Reveal({ children }: { children: ReactNode }) {']),
        '  const reduce = useReducedMotion()',
        '  const transition: Transition = reduce',
        '    ? { duration: 0.15 }',
        `    : ${v.stagger ? easing.motion(seconds(v.duration)).replace(/ }$/, `, delay: step * ${STAGGER_MS / 1000} }`) : easing.motion(seconds(v.duration))}`,
        '  return (',
        '    <motion.div',
        '      className="reveal"',
        `      initial={{ opacity: 0, y: reduce ? 0 : ${TRAVEL} }}`,
        '      whileInView={{ opacity: 1, y: 0 }}',
        `      viewport={{ once: true, amount: ${THRESHOLD} }}`,
        '      transition={transition}',
        '    >',
        '      {children}',
        '    </motion.div>',
        '  )',
        '}',
      ].join('\n'),
    }
  },

  a11y: 'Content must be visible without JavaScript, so hide it only once a script has run. A card that can take keyboard focus must never sit invisible: reveal it on focus. Under reduced motion, show content at once or with a 150ms opacity fade and no movement.',
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
