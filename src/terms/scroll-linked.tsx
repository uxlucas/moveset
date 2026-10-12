import { useEffect, useRef, type RefObject } from 'react'
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
      { value: 'section', label: 'Own section' },
    ],
    default: 'page',
  },
] as const satisfies readonly Control[]

type V = ControlValues<typeof controls>

const SCALE_FROM = 0.92
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
const PARAGRAPHS = { card: { before: 3, after: 4 }, detail: { before: 5, after: 5 } }

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
  useAutoScroll(scrollRef, {
    playing,
    replayKey,
    timeScale,
    onCycleEnd,
    interactive: size === 'detail',
    durationMs: 8000,
    stillAt: 0.45,
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
          <div ref={barRef} data-progress-bar="" className="h-0.5 origin-left bg-demo-subject [transform:scaleX(0)]" />
        </div>
      )}
      <article className={detail ? 'px-6 pb-6 pt-5' : 'px-3.5 pb-3.5 pt-3'}>
        <div className={detail ? 'mb-5 space-y-2.5' : 'mb-3 space-y-1.5'}>
          <div className={`w-3/5 rounded-full bg-demo-2 ${detail ? 'h-3' : 'h-2'}`} />
          <div className={`w-1/4 rounded-full bg-demo ${detail ? 'h-1.5' : 'h-1'}`} />
        </div>
        {BEFORE.slice(0, PARAGRAPHS[size].before).map((p, i) => <Paragraph key={i} widths={p} detail={detail} />)}
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
            className={`rounded-lg ${isBar ? 'bg-demo-2' : 'bg-demo-subject'} ${detail ? 'mb-4 h-36' : 'mb-2.5 h-16'}`}
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

const RANGE_WORDS = {
  page: '0 at the top of the page and 1 when it is scrolled to the end: `scrollTop / (scrollHeight - clientHeight)`',
  barSection:
    "0 when the top of the marked section enters at the bottom of the viewport, 1 when its bottom leaves at the top (CSS `animation-range: cover`). Before the section the bar is empty; after it, full",
  figureSection:
    "0 when the figure's top edge reaches the bottom of the viewport, 1 when its bottom edge does (CSS `animation-range: entry`). Before that range it holds its start state; after it, its end state",
}

const TIMELINE_WORDS = {
  page: '`animation-timeline: scroll(root)`',
  barSection: 'a named `view-timeline` on the section, shared with the bar through `timeline-scope`, and `animation-range: cover`',
  figureSection: '`animation-timeline: view()` and `animation-range: entry`',
}

function rangeWords(v: V) {
  if (v.range === 'page') return RANGE_WORDS.page
  return v.effect === 'bar' ? RANGE_WORDS.barSection : RANGE_WORDS.figureSection
}

// Per effect: the CSS keyframes, and the property and value the JS fallback writes.
const EFFECT = {
  bar: { keyframes: ['from { transform: scaleX(0); }', 'to { transform: scaleX(1); }'], js: '`scaleX(${progress()})`', prop: 'transform' },
  fade: { keyframes: ['from { opacity: 0; }', 'to { opacity: 1; }'], js: 'String(progress())', prop: 'opacity' },
  scale: {
    keyframes: [`from { transform: scale(${SCALE_FROM}); }`, 'to { transform: scale(1); }'],
    js: `\`scale(\${${SCALE_FROM} + ${+(1 - SCALE_FROM).toFixed(2)} * progress()})\``,
    prop: 'transform',
  },
} as const

function cssCode(v: V): string {
  const bar = v.effect === 'bar'
  const sel = bar ? '.progress' : '.figure'
  const name = bar ? 'progress' : v.effect === 'fade' ? 'reveal' : 'settle'
  const fn = v.range === 'page' ? 'scroll()' : 'view()'
  const timeline =
    v.range === 'page'
      ? ['  animation-timeline: scroll(root);']
      : bar
        ? ['  /* 0: its top enters at the bottom. 1: its bottom leaves at the top. */', '  animation-timeline: --section;', '  animation-range: cover;']
        : ['  /* 0: its top reaches the bottom edge. 1: its bottom does. */', '  animation-timeline: view();', '  animation-range: entry;']
  return [
    ...(bar && v.range === 'section'
      ? [
          "/* Name the section's pass through the viewport; share it with the bar. */",
          'body { timeline-scope: --section; }',
          '.marked-section { view-timeline: --section block; }',
          '',
        ]
      : []),
    `${sel} {`,
    ...(bar
      ? ['  position: fixed;', '  inset: 0 0 auto;', '  height: 2px;', '  background: currentColor;', '  transform-origin: left;']
      : v.effect === 'scale'
        ? ['  transform-origin: center;']
        : []),
    '  /* No duration, no easing: progress is the scroll position. */',
    `  animation: ${name} auto linear both;`,
    ...timeline,
    '}',
    '',
    `@keyframes ${name} {`,
    ...EFFECT[v.effect].keyframes.map((k) => `  ${k}`),
    '}',
    '',
    '/* Firefox and Safari before 26 have no scroll timelines.',
    bar ? '   Keep the bar empty there and let the JS tab drive it. */' : '   The figure keeps its final state there, or the JS tab drives it. */',
    `@supports not (animation-timeline: ${fn}) {`,
    `  ${sel} { animation: none;${bar ? ' transform: scaleX(0);' : ''} }`,
    '}',
    '',
    ...(bar
      ? [
          '/* prefers-reduced-motion: the bar keeps tracking. It has no travel',
          '   or easing of its own, moves exactly as far as the reader scrolls,',
          '   and the position it shows is the information. */',
        ]
      : [
          '/* Reduced motion: the final state, fully visible at full size. */',
          '@media (prefers-reduced-motion: reduce) {',
          `  ${sel} { animation: none; }`,
          '}',
        ]),
  ].join('\n')
}

