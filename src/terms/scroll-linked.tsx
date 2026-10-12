import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { BrowserFrame } from '@/components/demo/browser-frame'
import { useAutoScroll } from '@/components/demo/use-auto-scroll'
import { GlyphSvg } from '@/components/site/glyph'
import { defineTerm, type Control, type ControlValues, type DemoProps, type GlyphProps } from '@/lib/term-types'

const controls = [
  {
    id: 'effect',
    type: 'select',
    label: 'Effect',
    options: [
      { value: 'bar', label: 'Progress bar' },
      { value: 'fade', label: 'Fade' },
      { value: 'scale', label: 'Scale' },
    ],
    default: 'bar',
  },
  {
    id: 'range',
    type: 'select',
    label: 'Range',
    options: [
      { value: 'page', label: 'Whole page' },
      { value: 'section', label: 'Element in view' },
    ],
    default: 'page',
  },
] as const satisfies readonly Control[]

type V = ControlValues<typeof controls>

const SCALE_FROM = 0.92
const STILL_AT = 0.45
const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1)

// Line widths (%) per paragraph. The window is taller on the entry page, so it shows more paragraphs
// around the marked section: enough that the section enters after the scroll starts and leaves before it ends.
const BEFORE = [
  [70, 94, 88, 96, 90, 62],
  [92, 86, 96, 84, 70],
  [88, 96, 90, 52],
  [94, 84, 92, 96, 76],
  [90, 96, 86, 60],
]
const SECTION_TOP = [90, 96, 82, 94, 58]
const SECTION_BOTTOM = [88, 94, 90, 74]
const AFTER = [
  [94, 90, 96, 86, 66],
  [86, 96, 92, 80],
  [92, 88, 96, 54],
  [96, 90, 84, 92, 70],
  [88, 94, 64],
]
// A figure effect gets fewer paragraphs above it, so its entry range passes while the scroll is still
// unhurried; the bar keeps more, so the marked section enters after the scroll starts.
const PARAGRAPHS = { card: { bar: 3, figure: 2, after: 4 }, detail: { bar: 5, figure: 3, after: 5 } }

// The figure's own entry range is as long as the figure is tall, so a tall figure gives the
// fade and scale enough scroll to read as scrubbing rather than a quick entrance. The bar's figure
// stays short; its two extra paragraphs keep the scroll length close to the figure layouts.
const FIGURE_HEIGHT = { card: { bar: 'h-32', figure: 'h-32' }, detail: { bar: 'h-36', figure: 'h-80' } }

const isFigureEntry = (v: V) => v.effect !== 'bar' && v.range === 'section'

// Maps scrollTop straight onto the linked element: no easing, no smoothing, no React state per frame.
// The range is the whole scroll height, or the subject's own pass through the viewport.
function useScrollLink(
  rootRef: RefObject<HTMLDivElement | null>,
  refs: { bar: RefObject<HTMLDivElement | null>; section: RefObject<HTMLElement | null>; figure: RefObject<HTMLElement | null> },
  { effect, range }: V,
) {
  const { bar, section, figure } = refs
  useEffect(() => {
    const root = rootRef.current
    const fig = figure.current
    const sec = section.current
    if (!root || !fig || !sec) return

    const progress = () => {
      const view = root.clientHeight
      const s = root.scrollTop
      if (range === 'page') {
        const max = root.scrollHeight - view
        return max > 0 ? clamp01(s / max) : 0
      }
      // bar: 0 when the section's top enters at the bottom, 1 when its bottom leaves at the top (cover).
      if (effect === 'bar') return clamp01((s + view - sec.offsetTop) / (view + sec.offsetHeight))
      // figure: 0 when its top reaches the bottom of the view, 1 when its bottom does (entry).
      return clamp01((s + view - fig.offsetTop) / fig.offsetHeight)
    }

    const update = () => {
      const p = progress()
      if (effect === 'bar' && bar.current) bar.current.style.transform = `scaleX(${p})`
      fig.style.opacity = effect === 'fade' ? String(p) : ''
      fig.style.transform = effect === 'scale' ? `scale(${SCALE_FROM + (1 - SCALE_FROM) * p})` : ''
    }

    update()
    root.addEventListener('scroll', update, { passive: true })
    const resize = new ResizeObserver(update)
    resize.observe(root)
    return () => {
      root.removeEventListener('scroll', update)
      resize.disconnect()
      fig.style.opacity = ''
      fig.style.transform = ''
    }
  }, [rootRef, bar, section, figure, effect, range])
}

