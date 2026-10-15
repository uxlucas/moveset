import { Bell, CalendarDays, Mountain, Share2, type LucideIcon } from 'lucide-react'
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

// The far layer, when there is one, moves at half the back layer's speed.
const ratios = (v: V) => {
  const back = Number(v.depth)
  return { back, far: v.layers === '3' ? back / 2 : undefined }
}
// Each layer scrolls with the hero; pushing it down (1 - ratio) of the scroll leaves it moving ratio × the scroll.
const shift = (ratio: number) => +((1 - ratio) * 100).toFixed(1)

// Demo geometry in px: the blocks' top and height, where the front panel starts, the far slab, and the hero's
// height in windows. The travel is short enough that at the bottom of the scroll, at 0.2× (where the panel covers
// the blocks soonest), about a third of a block still shows, so the turn of the return trip is on screen. The card
// always runs at the default 0.4×, so it is tuned for that: a lower panel buys about 90px of travel, enough that the
// scroll moves on most frames instead of creeping a pixel every two or three.
const GEOMETRY = {
  card: { top: 24, block: 64, panel: 110, farTop: 10, farHeight: 104, hero: '158%', margin: 4 },
  detail: { top: 56, block: 120, panel: 200, farTop: 30, farHeight: 190, hero: '140%', margin: 6 },
}

// Still frame: the panel covers about a third of the blocks, unless that would push the blocks' top out of view
// (at 0.6× the panel catches up slowly); then the blocks rest just inside the top edge.
function stillPx(size: DemoProps['size'], ratio: number) {
  const g = GEOMETRY[size]
  return Math.round(Math.min((g.panel - g.top - 0.65 * g.block) / (1 - ratio), (g.top - g.margin) / ratio))
}

// Line widths (%) per paragraph of the front panel.
const PARAGRAPHS = [
  [92, 86, 96, 70],
  [88, 96, 82, 94, 58],
  [94, 90, 86, 64],
  [90, 84, 96, 76],
]