function jsCode(v: V): string {
  const bar = v.effect === 'bar'
  const el = bar ? 'bar' : 'figure'
  const supports = v.range === 'page' ? 'scroll()' : 'view()'
  const measure =
    v.range === 'page'
      ? ['const max = document.documentElement.scrollHeight - innerHeight', 'return max > 0 ? clamp(scrollY / max) : 0']
      : bar
        ? [
            "// 0: the section's top enters at the bottom. 1: its bottom leaves at the top.",
            'const box = section.getBoundingClientRect()',
            'return clamp((innerHeight - box.top) / (innerHeight + box.height))',
          ]
        : [
            "// 0: the figure's top reaches the bottom edge. 1: its bottom does.",
            ...(v.effect === 'scale'
              ? ["// Measure the figure's wrapper: the figure's own box includes the scale.", 'const box = figure.parentElement.getBoundingClientRect()']
              : ['const box = figure.getBoundingClientRect()']),
            'return clamp((innerHeight - box.top) / box.height)',
          ]
  return [
    '// Fallback for browsers without scroll timelines; elsewhere CSS does it.',
    `const needed = !CSS.supports('animation-timeline: ${supports}')`,
    ...(bar
      ? ['// Under prefers-reduced-motion the bar keeps tracking: it moves only', '// as far as the reader scrolls.']
      : ['// Under reduced motion, leave the figure in its final state.', "const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches"]),
    '',
    `if (needed${bar ? '' : ' && !reduce'}) {`,
    `  const ${el} = document.querySelector('.${bar ? 'progress' : 'figure'}')`,
    ...(bar && v.range === 'section' ? ["  const section = document.querySelector('.marked-section')"] : []),
    '  const clamp = (n) => Math.min(Math.max(n, 0), 1)',
    '  let frame = 0',
    '  let idle = 0',
    '',
    '  const progress = () => {',
    ...measure.map((l) => `    ${l}`),
    '  }',
    '',
    '  const render = () => {',
    '    frame = 0',
    `    ${el}.style.${EFFECT[v.effect].prop} = ${EFFECT[v.effect].js}`,
    '  }',
    '',
    '  const onScroll = () => {',
    `    ${el}.style.willChange = '${EFFECT[v.effect].prop}'`,
    '    // Release the layer once scrolling stops.',
    '    clearTimeout(idle)',
    `    idle = setTimeout(() => { ${el}.style.willChange = '' }, 200)`,
    '    if (!frame) frame = requestAnimationFrame(render)',
    '  }',
    '',
    "  addEventListener('scroll', onScroll, { passive: true })",
    "  addEventListener('resize', render)",
    '  render()',
    '}',
  ].join('\n')
}

const MOTION_BAR = [
  '<motion.div',
  '  aria-hidden',
  '  className="fixed inset-x-0 top-0 h-0.5 origin-left bg-current"',
  '  style={{ scaleX: scrollYProgress }}',
  '/>',
]