// The still frame sits at 45% of the scroll, except for the figure's own entry range: there it sits
// halfway through that range, measured from the layout, so the still shows the effect mid-way.
function useStillPx(rootRef: RefObject<HTMLDivElement | null>, figureRef: RefObject<HTMLElement | null>, v: V, size: DemoProps['size']) {
  const [stillPx, setStillPx] = useState<number>()
  const figureEntry = isFigureEntry(v)
  useLayoutEffect(() => {
    const root = rootRef.current
    const fig = figureRef.current
    if (!root || !fig) return
    const max = root.scrollHeight - root.clientHeight
    const middle = fig.offsetTop - root.clientHeight + fig.offsetHeight / 2
    setStillPx(Math.round(figureEntry ? Math.min(Math.max(middle, 0), max) : max * STILL_AT))
  }, [rootRef, figureRef, figureEntry, v.effect, size])
  return stillPx
}

function Paragraph({ widths, detail }: { widths: readonly number[]; detail: boolean }) {
  return (
    <div className={detail ? 'mb-4 space-y-2' : 'mb-2.5 space-y-1.5'}>
      {widths.map((w, i) => (
        <div key={i} style={{ width: `${w}%` }} className={`rounded-full bg-demo ${detail ? 'h-1.5' : 'h-1'}`} />
      ))}
    </div>
  )
}

function ScrollLinkedDemo({ values, playing, replayKey, size, timeScale, onCycleEnd }: DemoProps<V>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const figureRef = useRef<HTMLElement>(null)
  const stillPx = useStillPx(scrollRef, figureRef, values, size)
  useAutoScroll(scrollRef, {
    playing,
    replayKey,
    timeScale,
    onCycleEnd,
    interactive: size === 'detail',
    durationMs: 8000,
    stillAt: STILL_AT,
    stillPx,
    returnTrip: true,
  })
  useScrollLink(scrollRef, { bar: barRef, section: sectionRef, figure: figureRef }, values)
  const detail = size === 'detail'
  const isBar = values.effect === 'bar'
  const marked = isBar && values.range === 'section'

  return (
    <BrowserFrame scrollRef={scrollRef} size={size} label="Article with a scroll-linked effect">
      {isBar && (
        <div className="sticky top-0 z-10 h-0">
          <div ref={barRef} data-progress-bar="" aria-hidden className="h-0.5 origin-left bg-demo-subject [transform:scaleX(0)]" />
        </div>
      )}
      <article className={detail ? 'px-6 pb-6 pt-5' : 'px-3.5 pb-3.5 pt-3'}>
        <div className={detail ? 'mb-5 space-y-2.5' : 'mb-3 space-y-1.5'}>
          <div className={`w-3/5 rounded-full bg-demo-2 ${detail ? 'h-3' : 'h-2'}`} />
          <div className={`w-1/4 rounded-full bg-demo ${detail ? 'h-1.5' : 'h-1'}`} />
        </div>
        {BEFORE.slice(0, PARAGRAPHS[size][isBar ? 'bar' : 'figure']).map((p, i) => <Paragraph key={i} widths={p} detail={detail} />)}
        <section
          ref={sectionRef}
          data-section=""
          data-marked={marked}
          className={`border-l-2 border-transparent transition-colors duration-150 ease-[ease] data-[marked=true]:border-demo-subject ${detail ? '-ml-4 pl-3.5' : '-ml-2.5 pl-2'}`}
        >
          <Paragraph widths={SECTION_TOP} detail={detail} />
          <figure
            ref={figureRef}
            data-figure=""
            className={`rounded-lg ${isBar ? 'bg-demo-2' : 'bg-demo-subject'} ${FIGURE_HEIGHT[size][isBar ? 'bar' : 'figure']} ${detail ? 'mb-4' : 'mb-2.5'}`}
          />
          <Paragraph widths={SECTION_BOTTOM} detail={detail} />
        </section>
        {AFTER.slice(0, PARAGRAPHS[size].after).map((p, i) => <Paragraph key={i} widths={p} detail={detail} />)}
      </article>
    </BrowserFrame>
  )
}