// The entry page's hero and card. The hero text sits inside the image block: above it (the open 56px) it would be
// clipped off the top at the still frame, below it it would be behind the panel. Both lines are ink: muted on demo-2
// is 4.4:1 in light.
const HEADLINE = 'Built for the long run'
const SUBLINE = 'A planner that keeps up with you'
const CARD_TITLE = "What's new this week"
const ROWS: { Icon: LucideIcon; label: string }[] = [
  { Icon: CalendarDays, label: 'Plan the week' },
  { Icon: Bell, label: 'Quiet notifications' },
  { Icon: Share2, label: 'Share a board' },
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
  const { back, far } = ratios(values)
  useAutoScroll(scrollRef, {
    playing,
    replayKey,
    timeScale,
    onCycleEnd,
    interactive: size === 'detail',
    durationMs: size === 'card' ? 4000 : 7600,
    stillPx: stillPx(size, back),
    returnTrip: true,
  })
  useParallax(scrollRef, values)
  const detail = size === 'detail'
  const g = GEOMETRY[size]
  const layer = 'pointer-events-none absolute inset-0 will-change-transform'

  return (
    <BrowserFrame scrollRef={scrollRef} size={size} label="Landing page whose hero image scrolls slower than the card in front">
      {/* The page is the hero, a fixed share of the window so the travel stays short. Its top is open, so the layers
          show until the panel slides over them; the panel's text runs on past the hero's bottom edge, clipped. */}
      <div data-hero="" style={{ height: g.hero }} className="relative flex flex-col overflow-clip">
        {far !== undefined && (
          <div data-layer="far" data-ratio={far} aria-hidden className={layer}>
            <div style={{ marginTop: g.farTop, height: g.farHeight }} className={`rounded-lg bg-demo ${detail ? 'mx-5' : 'mx-3'}`} />
          </div>
        )}
        <div data-layer="back" data-ratio={back} aria-hidden className={layer}>
          {detail ? (
            // One hero block the size of the card's two. Its text is top-aligned: the still frame covers the lower
            // third with the panel, so everything that reads sits in the top 72px.
            <div style={{ paddingTop: g.top }} className="px-10">
              <div style={{ height: g.block }} className="flex flex-col items-center rounded-md bg-demo-2 px-4 pt-2 text-center">
                <Mountain size={20} className="text-ink-muted" />
                <p className="mt-1.5 text-[15px] font-semibold leading-5 text-ink">{HEADLINE}</p>
                <p className="text-[12px] leading-4 text-ink">{SUBLINE}</p>
              </div>
            </div>
          ) : (
            <div style={{ paddingTop: g.top }} className="grid grid-cols-2 gap-2.5 px-5">
              <div style={{ height: g.block }} className="rounded-md bg-demo-subject" />
              <div style={{ height: g.block }} className="rounded-md bg-demo-subject" />
            </div>
          )}
        </div>
        <div
          data-layer="front"
          style={{ marginTop: g.panel }}
          className={`relative flex-1 rounded-t-xl bg-surface shadow-[0_-1px_0_var(--line),0_-8px_20px_oklch(0_0_0/0.06)] ${detail ? 'px-6 pt-5' : 'px-3.5 pt-3'}`}
        >
          {detail ? (
            // 130px to the first bar (title 20 + 12, rows 3 × 28, 14), so at the bottom of the scroll no bar
            // straddles the hero's edge at either window height (264.8px and 175.2px below the panel's top).
            <div className="mb-3.5">
              <p className="mb-3 text-[13px] font-medium leading-5 text-ink">{CARD_TITLE}</p>
              {ROWS.map(({ Icon, label }) => (
                <div key={label} className="flex h-7 items-center gap-2.5">
                  <Icon size={14} aria-hidden className="shrink-0 text-ink-muted" />
                  <span className="text-[12px] leading-4 text-ink">{label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-2.5 h-2 w-1/2 rounded-full bg-demo-2" />
          )}
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

const HOUSE_RULE = 'House rule: parallax drops the speed difference under reduced motion.'

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
    '  /* The open top, where the layers show above the content. */',
    '  padding-top: 40vh;',
    '  view-timeline: --hero block;',
    '}',
    '',
    '.layer {',
    '  position: absolute;',
    '  inset: 0; /* the hero\'s height, so 100% in the keyframes is the hero too */',
    '  pointer-events: none;',
    '  will-change: transform;',
    '}',
    '',
    '/* Speed ratio: the layer moves ratio x the scroll. Set only here; the JS tab reads it. */',
    ...(far !== undefined ? [`.layer-far { --ratio: ${far}; }`] : []),
    `.layer-back { --ratio: ${back}; }`,
    '',
    '/* In front, at full speed. Opaque, so it slides over the layers. */',
    '.hero-content {',
    '  position: relative;',
    '  background: var(--surface, #fff);',
    '}',
    '',
    `/* ${HOUSE_RULE} */`,
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
    '/* The layer scrolls with the hero; pushing it down (1 - ratio) of the',
    '   scroll leaves it moving ratio x the scroll on screen. */',
    '@keyframes parallax {',
    '  from { transform: translate3d(0, 0, 0); }',
    '  to { transform: translate3d(0, calc((1 - var(--ratio)) * 100%), 0); }',
    '}',
  ].join('\n')
}

function jsCode(): string {
  return [
    '// Load at the end of `<body>`: the hero exists, and the test runs before it paints.',
    '// Same test as the CSS @supports, so the two routes never both run.',
    "const supported = CSS.supports('animation-timeline', 'scroll()')",
    "const hero = document.querySelector('.hero')",
    '',
    'if (hero && !supported) {',
    "  document.documentElement.dataset.fallback = ''",
    "  const layers = [...hero.querySelectorAll('.layer')]",
    '  // The ratio lives in the CSS (--ratio), so both routes share one value.',
    '  const ratios = layers.map((l) => parseFloat(getComputedStyle(l).getPropertyValue(\'--ratio\')))',
    `  // ${HOUSE_RULE}`,
    "  const reduce = matchMedia('(prefers-reduced-motion: reduce)')",
    '  let frame = 0',
    '',
    '  const render = () => {',
    '    frame = 0',
    '    // Read every frame, never cached: resizes and late content change it.',
    '    const box = hero.getBoundingClientRect()',
    '    // Pixels the hero has scrolled past the viewport top, 0 to its height.',
    '    const n = Math.min(Math.max(-box.top, 0), box.height)',
    '    layers.forEach((layer, i) => {',
    '      layer.style.transform = `translate3d(0, ${n * (1 - ratios[i])}px, 0)`',
    '    })',
    '  }',
    '  const schedule = () => {',
    '    if (!frame) frame = requestAnimationFrame(render)',
    '  }',
    '',
    '  // Follows the setting live: listeners and transforms only while motion is allowed.',
    '  const arm = () => {',
    '    if (reduce.matches) {',
    "      removeEventListener('scroll', schedule)",
    "      removeEventListener('resize', schedule)",
    '      cancelAnimationFrame(frame)',
    '      frame = 0',
    "      for (const layer of layers) layer.style.transform = ''",
    '    } else {',
    "      addEventListener('scroll', schedule, { passive: true })",
    "      addEventListener('resize', schedule)",
    '      render()',
    '    }',
    '  }',
    "  reduce.addEventListener('change', arm)",
    '  arm()',
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
    '// Speed ratios: a layer moves ratio x the scroll; the content moves 1x.',
    ...(three ? [`const FAR = ${far}`] : []),
    `const BACK = ${back}`,
    "// Pushing a layer down (1 - ratio) of the hero's height leaves it moving ratio x the scroll.",
    'const shift = (ratio: number) => `${(1 - ratio) * 100}%`',
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
    ...(three ? ["  const farY = useTransform(scrollYProgress, [0, 1], ['0%', shift(FAR)])"] : []),
    "  const backY = useTransform(scrollYProgress, [0, 1], ['0%', shift(BACK)])",
    `  // ${HOUSE_RULE}`,
    '  const reduce = useReducedMotion()',
    '  return (',
    '    // pt-[40vh]: the open top, where the layers show above the content.',
    '    <section ref={ref} className="relative overflow-clip pt-[40vh]">',
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
    '      {/* In front, at full speed: opaque, so it slides over the layers. */}',
    '      <div className="relative bg-[var(--surface,#fff)]">{children}</div>',
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
  status: 'published',
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
  ],
  avoidWhen: [
    'Content people read or act on, like text, forms and controls. Anything that drifts out of step with the scroll is harder to follow and to hit.',
    'Large layers with big speed differences, or effects across the whole page. Motion out of step with the scroll can make people with vestibular disorders unwell.',
    'More than one parallax section per page. It stops being a moment and becomes a texture.',
    'Pages where reduced motion cannot simply flatten the layers. If the layout only works with the offset, it is not decoration.',
  ],
  demo: {
    component: ParallaxDemo,
    label:
      'On the entry page, a product landing page scrolls down and back up inside a small browser window. The hero at the top, an image block with a headline and a line under it, drifts up at a fraction of the scroll speed while a card in front, with a title, three rows of icons and text and bars for the rest, scrolls at full speed and slides over it. The controls change how fast the hero moves and add a second, slower image block behind it. The index card is a wireframe of the same page: two solid blocks and a panel of bars.',
    controls,
    glyph: ParallaxGlyph,
  },
  prompt: (v) => {
    const { back, far } = ratios(v)
    const three = far !== undefined
    // One word for the layer count, used the same way in every line.
    const layers = three ? 'layers' : 'layer'
    return [
      "Add parallax to this page's top hero.",
      '',
      '- Hero: `position: relative; overflow: clip; padding-top: 40vh`.',
      `- Content: one opaque in-flow panel, \`position: relative\`, full speed, sliding over the ${layers}.`,
      `- ${three ? 'Two layers, far first' : 'One layer'}: \`position: absolute; inset: 0\` (hero height), \`pointer-events: none\`, \`aria-hidden\`, before the content.`,
      three
        ? `- Ratios, set once as \`--ratio\` per layer: far \`${far}\`, back \`${back}\` (${back}px per 1px scrolled).`
        : `- Ratio, set once as \`--ratio\` on the layer: \`${back}\` (${back}px per 1px scrolled).`,
      "- Progress: 0 when the hero's top is at the viewport top, 1 when its bottom is; clamped.",
      `- ${three ? 'Each layer' : 'Layer'}: \`translate3d(0, progress × (1 − ratio) × 100%, 0)\` (${three ? `${shift(far)}% far, ${shift(back)}% back` : `${shift(back)}%`}), so n × (1 − ratio) px after n px. Linear; transform only; no \`background-attachment: fixed\`; static \`will-change: transform\`.`,
      `- Visible while the ${layers} ${three ? 'peek' : 'peeks'} above the panel (first 40vh of scroll); more padding, longer window.`,
      `- CSS route: \`.hero { view-timeline: --hero block }\`; layers: \`animation: parallax linear both\`, then \`animation-timeline: --hero; animation-range: exit-crossing\` (shorthand first); \`@keyframes parallax\` to \`translate3d(0, calc((1 - var(--ratio)) * 100%), 0)\`.`,
      "- Feature-test `CSS.supports('animation-timeline', 'scroll()')` before first paint; false: `data-fallback` on `<html>`, JS route. CSS animation only under `html:not([data-fallback])` in `@supports (animation-timeline: scroll())`.",
      '- JS route (after the DOM exists: end of `<body>`, or after mount): passive `scroll`/`resize`, one requestAnimationFrame, hero rect per frame, ratio from `--ratio`.',
      '- Reduced motion: no animation or transform; JS clears inline transforms and removes listeners while it matches, re-arming on `change`.',
    ].join('\n')
  },
  acceptance: (v) => {
    const { back, far } = ratios(v)
    const moved = (ratio: number) => +(100 * ratio).toFixed(1)
    const matrix = (ratio: number) => `\`matrix(1, 0, 0, 1, 0, ${+(100 * (1 - ratio)).toFixed(1)})\``
    return [
      'At the top of the hero, the layers are visible above the content panel.',
      `Scrolled 100px into the hero, the content has moved 100px up and the back layer ${moved(back)}px; its computed transform is ${matrix(back)}${far !== undefined ? `. The far layer has moved ${moved(far)}px (${matrix(far)})` : ''}.`,
      'Scrolling back up reverses it exactly: the same scroll position always gives the same offsets, with no transition or lag.',
      'The content panel slides over the layers; nothing in a layer can be clicked.',
      "Only the layers' transforms change: the hero's height and the page's `scrollHeight` are the same at every scroll position, and the same as with the layers removed.",
      'With reduced motion on, the layers move with the content at every scroll position; switching the setting while the page is open flattens or restores them without a reload.',
      "In a browser where `CSS.supports('animation-timeline', 'scroll()')` is false (Firefox today), the JS route gives the same offsets. To check in Chromium, stub `CSS.supports` to return false before the page loads.",
    ]
  },
  code: (v) => ({ css: cssCode(v), js: jsCode(), motion: motionCode(v) }),
  a11y: 'Parallax is decoration, and motion out of step with the scroll can make people with vestibular disorders unwell. Under reduced motion, remove the speed difference entirely so every layer moves with the content (a house rule). Keep the layers out of the reading order with aria-hidden and pointer-events: none, and never put text people need in a moving layer.',
  related: ['scroll-linked', 'layered-shadows', 'scroll-triggered'],
  sources: [
    { label: 'MDN: CSS scroll-driven animations', url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll-driven_animations' },
    { label: 'Motion: useScroll', url: 'https://motion.dev/docs/react-use-scroll' },
    { label: 'WCAG 2.3.3: Animation from Interactions', url: 'https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html' },
  ],
})
