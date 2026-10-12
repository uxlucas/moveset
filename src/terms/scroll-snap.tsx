import { useRef } from 'react'
import { BrowserFrame } from '@/components/demo/browser-frame'
import { useAutoScroll, type Bezier, type TrackPoint } from '@/components/demo/use-auto-scroll'
import { GlyphSvg } from '@/components/site/glyph'
import { defineTerm, type Control, type ControlValues, type DemoProps, type GlyphProps } from '@/lib/term-types'

const controls = [
  {
    id: 'strictness',
    type: 'select',
    label: 'Strictness',
    options: [
      { value: 'mandatory', label: 'Mandatory' },
      { value: 'proximity', label: 'Proximity' },
    ],
    default: 'mandatory',
  },
  {
    id: 'align',
    type: 'select',
    label: 'Align',
    options: [
      { value: 'start', label: 'Start' },
      { value: 'center', label: 'Center' },
    ],
    default: 'start',
  },
] as const satisfies readonly Control[]

type V = ControlValues<typeof controls>

const PANELS = 5
// What shows below a panel at rest (the 8px gap, then the next panel), in the prompt and in the demo.
const PEEK = 48
const GAP = 8
const DEMO_PEEK = { card: 40, detail: 64 }

// Panels sit one stride apart (panel + gap) and both alignments rest at multiples of it, so with five panels
// a stride is a quarter of the scroll and panel 3 rests at exactly half.
const STRIDE = 1 / (PANELS - 1)
// A visitor's flick: a short drag that is still moving when released, then the snap carrying it onto the next panel.
const NUDGE: Bezier = [0.45, 0, 0.85, 0.55]
const SETTLE: Bezier = [0.2, 0.6, 0.3, 1]
// Proximity only: a slow drag that stops halfway between two panels and stays there.
const DRIFT: Bezier = [0.4, 0, 0.6, 1]

function buildTrack(strictness: V['strictness']): TrackPoint[] {
  const track: TrackPoint[] = [[0, 0]]
  let t = 0
  const at = () => track[track.length - 1][1]
  const hold = (ms: number) => {
    t += ms
    track.push([t, at(), 'linear'])
  }
  const flick = (to: number, drag = 0.18) => {
    t += 480
    track.push([t, at() + drag * STRIDE, NUDGE])
    t += 460
    track.push([t, to * STRIDE, SETTLE])
  }
  hold(600)
  flick(1)
  hold(700)
  flick(2)
  hold(700)
  if (strictness === 'proximity') {
    t += 900
    track.push([t, 2.5 * STRIDE, DRIFT])
    hold(1100)
    flick(3, 0.28)
  } else {
    flick(3)
  }
  hold(700)
  flick(4)
  hold(300)
  return track
}

const TRACKS = { mandatory: buildTrack('mandatory'), proximity: buildTrack('proximity') }

// While the card loop or the entry autoplay drives the scroll, snapping is off: every scrollTop write would be
// snapped. It is on for the still frame and from the moment the visitor takes over, so their own scrolling snaps.
const SNAP_CLASS = {
  mandatory: {
    still: '[&_[data-scroller]]:[scroll-snap-type:y_mandatory]',
    takeover: '[&_[data-scroller][data-taken-over=true]]:[scroll-snap-type:y_mandatory]',
  },
  proximity: {
    still: '[&_[data-scroller]]:[scroll-snap-type:y_proximity]',
    takeover: '[&_[data-scroller][data-taken-over=true]]:[scroll-snap-type:y_proximity]',
  },
} as const