function ScrollLinkedGlyph({ active }: GlyphProps) {
  return (
    <GlyphSvg kind="scroll-linked" active={active}>
      <rect className="m" x="1.6" y="1.7" width="8.8" height="1.3" rx=".65" fill="currentColor" />
      <rect x="3" y="5" width="6" height="1" rx=".5" fill="currentColor" opacity=".5" />
      <rect x="3" y="7.4" width="4.4" height="1" rx=".5" fill="currentColor" opacity=".5" />
    </GlyphSvg>
  )
}

type Range = 'page' | 'barSection' | 'figureSection'
const rangeOf = (v: V): Range => (v.range === 'page' ? 'page' : v.effect === 'bar' ? 'barSection' : 'figureSection')

function intro(v: V): string {
  if (v.effect === 'bar') {
    return v.range === 'page'
      ? 'Add a reading progress bar that follows the scroll position of the page.'
      : 'Add a progress bar that tracks one section of the page (class `marked-section`, or the section the user names).'
  }
  const verb = v.effect === 'fade' ? 'Fade this figure in' : 'Scale this figure up'
  return v.range === 'page'
    ? `${verb} as the page scrolls, tied to the scroll position. Only for an element below the first screen.`
    : `${verb} as it scrolls into view, tied to the scroll position.`
}

const PROGRESS_LINE: Record<Range, string> = {
  page: 'Progress = `scrollTop / (scrollHeight - clientHeight)` of the page scroll (`document.scrollingElement`), clamped 0..1; 0 if the page does not scroll.',
  barSection: "Progress: 0 when the section's top enters at the bottom of the viewport, 1 when its bottom leaves at the top; clamped 0..1.",
  figureSection: "Progress: 0 when the figure's top reaches the bottom of the viewport, 1 when its bottom does; clamped 0..1.",
}

const TIMELINE_WORDS: Record<Range, string> = {
  page: '`animation-timeline: scroll(root)`',
  barSection:
    '`animation-timeline: --section` and `animation-range: cover` (`.marked-section { view-timeline: --section block }`, `body { timeline-scope: --section }`)',
  figureSection: '`animation-timeline: view()` and `animation-range: entry`',
}

// Keyframe ends as the prompt names them.
const PROMPT_STEPS = {
  bar: ['`scaleX(0)`', '`scaleX(1)`'],
  fade: ['`opacity: 0`', '`opacity: 1`'],
  scale: [`\`scale(${SCALE_FROM})\``, '`scale(1)`'],
} as const

// Per effect: the keyframes' name and steps, and the property and value the JS route writes.
const EFFECT = {
  bar: {
    name: 'progress',
    from: 'transform: scaleX(0)',
    to: 'transform: scaleX(1)',
    js: '`scaleX(${progress()})`',
    prop: 'transform',
  },
  fade: { name: 'reveal', from: 'opacity: 0', to: 'opacity: 1', js: 'String(progress())', prop: 'opacity' },
  scale: {
    name: 'settle',
    from: `transform: scale(${SCALE_FROM})`,
    to: 'transform: scale(1)',
    js: `\`scale(\${${SCALE_FROM} + ${+(1 - SCALE_FROM).toFixed(2)} * progress()})\``,
    prop: 'transform',
  },
} as const

const HOUSE_RULE = [
  'House rule: a progress indicator keeps tracking under reduced motion.',
  'Its position is the information, and it moves only as far as the',
  'reader scrolls.',
]

