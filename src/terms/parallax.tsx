import { useEffect, useRef, type RefObject } from 'react'
import { BrowserFrame } from '@/components/demo/browser-frame'
import { useAutoScroll } from '@/components/demo/use-auto-scroll'
import { GlyphSvg } from '@/components/site/glyph'
import { defineTerm, type Control, type ControlValues, type DemoProps, type GlyphProps } from '@/lib/term-types'

const controls = [
  {
    id: 'depth',
    type: 'select',
    label: 'Back layer speed',
    options: [
      { value: '0.2', label: '0.2×' },
      { value: '0.4', label: '0.4×' },
      { value: '0.6', label: '0.6×' },
    ],
    default: '0.4',
  },
  {
    id: 'layers',
    type: 'select',
    label: 'Layers',
    options: [
      { value: '2', label: '2' },
      { value: '3', label: '3' },
    ],
    default: '2',
  },
] as const satisfies readonly Control[]

type V = ControlValues<typeof controls>

// Still frame: the panel has slid over about a third of the blocks, which have moved up but are still whole.
const STILL_PX = { card: 50, detail: 92 }

// The far layer, when there is one, moves at half the back layer's speed.
const ratios = (v: V) => {
  const back = Number(v.depth)
  return { back, far: v.layers === '3' ? back / 2 : undefined }
}
// Each layer scrolls with the hero; pushing it down by (1 - ratio) of the scroll leaves it moving ratio × the scroll.
const shift = (ratio: number) => +((1 - ratio) * 100).toFixed(1)

// Line widths (%) per paragraph of the front panel.
const PARAGRAPHS = [
  [92, 86, 96, 70],
  [88, 96, 82, 94, 58],
  [94, 90, 86, 64],
  [90, 84, 96, 76],
]

// Writes each layer's transform straight from scrollTop: no React state, no smoothing. The page itself is the hero,
// so the scroll distance into the hero is scrollTop.
function useParallax(rootRef: RefObject<HTMLDivElement | null>, { depth, layers }: V) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const els = [...root.querySelectorAll<HTMLElement>('[data-ratio]')]
    const update = () => {
      const n = root.scrollTop
      for (const el of els) el.style.transform = `translate3d(0, ${n * (1 - Number(el.dataset.ratio))}px, 0)`
    }
    update()
    root.addEventListener('scroll', update, { passive: true })
    return () => {
      root.removeEventListener('scroll', update)
      for (const el of els) el.style.transform = ''
    }
  }, [rootRef, depth, layers])
}