function ScrollSnapDemo({ values, playing, replayKey, size, timeScale, onCycleEnd }: DemoProps<V>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useAutoScroll(scrollRef, {
    playing,
    replayKey,
    timeScale,
    onCycleEnd,
    interactive: size === 'detail',
    track: TRACKS[values.strictness],
    stillAt: 2 * STRIDE,
  })
  const detail = size === 'detail'
  const peek = DEMO_PEEK[size]
  const center = values.align === 'center'
  // Room so the first and last panels can rest like the others: below the last for start, half on each end for center.
  const before = center ? peek / 2 : 0
  const after = center ? peek / 2 : peek

  return (
    <div className={`h-full ${SNAP_CLASS[values.strictness][playing ? 'takeover' : 'still']}`}>
      <BrowserFrame scrollRef={scrollRef} size={size} label="Numbered panels that snap into place as the page scrolls">
        {before > 0 && <div aria-hidden style={{ height: before }} />}
        {Array.from({ length: PANELS }, (_, i) => (
          <div
            key={i}
            data-panel={i + 1}
            style={{ height: `calc(100% - ${peek}px)`, marginBottom: i < PANELS - 1 ? GAP : 0 }}
            className={`flex items-center justify-center rounded-lg bg-demo ${center ? 'snap-center' : 'snap-start'} ${detail ? 'mx-4' : 'mx-3'}`}
          >
            <span className={`font-medium tabular-nums tracking-[-0.02em] text-demo-subject ${detail ? 'text-5xl' : 'text-3xl'}`}>{i + 1}</span>
          </div>
        ))}
        <div aria-hidden style={{ height: after }} />
      </BrowserFrame>
    </div>
  )
}

function ScrollSnapGlyph({ active }: GlyphProps) {
  return (
    <GlyphSvg kind="scroll-snap" active={active} clipped>
      <g className="m">
        <rect x="2.6" y="2.6" width="6.8" height="6.8" rx="1.2" fill="currentColor" opacity=".9" />
        <rect x="2.6" y="10.6" width="6.8" height="6.8" rx="1.2" fill="currentColor" opacity=".45" />
      </g>
    </GlyphSvg>
  )
}

const ROOM = {
  start: { prompt: `\`padding-bottom: ${PEEK}px\`, so the last panel can reach the top`, css: `padding-bottom: ${PEEK}px;` },
  center: { prompt: `\`padding-block: ${PEEK / 2}px\`, so the first and last panels can center`, css: `padding-block: ${PEEK / 2}px;` },
}

function cssCode(v: V): string {
  const center = v.align === 'center'
  return [
    '/* The whole page snaps. For a nested scroller, move the html rules onto it,',
    '   give it a fixed height and overflow-y: auto, and use 100% for 100svh. */',
    'html {',
    `  scroll-snap-type: y ${v.strictness};`,
    ...(v.strictness === 'proximity' ? ['  /* proximity: rests on a panel only when released near one. */'] : []),
    center ? '  /* Room before the first panel and after the last, so they center too. */' : '  /* Room after the last panel, so it can rest at the top too. */',
    `  ${ROOM[v.align].css}`,
    '  /* A fixed header: its height, so panels rest under it, not behind it. */',
    '  scroll-padding-top: var(--header, 0px);',
    '}',
    '',
    '.panel {',
    `  scroll-snap-align: ${v.align};`,
    `  /* Fits under the header, with ${PEEK}px left for the gap and ${center ? 'the neighbours' : 'the next panel'}.`,
    '     A panel taller than the viewport cannot be read whole. */',
    `  height: calc(100svh - var(--header, 0px) - ${PEEK}px);`,
    '  /* normal lets a fast fling pass panels. always: none can be skipped. */',
    '  scroll-snap-stop: normal;',
    '}',
    '',
    '.panel + .panel {',
    `  margin-top: ${GAP}px;`,
    '}',
    '',
    '/* Nested scroller only: the page behind stays put at either end.',
    '   .snap { overscroll-behavior-y: contain; } */',
    '',
    '/* Snapping is where scrolling comes to rest, not an animation, so it stays',
    '   under reduced motion. Only the glide between panels goes. */',
    '@media (prefers-reduced-motion: reduce) {',
    '  html { scroll-behavior: auto; }',
    '}',
  ].join('\n')
}