function cssCode(v: V): string {
  const bar = v.effect === 'bar'
  const sel = bar ? '.progress' : '.figure'
  const fx = EFFECT[v.effect]
  const range = rangeOf(v)
  const timeline =
    range === 'page'
      ? ['/* A nested scroller: use scroll(nearest) on an element inside it. */', 'animation-timeline: scroll(root);']
      : range === 'barSection'
        ? ['/* 0: its top enters at the bottom. 1: its bottom leaves at the top. */', 'animation-timeline: --section;', 'animation-range: cover;']
        : ['/* 0: its top reaches the bottom edge. 1: its bottom does. */', 'animation-timeline: view();', 'animation-range: entry;']
  const linkedPage = bar && range === 'page'
  const animated = [
    '/* Same test as the JS tab, which sets data-fallback when it takes over. */',
    ...(linkedPage
      ? [
          '/* .is-linked is in the markup; the JS tab takes it off while the page cannot',
          '   scroll, so the bar empties, and puts it back when it can. */',
        ]
      : []),
    '@supports (animation-timeline: scroll()) {',
    `  html:not([data-fallback]) ${sel}${linkedPage ? '.is-linked' : ''} {`,
    '    /* The shorthand resets animation-timeline, so it comes first. linear maps',
    '       progress 1:1 (the default is ease); both holds the ends outside the range. */',
    `    animation: ${fx.name} linear both;`,
    ...timeline.map((l) => `    ${l}`),
    '  }',
    '}',
  ]
  return [
    ...(range === 'barSection'
      ? [
          "/* Name the section's pass through the viewport; share it with the bar. */",
          'body { timeline-scope: --section; }',
          '.marked-section { view-timeline: --section block; }',
          '',
        ]
      : []),
    ...(bar
      ? [
          '.progress {',
          '  position: fixed;',
          '  inset: 0 0 auto;',
          '  z-index: 50; /* above the page header */',
          '  height: 2px;',
          '  background: currentColor;',
          '  transform-origin: left;',
          '  transform: scaleX(0); /* empty until a timeline or the JS drives it */',
          '  will-change: transform;',
          '  pointer-events: none;',
          '}',
          '',
          ...animated,
        ]
      : [
          ...(v.effect === 'scale' ? ['.figure { transform-origin: center; }', ''] : []),
          '/* Reduced motion: no animation, so the figure shows its final state. */',
          '@media (prefers-reduced-motion: no-preference) {',
          ...animated.map((l) => `  ${l}`),
          '}',
        ]),
    '',
    `@keyframes ${fx.name} {`,
    `  from { ${fx.from}; }`,
    `  to { ${fx.to}; }`,
    '}',
    ...(bar
      ? ['', '/* prefers-reduced-motion: no override.', ...HOUSE_RULE.map((l, i) => `   ${l}${i === HOUSE_RULE.length - 1 ? ' */' : ''}`)]
      : []),
  ].join('\n')
}

// Bar × page runs on both routes: the JS keeps .is-linked in step with whether the page can scroll,
// and drives the bar itself only where scroll timelines are missing.
const LINKED_PAGE_JS = [
  '// Load at the end of `<body>`: the bar exists, and the test runs before it paints.',
  '// Markup: <div class="progress is-linked" aria-hidden="true"></div>',
  '// Same test as the CSS @supports, so the two routes never both drive the bar.',
  "const supported = CSS.supports('animation-timeline', 'scroll()')",
  ...['prefers-reduced-motion: no override.', ...HOUSE_RULE].map((l) => `// ${l}`),
  "const bar = document.querySelector('.progress')",
  '',
  'if (bar) {',
  '  const root = document.documentElement',
  '  const clamp = (n) => Math.min(Math.max(n, 0), 1)',
  '  let frame = 0',
  '',
  '  const render = () => {',
  '    frame = 0',
  '    const max = root.scrollHeight - root.clientHeight',
  '    // Both routes: while the page cannot scroll, .is-linked comes off and the',
  '    // bar empties instead of holding its last value. It goes back on when it can.',
  "    bar.classList.toggle('is-linked', max > 0)",
  '    if (!supported) bar.style.transform = `scaleX(${max > 0 ? clamp(root.scrollTop / max) : 0})`',
  '  }',
  '  const schedule = () => {',
  '    if (!frame) frame = requestAnimationFrame(render)',
  '  }',
  '',
  '  if (!supported) {',
  "    root.dataset.fallback = ''",
  "    addEventListener('scroll', schedule, { passive: true })",
  '  }',
  "  addEventListener('resize', schedule)",
  '  // Content that loads or goes away changes the range without a scroll.',
  '  new ResizeObserver(schedule).observe(document.body)',
  '  render()',
  '}',
].join('\n')