function motionCode(v: V): string {
  const page = v.range === 'page'
  if (v.effect === 'bar') {
    return [
      "import { motion, useScroll } from 'motion/react'",
      ...(page ? [] : ["import { useRef, type ReactNode } from 'react'"]),
      '',
      '// No useReducedMotion gate: the bar has no travel or easing of its own.',
      '// It moves exactly as far as the reader scrolls, and the position it',
      '// shows is the information.',
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
  status: 'review',
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
      'A wireframe article scrolls down and back up inside a small browser window. A thin bar across the top grows with the scroll position and shrinks again on the way up. The controls switch the effect to a figure that fades or scales, and measure progress over the whole page or over one section.',
    controls,
    glyph: ScrollLinkedGlyph,
  },
  prompt: (v) => {
    const bar = v.effect === 'bar'
    const intro = bar
      ? v.range === 'page'
        ? 'Add a reading progress bar that follows the scroll position of the page.'
        : 'Add a progress bar that follows the scroll position through the marked section.'
      : `${v.effect === 'fade' ? 'Fade this figure in' : 'Scale this figure up'} as the ${v.range === 'page' ? 'page scrolls' : 'figure scrolls into view'}, tied to the scroll position.`
    const effectLine = bar
      ? '- The bar is 2px tall, fixed across the top of the viewport at full width, with `transform-origin: left` and `transform: scaleX(progress)`. Never animate its width. Give it `aria-hidden`: the scrollbar already says the same thing.'
      : v.effect === 'fade'
        ? '- Set `opacity: progress`, from 0 to 1. The figure keeps its space the whole time, so nothing around it moves.'
        : `- Set \`transform: scale(${SCALE_FROM} + ${+(1 - SCALE_FROM).toFixed(2)} × progress)\`, from ${SCALE_FROM} to 1, centered. Never animate its width or height.`
    const reduced = bar
      ? '- Under `prefers-reduced-motion: reduce`, keep the bar tracking: it has no travel or easing of its own, moves only as far as the reader scrolls, and the position it shows is the information.'
      : `- Under \`prefers-reduced-motion: reduce\`, show the final state (${v.effect === 'fade' ? 'fully opaque' : 'full size'}) and leave it there while scrolling.`
    return [
      intro,
      '',
      '- There is no duration and no easing. Progress is the scroll position, mapped linearly to a number from 0 to 1, so the effect moves exactly as far as the reader scrolls, and runs backwards when they scroll up. It must work in both directions.',
      `- Progress: ${rangeWords(v)}.`,
      effectLine,
      `- Use CSS scroll-driven animations where supported: ${TIMELINE_WORDS[v.range === 'page' ? 'page' : bar ? 'barSection' : 'figureSection']}, with \`linear\` timing and \`animation-duration: auto\`. Where \`animation-timeline\` is not supported, fall back to a passive scroll listener that reads the scroll position, clamps progress to 0..1 and writes the style in a requestAnimationFrame. With Motion, use \`useScroll\` and \`useTransform\`${v.range === 'section' ? ` with \`target\` and \`offset: ['start end', '${bar ? 'end start' : 'end end'}']\`` : ''}.`,
      `- States to handle: at the top (${bar ? (v.range === 'page' ? 'bar empty' : 'bar empty until the section enters') : v.range === 'page' ? 'figure at its start state' : 'figure at its start state until it reaches the viewport'}); midway (exactly proportional); at the end (${bar ? 'bar full' : 'final state'}); scrolling back up (runs backwards at the same rate, never replays forward); resize and content changes (recompute the range from the new sizes); browsers without scroll timelines (the JS fallback).`,
      reduced,
      "- Don't add a transition, easing or smoothing on top: any lag breaks the 1:1 link with the scrollbar. Don't trigger it once when the element enters (that is scroll-triggered). Don't store progress in framework state on every scroll event; write to the element.",
    ].join('\n')
  },
  acceptance: (v) => {
    const bar = v.effect === 'bar'
    const half = bar ? 'the bar spans half the viewport width' : v.effect === 'fade' ? 'the figure is at opacity 0.5' : `the figure is at scale ${(SCALE_FROM + 1) / 2}`
    return [
      v.range === 'page'
        ? `At 50% of the page, ${half}.`
        : bar
          ? `Halfway through the section's pass (its middle at the middle of the viewport), ${half}.`
          : `When the figure is half inside the viewport from the bottom, ${half}.`,
      bar
        ? v.range === 'page'
          ? 'At the very top the bar is empty; at the very end it is full.'
          : 'Before the section reaches the viewport the bar is empty; once the section has left at the top it is full.'
        : v.range === 'page'
          ? `At the very top the figure is at its start state (${v.effect === 'fade' ? 'opacity 0' : `scale ${SCALE_FROM}`}); at the very end it is at its final state.`
          : 'Until its top reaches the viewport the figure holds its start state; once it is fully inside, its final state.',
      `Scrolling back up ${bar ? 'shrinks the bar' : v.effect === 'fade' ? 'fades the figure back out' : 'scales the figure back down'} at the same rate; it never replays forward or snaps.`,
      'No easing, delay or smoothing is applied: when scrolling stops, it stops in the same frame.',
      'After resizing the window, progress still matches the scroll position.',
      `Only ${bar || v.effect === 'scale' ? 'transform' : 'opacity'} changes; nothing around ${bar ? 'the bar' : 'the figure'} moves.`,
      bar
        ? 'With reduced motion on, the bar still tracks the scroll position.'
        : `With reduced motion on, the figure is ${v.effect === 'fade' ? 'fully visible' : 'at full size'} and does not change while scrolling.`,
      'In a browser without scroll timelines (Firefox), the JS fallback gives the same result.',
    ]
  },
  code: (v) => ({ css: cssCode(v), js: jsCode(v), motion: motionCode(v) }),
  a11y: 'Keep scroll-linked movement small and in step with the scroll: large motion out of step with it can make people with vestibular disorders unwell. Under reduced motion, show decorative effects in their final state. A reading progress bar can keep tracking, since its position is the information. It repeats what the scrollbar already says, so hide it from screen readers with aria-hidden.',
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