function jsCode(v: V): string {
  const center = v.align === 'center'
  return [
    '// Prev/next buttons and the current panel. Scrolling and snapping are all CSS:',
    '// no wheel or touch listeners, nothing that fights the browser.',
    '// Markup: <button data-prev aria-label="Previous panel">',
    '//         <button data-next aria-label="Next panel">',
    "const panels = [...document.querySelectorAll('.panel')]",
    "const prev = document.querySelector('[data-prev]')",
    "const next = document.querySelector('[data-next]')",
    "const reduce = matchMedia('(prefers-reduced-motion: reduce)')",
    'let current = 0',
    '',
    'function show(i) {',
    '  current = i',
    '  prev.disabled = i === 0',
    '  next.disabled = i === panels.length - 1',
    '}',
    '',
    'function go(i) {',
    '  const panel = panels[Math.min(Math.max(i, 0), panels.length - 1)]',
    '  // block matches scroll-snap-align; scrollIntoView respects scroll-padding.',
    '  // Snapping stays under reduced motion; only the glide goes.',
    `  panel.scrollIntoView({ block: '${v.align}', behavior: reduce.matches ? 'auto' : 'smooth' })`,
    '}',
    '',
    center
      ? "// The panel at rest: its middle nearest the middle of the area below the header."
      : '// The panel at rest: its top nearest the top of the area below the header.',
    'function nearest() {',
    '  const header = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0',
    ...(center
      ? [
          '  const mid = (header + innerHeight) / 2',
          '  const off = (p) => {',
          '    const box = p.getBoundingClientRect()',
          '    return Math.abs(box.top + box.height / 2 - mid)',
          '  }',
        ]
      : ['  const off = (p) => Math.abs(p.getBoundingClientRect().top - header)']),
    '  return panels.reduce((best, p, i) => (off(p) < off(panels[best]) ? i : best), 0)',
    '}',
    '',
    "prev.addEventListener('click', () => go(current - 1))",
    "next.addEventListener('click', () => go(current + 1))",
    '',
    "if ('onscrollsnapchange' in window) {",
    '  // Chromium 129+: fires once a scroll is going to rest on another panel.',
    '  // The page fires it on document; a nested scroller fires it on itself.',
    "  document.addEventListener('scrollsnapchange', (e) => show(panels.indexOf(e.snapTargetBlock)))",
    "} else if ('onscrollend' in window) {",
    "  addEventListener('scrollend', () => show(nearest()))",
    '} else {',
    '  let idle = 0',
    '  const settle = () => {',
    '    clearTimeout(idle)',
    '    idle = setTimeout(() => show(nearest()), 100)',
    '  }',
    "  addEventListener('scroll', settle, { passive: true })",
    '}',
    '// A reload can restore the scroll position on any panel.',
    'show(nearest())',
  ].join('\n')
}