function jsCode(v: V): string {
  if (v.effect === 'bar' && v.range === 'page') return LINKED_PAGE_JS
  const bar = v.effect === 'bar'
  const el = bar ? 'bar' : 'figure'
  const fx = EFFECT[v.effect]
  const range = rangeOf(v)
  const measure =
    range === 'page'
      ? ['const max = root.scrollHeight - root.clientHeight', 'return max > 0 ? clamp(root.scrollTop / max) : 0']
      : range === 'barSection'
        ? [
            "// 0: the section's top enters at the bottom. 1: its bottom leaves at the top.",
            'const box = section.getBoundingClientRect()',
            'return clamp((root.clientHeight - box.top) / (root.clientHeight + box.height))',
          ]
        : v.effect === 'scale'
          ? [
              "// 0: the figure's top reaches the bottom edge. 1: its bottom does.",
              '// The rect includes the scale; undo it to get the layout box.',
              'const box = figure.getBoundingClientRect()',
              'const h = figure.offsetHeight',
              'const top = box.top + (box.height - h) / 2',
              'return clamp((root.clientHeight - top) / h)',
            ]
          : [
              "// 0: the figure's top reaches the bottom edge. 1: its bottom does.",
              'const box = figure.getBoundingClientRect()',
              'return clamp((root.clientHeight - box.top) / box.height)',
            ]
  return [
    '// Load at the end of `<body>`, so the elements exist and the test runs before they paint.',
    '// Same test as the CSS @supports, so the two routes never both run.',
    "const supported = CSS.supports('animation-timeline', 'scroll()')",
    ...(bar
      ? ['prefers-reduced-motion: no override.', ...HOUSE_RULE].map((l) => `// ${l}`)
      : ['// Reduced motion: leave the figure in its final state.', "const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches"]),
    `const ${el} = document.querySelector('.${bar ? 'progress' : 'figure'}')`,
    ...(range === 'barSection' ? ["const section = document.querySelector('.marked-section')"] : []),
    '',
    `if (${el}${range === 'barSection' ? ' && section' : ''} && !supported${bar ? '' : ' && !reduce'}) {`,
    '  const root = document.documentElement',
    '  root.dataset.fallback = \'\'',
    '  const clamp = (n) => Math.min(Math.max(n, 0), 1)',
    '  let frame = 0',
    ...(bar ? [] : ['  let idle = 0']),
    '',
    '  const progress = () => {',
    ...measure.map((l) => `    ${l}`),
    '  }',
    '',
    '  const render = () => {',
    '    frame = 0',
    `    ${el}.style.${fx.prop} = ${fx.js}`,
    '  }',
    '  const schedule = () => {',
    '    if (!frame) frame = requestAnimationFrame(render)',
    '  }',
    ...(bar
      ? []
      : [
          '  const onScroll = () => {',
          `    figure.style.willChange = '${fx.prop}'`,
          '    // Release the layer once scrolling stops.',
          '    clearTimeout(idle)',
          "    idle = setTimeout(() => { figure.style.willChange = '' }, 200)",
          '    schedule()',
          '  }',
        ]),
    '',
    `  addEventListener('scroll', ${bar ? 'schedule' : 'onScroll'}, { passive: true })`,
    "  addEventListener('resize', schedule)",
    '  // Content that loads later (images, embeds) changes the range without a scroll.',
    '  new ResizeObserver(schedule).observe(document.body)',
    '  render()',
    '}',
  ].join('\n')
}

const MOTION_BAR = ['<motion.div', '  aria-hidden', '  className={barClass}', '  style={{ scaleX: scrollYProgress }}', '/>']

function motionCode(v: V): string {
  const page = v.range === 'page'
  if (v.effect === 'bar') {
    return [
      "import { motion, useScroll } from 'motion/react'",
      ...(page ? [] : ["import { useRef, type ReactNode } from 'react'"]),
      '',
      ...[...HOUSE_RULE.slice(0, 1), 'So there is no useReducedMotion gate here.'].map((l) => `// ${l}`),
      'const barClass =',
      "  'pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-current'",
      '',
      ...(page
        ? [
            'export function ReadingProgress() {',
            '  const { scrollYProgress } = useScroll()',
            '  return (',
            ...MOTION_BAR.map((l) => `    ${l}`),
            '  )',
            '}',
          ]
        : [
            'export function SectionProgress({ children }: { children: ReactNode }) {',
            '  const section = useRef<HTMLElement>(null)',
            "  // 0: the section's top enters at the bottom. 1: its bottom leaves at the top.",
            '  const { scrollYProgress } = useScroll({',
            '    target: section,',
            "    offset: ['start end', 'end start'],",
            '  })',
            '  return (',
            '    <>',
            ...MOTION_BAR.map((l) => `      ${l}`),
            '      <section ref={section}>{children}</section>',
            '    </>',
            '  )',
            '}',
          ]),
    ].join('\n')
  }
  const fade = v.effect === 'fade'
  const output = fade ? '[0, 1]' : `[${SCALE_FROM}, 1]`
  const prop = fade ? 'opacity' : 'scale'
  return [
    "import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'",
    page ? "import type { ReactNode } from 'react'" : "import { useRef, type ReactNode } from 'react'",
    '',
    'export function Figure({ children }: { children: ReactNode }) {',
    ...(page
      ? ['  const { scrollYProgress } = useScroll()']
      : [
          '  const ref = useRef<HTMLElement>(null)',
          "  // 0: the figure's top reaches the bottom edge. 1: its bottom does.",
          '  const { scrollYProgress } = useScroll({',
          '    target: ref,',
          "    offset: ['start end', 'end end'],",
          '  })',
        ]),
    `  const ${prop} = useTransform(scrollYProgress, [0, 1], ${output})`,
    '  const reduce = useReducedMotion() // reduced motion: the final state',
    '  return (',
    `    <motion.figure${page ? '' : ' ref={ref}'} style={reduce ? undefined : { ${prop} }}>`,
    '      {children}',
    '    </motion.figure>',
    '  )',
    '}',
  ].join('\n')
}