function ParallaxDemo({ values, playing, replayKey, size, timeScale, onCycleEnd }: DemoProps<V>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useAutoScroll(scrollRef, {
    playing,
    replayKey,
    timeScale,
    onCycleEnd,
    interactive: size === 'detail',
    durationMs: 7600,
    stillPx: STILL_PX[size],
    returnTrip: true,
  })
  useParallax(scrollRef, values)
  const { back, far } = ratios(values)
  const detail = size === 'detail'
  const layer = 'pointer-events-none absolute inset-0 will-change-transform'

  return (
    <BrowserFrame scrollRef={scrollRef} size={size} label="Page whose background blocks scroll slower than the text panel in front">
      {/* The page is the hero: 1.85 windows tall, so the front panel slides most of the way over the blocks. */}
      <div data-hero="" className="relative flex min-h-[185%] flex-col overflow-clip">
        {far !== undefined && (
          <div data-layer="far" data-ratio={far} aria-hidden className={layer}>
            <div className={`rounded-lg bg-demo ${detail ? 'mx-5 mt-7 h-[200px]' : 'mx-3 mt-3 h-24'}`} />
          </div>
        )}
        <div data-layer="back" data-ratio={back} aria-hidden className={layer}>
          <div className={`grid grid-cols-2 ${detail ? 'gap-4 px-10 pt-12' : 'gap-2.5 px-5 pt-6'}`}>
            <div className={`rounded-md bg-demo-subject ${detail ? 'h-28' : 'h-[52px]'}`} />
            <div className={`rounded-md bg-demo-subject ${detail ? 'h-28' : 'h-[52px]'}`} />
          </div>
        </div>
        <div
          data-layer="front"
          className={`relative flex-1 rounded-t-xl bg-surface shadow-[0_-1px_0_var(--line),0_-8px_20px_oklch(0_0_0/0.06)] ${detail ? 'mt-[176px] px-6 pt-5' : 'mt-[88px] px-3.5 pt-3'}`}
        >
          <div className={`w-1/2 rounded-full bg-demo-2 ${detail ? 'mb-4 h-3' : 'mb-2.5 h-2'}`} />
          {PARAGRAPHS.map((widths, i) => (
            <div key={i} className={detail ? 'mb-4 space-y-2' : 'mb-2.5 space-y-1.5'}>
              {widths.map((w, j) => (
                <div key={j} style={{ width: `${w}%` }} className={`rounded-full bg-demo ${detail ? 'h-1.5' : 'h-1'}`} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  )
}

function ParallaxGlyph({ active }: GlyphProps) {
  return (
    <GlyphSvg kind="parallax" active={active} clipped>
      <rect className="m b" x="2.6" y="2.6" width="6.8" height="3.4" rx=".9" fill="currentColor" opacity=".35" />
      <rect className="m f" x="3" y="6.8" width="6" height="1.2" rx=".6" fill="currentColor" />
    </GlyphSvg>
  )
}

const HOUSE_RULE = 'House rule: decorative scroll-linked motion goes flat under reduced motion.'

function cssCode(v: V): string {
  const { back, far } = ratios(v)
  return [
    '/* Markup: <section class="hero">',
    ...(far !== undefined ? ['             <div class="layer layer-far" aria-hidden="true">…</div>'] : []),
    '             <div class="layer layer-back" aria-hidden="true">…</div>',
    '             <div class="hero-content">…</div>',
    '           </section> */',
    '.hero {',
    '  position: relative;',
    '  /* Moved layers never paint below the hero or make the page taller. */',
    '  overflow: clip;',
    '  view-timeline: --hero block;',
    '}',
    '',
    '.layer {',
    '  position: absolute;',
    '  inset: 0;',
    '  pointer-events: none;',
    '  will-change: transform; /* set once: the layers move for the whole hero */',
    '}',
    '',
    '/* A layer scrolls with the hero; pushing it down (1 - ratio) of the scroll',
    '   leaves it moving ratio x the scroll. % is of its own height: the hero. */',
    ...(far !== undefined ? [`.layer-far { --shift: ${shift(far)}%; } /* ratio ${far} */`] : []),
    `.layer-back { --shift: ${shift(back)}%; } /* ratio ${back} */`,
    '',
    '/* In front, at full speed. Opaque, so the layers pass behind it. */',
    '.hero-content {',
    '  position: relative;',
    '  background: var(--surface, #fff);',
    '}',
    '',
    `/* ${HOUSE_RULE}`,
    '   For parallax that means no speed difference: no animation at all. */',
    '@media (prefers-reduced-motion: no-preference) {',
    '  /* Same test as the JS tab, which sets data-fallback when it takes over. */',
    '  @supports (animation-timeline: scroll()) {',
    '    html:not([data-fallback]) .layer {',
    '      /* The shorthand resets animation-timeline, so it comes first. linear',
    '         maps progress 1:1; both holds the ends outside the range. */',
    '      animation: parallax linear both;',
    '      animation-timeline: --hero;',
    "      /* 0: the hero's top at the viewport top. 1: its bottom there. */",
    '      animation-range: exit-crossing;',
    '    }',
    '  }',
    '}',
    '',
    '@keyframes parallax {',
    '  from { transform: translate3d(0, 0, 0); }',
    '  to { transform: translate3d(0, var(--shift), 0); }',
    '}',
  ].join('\n')
}

function jsCode(v: V): string {
  const { back, far } = ratios(v)
  return [
    '// Load at the end of `<body>`: the hero exists, and the test runs before it paints.',
    '// Same test as the CSS @supports, so the two routes never both run.',
    "const supported = CSS.supports('animation-timeline', 'scroll()')",
    `// ${HOUSE_RULE}`,
    "const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches",
    "const hero = document.querySelector('.hero')",
    '',
    'if (hero && !supported && !reduce) {',
    "  document.documentElement.dataset.fallback = ''",
    '  // [layer, speed ratio]',
    '  const layers = [',
    ...(far !== undefined ? [`    [hero.querySelector('.layer-far'), ${far}],`] : []),
    `    [hero.querySelector('.layer-back'), ${back}],`,
    '  ]',
    '  let frame = 0',
    '',
    '  const render = () => {',
    '    frame = 0',
    '    // Pixels the hero has scrolled past the viewport top, 0 to its height.',
    '    const box = hero.getBoundingClientRect()',
    '    const n = Math.min(Math.max(-box.top, 0), box.height)',
    '    // The layer scrolls n with the hero; pushing it down n x (1 - ratio)',
    '    // leaves it moving n x ratio on screen.',
    '    for (const [layer, ratio] of layers) {',
    '      layer.style.transform = `translate3d(0, ${n * (1 - ratio)}px, 0)`',
    '    }',
    '  }',
    '  const schedule = () => {',
    '    if (!frame) frame = requestAnimationFrame(render)',
    '  }',
    '',
    "  addEventListener('scroll', schedule, { passive: true })",
    "  addEventListener('resize', schedule)",
    '  render()',
    '}',
  ].join('\n')
}

function motionCode(v: V): string {
  const { back, far } = ratios(v)
  const three = far !== undefined
  return [
    "import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'",
    "import { useRef, type ReactNode } from 'react'",
    '',
    "const layer = 'pointer-events-none absolute inset-0 will-change-transform'",
    '',
    'type Props = {',
    ...(three ? ['  far: ReactNode'] : []),
    '  back: ReactNode',
    '  children: ReactNode',
    '}',
    '',
    `export function ParallaxHero({ ${three ? 'far, ' : ''}back, children }: Props) {`,
    '  const ref = useRef<HTMLElement>(null)',
    "  // 0: the hero's top at the viewport top. 1: its bottom there.",
    '  const { scrollYProgress } = useScroll({',
    '    target: ref,',
    "    offset: ['start start', 'end start'],",
    '  })',
    '  // A layer scrolls with the hero; pushing it down (1 - ratio) of its height',
    '  // leaves it moving ratio x the scroll on screen.',
    ...(three ? [`  const farY = useTransform(scrollYProgress, [0, 1], ['0%', '${shift(far)}%']) // ratio ${far}`] : []),
    `  const backY = useTransform(scrollYProgress, [0, 1], ['0%', '${shift(back)}%']) // ratio ${back}`,
    `  // ${HOUSE_RULE}`,
    '  const reduce = useReducedMotion()',
    '  return (',
    '    <section ref={ref} className="relative overflow-clip">',
    ...(three
      ? [
          '      <motion.div aria-hidden className={layer} style={reduce ? undefined : { y: farY }}>',
          '        {far}',
          '      </motion.div>',
        ]
      : []),
    '      <motion.div aria-hidden className={layer} style={reduce ? undefined : { y: backY }}>',
    '        {back}',
    '      </motion.div>',
    '      {/* In front, at full speed: opaque, so the layers pass behind it. */}',
    '      <div className="relative bg-white">{children}</div>',
    '    </section>',
    '  )',
    '}',
  ].join('\n')
}

export default defineTerm({
  slug: 'parallax',
  name: 'Parallax',
  category: 'scroll',
  order: 3,
  status: 'review',
  definition: 'Layers move at different speeds while you scroll, which makes the page feel like it has depth.',
  aliases: [
    'depth scroll',
    'multi-speed scroll',
    'layered scroll',
    'background moves slower',
    'background lags behind the content',
    'parallax scrolling',
  ],
  description:
    'Parallax is scroll-linked motion with one job: faking distance. The content scrolls at full speed while each layer behind it moves a fixed fraction of the scroll, so near things pass far things the way they do from a train window. There is no duration and no easing; the offset is the scroll distance times a ratio, and it reverses exactly when you scroll back.',
  useWhen: [
    'A hero or editorial opener, where a sense of depth sets the tone before the reading starts.',
    'Decorative backgrounds on marketing pages: shapes, illustration, photography behind a headline.',
    'Sparingly: one section per page, so it stays a moment instead of a texture.',
  ],
  avoidWhen: [
    'Content people read or act on, like text, forms and controls. Anything that drifts out of step with the scroll is harder to follow and to hit.',
    'Large layers with big speed differences, or effects across the whole page. Motion out of step with the scroll can make people with vestibular disorders unwell.',
    'Pages where reduced motion cannot simply flatten the layers. If the layout only works with the offset, it is not decoration.',
  ],
  demo: {
    component: ParallaxDemo,
    label:
      'A wireframe page scrolls down and back up inside a small browser window. Two dark blocks at the top drift up at a fraction of the scroll speed while a panel of text lines in front scrolls at full speed and slides over them. The controls change how fast the blocks move and add a third, slower layer behind them.',
    controls,
    glyph: ParallaxGlyph,
  },
  prompt: (v) => {
    const { back, far } = ratios(v)
    const shifts = far !== undefined ? `${shift(far)}% (far) or ${shift(back)}% (back)` : `${shift(back)}%`
    return [
      'Add parallax to the hero at the top of this page: layers behind the content move slower than the scroll, the content at full speed.',
      '',
      '- Hero: `position: relative; overflow: clip`. Content: in flow, `position: relative`, opaque background, above the layers.',
      `- ${far !== undefined ? 'Two layers' : 'One layer'}: \`position: absolute; inset: 0\`, \`pointer-events: none\`, \`aria-hidden\`, before the content in the DOM${far !== undefined ? ', far first' : ''}.`,
      `- Speed ratios: ${far !== undefined ? `far ${far}, ` : ''}back ${back} (moves ${back}px per 1px scrolled), content 1.`,
      "- Progress: 0 when the hero's top is at the viewport top, 1 when its bottom is; clamped.",
      `- Layer: \`transform: translate3d(0, progress × ${shifts}, 0)\`, (1 − ratio) × its own height. Linear, no smoothing. \`will-change: transform\` once, in CSS.`,
      '- Transform only; no `background-attachment: fixed`, no per-frame framework state.',
      `- CSS route: \`.hero { view-timeline: --hero block }\`; layers \`animation: parallax linear both\`, then \`animation-timeline: --hero; animation-range: exit-crossing\` (shorthand first, it resets the timeline); \`@keyframes parallax\` to \`translate3d(0, var(--shift), 0)\`, \`--shift\` per layer.`,
      "- Feature-test `CSS.supports('animation-timeline', 'scroll()')` before first paint; if false, set `data-fallback` on `<html>` and use the JS route. Scope the CSS animation to `html:not([data-fallback])` inside `@supports (animation-timeline: scroll())`.",
      '- JS route: passive scroll listener, one requestAnimationFrame; n = clamp(−hero top, 0, hero height); write `translate3d(0, n × (1 − ratio)px, 0)` per layer. Also on `resize`.',
      '- Reduced motion: no animation; layers move with the content.',
    ].join('\n')
  },
  acceptance: (v) => {
    const { back, far } = ratios(v)
    const moved = (ratio: number) => +(100 * ratio).toFixed(1)
    const pushed = (ratio: number) => +(100 * (1 - ratio)).toFixed(1)
    return [
      `Scrolled 100px into the hero, the content has moved 100px up, the back layer ${moved(back)}px (its transform is \`translateY(${pushed(back)}px)\`)${far !== undefined ? ` and the far layer ${moved(far)}px (\`translateY(${pushed(far)}px)\`)` : ''}.`,
      'Scrolling back up reverses it exactly: the same scroll position always gives the same offsets, with no transition or lag.',
      'The content slides over the layers; nothing in a layer can be clicked or selected.',
      'Only transform changes while scrolling. The hero keeps its height, nothing below it moves, and the page is no taller than without the effect.',
      'A DevTools Performance recording of a scroll shows no layout and no long tasks per frame.',
      'With reduced motion on, the layers move with the content: no offset at any scroll position.',
      "In a browser where `CSS.supports('animation-timeline', 'scroll()')` is false (Firefox today), the JS route gives the same offsets. To check in Chromium, stub `CSS.supports` to return false before the page loads.",
    ]
  },
  code: (v) => ({ css: cssCode(v), js: jsCode(v), motion: motionCode(v) }),
  a11y: 'Parallax is decoration, and motion out of step with the scroll can make people with vestibular disorders unwell. Under reduced motion, remove the speed difference entirely so every layer moves with the content (a house rule for decorative scroll-linked effects). Keep the layers out of the reading order with aria-hidden and pointer-events: none, and never put text people need in a moving layer.',
  related: ['scroll-linked', 'layered-shadows', 'scroll-triggered'],
  sources: [{ label: 'MDN: CSS scroll-driven animations', url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll-driven_animations' }],
})