export default defineTerm({
  slug: 'scroll-snap',
  name: 'Scroll Snap',
  category: 'scroll',
  order: 5,
  status: 'review',
  definition: 'Scrolling comes to rest exactly on an item instead of stopping anywhere in between.',
  aliases: ['snap scrolling', 'paged scroll', 'full-page scroll', 'section snapping', 'stops on each section', 'scroll-snap-type'],
  description:
    'Scroll snap is plain CSS. The container says how strictly to snap, mandatory or proximity, and each panel says which of its edges lines up. People still scroll freely with wheel, trackpad, touch or keys; when the scroll comes to rest, the browser carries it the rest of the way onto a panel with its own momentum. JavaScript is only needed for extras like next and previous buttons.',
  useWhen: [
    'Galleries and carousels, where each image or card is the unit.',
    'Onboarding steps and full-screen slides, one idea per screen.',
    'Story sections people page through, where resting between two is never useful.',
  ],
  avoidWhen: [
    'Long-form reading. People need to stop anywhere, and mandatory snapping pulls away the line they were on.',
    'Panels taller than the viewport. Part of each one becomes hard to reach and read.',
    'Mixed-height content. Use proximity, or no snapping at all.',
  ],
  demo: {
    component: ScrollSnapDemo,
    label:
      'Five numbered panels inside a small browser window. Each scroll starts as a small nudge, then the page settles exactly on the next panel, never between two. With proximity, one slow scroll stops halfway and stays. The controls switch between mandatory and proximity, and between aligning panels at the top or in the middle.',
    controls,
    glyph: ScrollSnapGlyph,
  },
  prompt: (v) => {
    const center = v.align === 'center'
    return [
      'Make this page snap to whole panels as it scrolls.',
      '',
      `- Container (\`html\` for the whole page, or a nested scroller with a fixed height and \`overflow-y: auto\`): \`scroll-snap-type: y ${v.strictness}\`${v.strictness === 'proximity' ? ' (rests on a panel only when released near one)' : ''}; ${ROOM[v.align].prompt}.`,
      `- Panels: \`scroll-snap-align: ${v.align}\`, \`height: calc(100svh - ${PEEK}px)\`, ${GAP}px apart (${center ? 'both neighbours show' : 'the next one shows'}); nested: \`100%\` for \`100svh\`. Never taller than the container.`,
      '- Fixed header: `scroll-padding-top` = its height (e.g. 56px); subtract it from the panel height.',
      '- Panels that must not be skipped (steps, onboarding): `scroll-snap-stop: always`; otherwise `normal`.',
      '- Nested scroller: `overscroll-behavior-y: contain`, `tabindex="0"`, `role="region"`, an `aria-label`, so arrow keys and PageDown scroll it.',
      `- Prev/next buttons: \`panel.scrollIntoView({ block: '${v.align}', behavior })\`, \`'smooth'\`, or \`'auto'\` under reduced motion; disabled at the ends.`,
      `- Current panel: \`scrollsnapchange\` (\`event.snapTargetBlock\`) where \`'onscrollsnapchange' in window\`; else on \`scrollend\` (or 100ms after the last \`scroll\`), the panel whose ${center ? 'middle is nearest the middle of' : 'top is nearest the top of'} the area below \`scroll-padding-top\`.`,
      '- No wheel or touch listeners, no `preventDefault`: the browser snaps.',
      '- Reduced motion: keep snapping (a resting position, not an animation); `scroll-behavior: auto` on the container.',
    ].join('\n')
  },
  acceptance: (v) => {
    const center = v.align === 'center'
    const rest = center ? 'with one panel centered and both neighbours showing equally' : "with one panel's top at the top of the container"
    return [
      v.strictness === 'mandatory'
        ? `Releasing a scroll anywhere between two panels, including after a fast fling, comes to rest ${rest}.`
        : `Releasing a scroll close to a panel comes to rest ${rest}; stopping about halfway between two panels stays there.`,
      v.strictness === 'mandatory'
        ? 'With focus in the container, PageDown moves exactly one panel and PageUp one back.'
        : 'With focus in the container, PageDown and PageUp scroll as usual and never get stuck on a panel.',
      center
        ? 'With a 56px fixed header, a resting panel is centered in the area below the header.'
        : "With a 56px fixed header, a resting panel's top sits directly under the header, not behind it.",
      center ? 'The first and last panels can rest centered like the others.' : 'The last panel can rest at the top like the others.',
      'Prev and next move one panel each and are disabled on the first and last; after any scroll they reflect the panel at rest.',
      'In a nested scroller, scrolling past the last panel does not scroll the page behind it.',
      'Resizing the window keeps the same panel in place.',
      'With reduced motion on, scrolling still snaps; prev and next jump without a glide.',
    ]
  },
  code: (v) => ({ css: cssCode(v), js: jsCode(v) }),
  a11y: 'Snapping must never take scrolling away: no wheel or touch hijacking, and keyboard scrolling keeps working. A nested scroller needs tabindex="0", a region role and a label so arrow keys and PageDown reach it. Label prev and next buttons and disable them at the ends. Under reduced motion snapping stays, since it decides where scrolling rests rather than animating, but buttons jump instead of gliding.',
  related: ['pinned-horizontal-scroll', 'sticky', 'scroll-triggered'],
  confusedWith: [
    {
      slug: 'pinned-horizontal-scroll',
      difference:
        'Scroll snap settles on whole panels; pinned horizontal scroll turns vertical scrolling into sideways movement while a section is pinned.',
    },
  ],
  sources: [{ label: 'MDN: CSS scroll snap', url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll_snap' }],
})