export default defineTerm({
  slug: 'scroll-linked',
  name: 'Scroll-linked',
  category: 'scroll',
  order: 2,
  status: 'published',
  definition: 'An animation whose progress is tied directly to the scroll position, moving forward and backward as you scroll.',
  aliases: [
    'scroll-driven animation',
    'scrubbing',
    'scroll timeline',
    'tied to scroll position',
    'progress follows the scrollbar',
    'scroll scrubbed',
  ],
  description:
    'Scroll-linked motion has no duration and no easing. Its progress is a number from 0 to 1, measured over the whole page or over the stretch where one element passes through the viewport, and that number is mapped straight onto a property. Scroll down and it moves forward; scroll back up and it runs backwards, exactly as fast as you scroll. CSS can do this on its own with scroll-driven animations.',
  useWhen: [
    'A reading progress bar on long articles and docs.',
    'An element tied to its own pass through the viewport, like a figure that settles into place as it scrolls in and undoes it when the reader scrolls back.',
    'Storytelling sections where the scroll position is the timeline and the reader sets the pace in both directions.',
  ],
  avoidWhen: [
    'Entrances that should finish on their own once seen. That is scroll-triggered.',
    'Large movement or scaling that is out of step with the scroll. It can make people with vestibular disorders feel unwell.',
    'Text people need to read at a given moment. A fade tied to scroll leaves it half transparent wherever the reader stops.',
  ],
  demo: {
    component: ScrollLinkedDemo,
    label:
      'A wireframe article scrolls down and back up inside a small browser window. A thin bar across the top grows with the scroll position and shrinks again on the way up. The controls switch the effect to a figure that fades or scales, and measure progress over the whole page or over the element while it is in view.',
    controls,
    glyph: ScrollLinkedGlyph,
  },
  prompt: (v) => {
    const bar = v.effect === 'bar'
    const fx = EFFECT[v.effect]
    const range = rangeOf(v)
    const [from, to] = PROMPT_STEPS[v.effect]
    const effectLine = bar
      ? '- Bar: 2px tall, fixed across the top, full width, `z-index: 50`, `pointer-events: none`, `aria-hidden`, `transform-origin: left`, `transform: scaleX(progress)` (base `scaleX(0)`), `will-change: transform`. Never animate width.'
      : v.effect === 'fade'
        ? '- Figure: `opacity: progress` (0 to 1); it keeps its space.'
        : `- Figure: \`transform: scale(${SCALE_FROM} + ${+(1 - SCALE_FROM).toFixed(2)} × progress)\`, centered. Never animate width or height.`
    return [
      intro(v),
      '',
      `- ${PROGRESS_LINE[range]} No transition, easing, delay or smoothing.`,
      ...(range === 'page' ? ['- For a nested scroller, use its own scrollTop/scrollHeight and `scroll(nearest)`.'] : []),
      effectLine,
      ...(bar ? [] : ["- The figure's base style is its final state."]),
      `- CSS route: \`@keyframes ${fx.name}\` from ${from} to ${to}; \`animation: ${fx.name} linear both\`, then ${TIMELINE_WORDS[range]}; shorthand first, it resets the timeline.`,
      `- Feature-test \`CSS.supports('animation-timeline', 'scroll()')\` before the ${bar ? 'bar' : 'figure'}'s first paint and set \`data-fallback\` on \`<html>\` when false; then use the JS route. Scope the CSS animation to \`html:not([data-fallback])\` inside \`@supports (animation-timeline: scroll())\`.`,
      `- JS route: passive scroll listener, one requestAnimationFrame, clamp, write the ${fx.prop} to the element (not framework state). Also recompute on \`resize\` and a \`ResizeObserver\` on \`document.body\`; scroll alone goes stale.${v.effect === 'scale' && range === 'figureSection' ? " Measure the figure's layout box (its rect includes the scale)." : ''}`,
      ...(bar && range === 'page'
        ? [
            '- Page not scrollable: bar at 0. Put `.is-linked` on the bar in the markup and scope the CSS animation to it; JS toggles it from `scrollHeight > clientHeight` on `resize`/`ResizeObserver`; the JS route writes `scaleX(0)`.',
          ]
        : []),
      bar ? '- Reduced motion: no override.' : `- Reduced motion: no animation; ${v.effect === 'fade' ? 'fully opaque' : 'full size'}.`,
    ].join('\n')
  },
  acceptance: (v) => {
    const bar = v.effect === 'bar'
    const range = rangeOf(v)
    const half = bar
      ? "the bar spans half the scroll container's width (clientWidth)"
      : v.effect === 'fade'
        ? 'the figure is at opacity 0.5'
        : `the figure is at scale ${(SCALE_FROM + 1) / 2}`
    return [
      range === 'page'
        ? `At 50% of the page, ${half}.`
        : range === 'barSection'
          ? `Halfway through the section's pass (its middle at the middle of the viewport), ${half}.`
          : `When the figure is half inside the viewport from the bottom, ${half}.`,
      range === 'page'
        ? bar
          ? 'At the very top the bar is empty; at the very end it is full. On a page too short to scroll it stays empty.'
          : `At the very top the figure is at its start state (${v.effect === 'fade' ? 'opacity 0' : `scale ${SCALE_FROM}`}); at the very end it is at its final state.`
        : range === 'barSection'
          ? 'Before the section reaches the viewport the bar is empty; once the section has left at the top it is full.'
          : 'Until its top reaches the viewport the figure holds its start state; once it is fully inside, its final state.',
      `Scrolling back up ${bar ? 'shrinks the bar' : v.effect === 'fade' ? 'fades the figure back out' : 'scales the figure back down'} at the same rate; it never replays forward or snaps.`,
      'No transition, delay or smoothing on the element: once the scroll handlers have run, it matches the scroll position in the same frame.',
      'After resizing the window or loading more content, progress still matches the scroll position.',
      `Only ${bar || v.effect === 'scale' ? 'transform' : 'opacity'} changes; nothing around ${bar ? 'the bar' : 'the figure'} moves.`,
      bar
        ? 'With reduced motion on, the bar still tracks the scroll position.'
        : `With reduced motion on, the figure is ${v.effect === 'fade' ? 'fully visible' : 'at full size'} and does not change while scrolling.`,
      "In a browser where `CSS.supports('animation-timeline', 'scroll()')` is false (Firefox today), the JS route gives the same result. To check in Chromium, stub `CSS.supports` to return false before the page loads.",
    ]
  },
  code: (v) => ({ css: cssCode(v), js: jsCode(v), motion: motionCode(v) }),
  a11y: 'Keep scroll-linked movement small and in step with the scroll: large motion out of step with it can make people with vestibular disorders unwell. Under reduced motion, show decorative effects in their final state. A reading progress bar keeps tracking, since its position is the information (a house rule). It repeats what the scrollbar already says, so hide it from screen readers with aria-hidden.',
  related: ['scroll-triggered', 'scroll-progress-indicator', 'parallax'],
  confusedWith: [
    {
      slug: 'parallax',
      difference:
        'Parallax is one use of scroll-linked motion: layers move at different speeds to suggest depth. Scroll-linked is the general technique of tying any property to the scroll position.',
    },
  ],
  sources: [
    { label: 'MDN: CSS scroll-driven animations', url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll-driven_animations' },
    { label: 'Motion: useScroll', url: 'https://motion.dev/docs/react-use-scroll' },
  ],
})
