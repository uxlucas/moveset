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
// The prompt's numbers: what shows below a resting panel (the 8px gap, then the next panel), and the gap.
const PEEK = 48
const GAP = 8
// The demo's: the same idea scaled to the small window, plus an inset at the top (scroll-padding-top and a spacer of
// the same height) so a resting panel doesn't sit flush against the toolbar. It equals the gap, so all that shows
// above a resting panel is the gap, never a sliver of the panel before it. Start only: centered panels already sit
// clear of the edges, and an inset would make the two neighbours show unequally.
const INSET = GAP
const DEMO = { card: { peek: 36 }, detail: { peek: 56 } }

// Panels sit one stride apart (panel + gap) and both alignments rest at multiples of it, so with five panels
// a stride is a quarter of the scroll and panel 3 rests at exactly half.
const STRIDE = 1 / (PANELS - 1)
// A visitor's flick: a short drag that is still moving when released, then the snap carrying it onto the next panel.
// NUDGE ends at 4x its average speed and SETTLE starts at 3x its own; flick() sizes the settle so the two speeds match
// at the hand-off.
const NUDGE: Bezier = [0.5, 0, 0.85, 0.4]
const SETTLE: Bezier = [0.2, 0.6, 0.3, 1]
// Proximity only: a slow drag that stops halfway between two panels and stays there.
const DRIFT: Bezier = [0.4, 0, 0.6, 1]

function buildTrack(strictness: V['strictness']): TrackPoint[] {
  const track: TrackPoint[] = [[0, 0]]
  let t = 0
  const at = () => track[track.length - 1][1] / STRIDE
  const hold = (ms: number) => {
    t += ms
    track.push([t, at() * STRIDE, 'linear'])
  }
  // Drag `drag` strides in `nudgeMs`, then settle the rest of the way to panel `to`.
  const flick = (to: number, drag: number, nudgeMs: number) => {
    const rest = to - at() - drag
    t += nudgeMs
    track.push([t, (at() + drag) * STRIDE, NUDGE])
    // Release speed 4 × drag / nudgeMs = settle start speed 3 × rest / settleMs.
    t += Math.round((3 * rest * nudgeMs) / (4 * drag))
    track.push([t, to * STRIDE, SETTLE])
  }
  hold(600)
  flick(1, 0.25, 240)
  hold(800)
  flick(2, 0.25, 240)
  hold(800)
  if (strictness === 'proximity') {
    t += 900
    track.push([t, 2.5 * STRIDE, DRIFT])
    hold(1100)
    flick(3, 0.2, 400)
  } else {
    flick(3, 0.25, 240)
  }
  hold(800)
  flick(4, 0.25, 240)
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
const START_PADDING_CLASS = '[&_[data-scroller]]:[scroll-padding-top:8px]'

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
  const { peek } = DEMO[size]
  const center = values.align === 'center'
  const inset = center ? 0 : INSET
  // Same rules as the prompt: the top inset first, then room so the first and last panels can rest like the others
  // (below the last for start, half on each end for center).
  const before = inset + (center ? peek / 2 : 0)
  const after = center ? peek / 2 : peek

  return (
    <div className={`h-full ${center ? '' : START_PADDING_CLASS} ${SNAP_CLASS[values.strictness][playing ? 'takeover' : 'still']}`}>
      <BrowserFrame scrollRef={scrollRef} size={size} label="Numbered panels that snap into place as the page scrolls">
        <div aria-hidden style={{ height: before }} />
        {Array.from({ length: PANELS }, (_, i) => (
          <div
            key={i}
            data-panel={i + 1}
            style={{ height: `calc(100% - ${inset + peek}px)`, marginTop: i > 0 ? GAP : 0 }}
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

// Room at each end so the first and last panels rest like the others. The snap area is the viewport below the header;
// a panel is PEEK shorter, so start needs all of it after the last panel, center half of it at each end.
const ROOM = {
  start: { top: 'H', bottom: PEEK, css: `var(--header) ${PEEK}px` },
  center: { top: `H + ${PEEK / 2}px`, bottom: PEEK / 2, css: `calc(var(--header) + ${PEEK / 2}px) ${PEEK / 2}px` },
}

function cssCode(v: V): string {
  const center = v.align === 'center'
  return [
    '/* The whole page snaps. For a nested scroller, move the html rules onto it,',
    '   give it a fixed height and overflow-y: auto, and use that height for 100svh. */',
    ':root {',
    "  --header: 0px; /* a fixed header's height, e.g. 56px */",
    '}',
    '',
    'html {',
    `  scroll-snap-type: y ${v.strictness};`,
    ...(v.strictness === 'proximity' ? ['  /* proximity: rests on a panel only when released near one. */'] : []),
    '  /* Panels rest under the header, not behind it. */',
    '  scroll-padding-top: var(--header);',
    ...(center
      ? [
          "  /* At each end, half the snap area's height minus a panel's (plus the",
          '     header at the top), so the first and last panels can center too. */',
        ]
      : [
          "  /* Top: the first panel starts below the header. Bottom: the snap area's",
          "     height minus a panel's, so the last panel can rest at the top too. */",
        ]),
    `  padding-block: ${ROOM[v.align].css};`,
    '}',
    '',
    'body {',
    '  margin: 0;',
    '}',
    '',
    '.panel {',
    `  scroll-snap-align: ${v.align};`,
    `  /* The snap area (viewport minus header) less ${PEEK}px: the ${GAP}px gap and the`,
    `     edge of ${center ? 'each neighbour' : 'the next panel'} show. Never taller than the snap area. */`,
    `  height: calc(100svh - var(--header) - ${PEEK}px);`,
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
    '  const target = Math.min(Math.max(i, 0), panels.length - 1)',
    '  // Step from the target, not the panel on screen, so a quick double click',
    '  // moves two panels.',
    '  show(target)',
    '  // block matches scroll-snap-align; scrollIntoView respects scroll-padding.',
    '  // Snapping stays under reduced motion; only the glide goes.',
    '  // Nested scroller: scrollIntoView would scroll the page too. Call',
    "  // scroller.scrollTo with the panel's offsetTop minus the scroller's",
    '  // padding-top instead (the scroller is position: relative).',
    `  panels[target].scrollIntoView({ block: '${v.align}', behavior: reduce.matches ? 'instant' : 'smooth' })`,
    '}',
    '',
    center
      ? '// The panel at rest: its middle nearest the middle of the area below the header.'
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
    '  // Chromium 129+: fires when a scroll comes to rest on a different snap target.',
    '  // The page fires it on document; a nested scroller fires it on itself, so',
    '  // listen on the scroller there.',
    '  // The target is null when a scroll rests between two panels (proximity).',
    "  document.addEventListener('scrollsnapchange', (e) => {",
    '    show(e.snapTargetBlock ? panels.indexOf(e.snapTargetBlock) : nearest())',
    '  })',
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
    'Scroll snap is plain CSS. The container says how strictly to snap, mandatory or proximity, and each panel says which part lines up: start, center or end. People still scroll freely with wheel, trackpad, touch or keys. When a scroll ends, the browser finishes it on the nearest panel. JavaScript is only needed for extras like next and previous buttons.',
  useWhen: [
    'Vertical galleries and full-screen feeds, where each image or post is the unit. Use the x axis for a sideways carousel.',
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
    const room = ROOM[v.align]
    return [
      'Make this page snap to whole panels.',
      '',
      `- Container (\`html\` for the whole page, or a nested scroller with a fixed height and \`overflow-y: auto\`): \`scroll-snap-type: y ${v.strictness}\`${v.strictness === 'proximity' ? ' (rests on a panel only when released near one)' : ''}.`,
      `- H = a fixed header's height (e.g. 56px), else 0. Container: \`scroll-padding-top: H\`, \`padding-top: ${room.top}\`, \`padding-bottom: ${room.bottom}px\` (${center ? 'half of ' : ''}snap area height, viewport − H, minus panel height). Page: \`body { margin: 0 }\`.`,
      `- Panels: \`scroll-snap-align: ${v.align}\`, \`height: calc(100svh - H - ${PEEK}px)\` (${PEEK}px short: ${center ? 'neighbours peek in' : 'next panel peeks in'}; nested: the scroller's height for \`100svh\`); \`.panel + .panel { margin-top: ${GAP}px }\`.`,
      '- `scroll-snap-stop: always` on panels that must not be skipped (steps); else `normal`.',
      '- Nested scroller: `overscroll-behavior-y: contain`, `tabindex="0"`, `role="region"`, an `aria-label`, so arrow keys and PageDown scroll it.',
      `- Prev/next buttons: page \`panel.scrollIntoView({ block: '${v.align}', behavior })\`; nested \`scroller.scrollTo({ top: panel.offsetTop - paddingTop, behavior })\`. \`behavior: 'smooth'\`, \`'instant'\` under reduced motion; set the current index on click; disabled at the ends.`,
      `- Current panel: \`scrollsnapchange\` on \`document\` (page) or the scroller (nested) where \`'onscrollsnapchange' in window\`, \`event.snapTargetBlock\` (\`null\` between panels: use the nearest); else on \`scrollend\` (or 100ms after the last \`scroll\`), the nearest. Nearest: ${center ? "middle closest to the snap area's middle" : "top closest to the snap area's top"}.`,
      '- No wheel/touch listeners or `preventDefault`.',
      '- Reduced motion: keep snapping (a position, not an animation); container `scroll-behavior: auto`.',
    ].join('\n')
  },
  acceptance: (v) => {
    const center = v.align === 'center'
    const rest = center ? 'with one panel centered in the snap area and both neighbours showing equally' : "with one panel's top at the top of the snap area"
    return [
      v.strictness === 'mandatory'
        ? `Releasing a scroll anywhere between two panels, including after a fast fling, comes to rest ${rest}.`
        : `Releasing a scroll close to a panel comes to rest ${rest}; stopping about halfway between two panels stays there.`,
      v.strictness === 'mandatory'
        ? 'With focus in the container, PageDown moves exactly one panel and PageUp one back.'
        : 'With focus in the container, PageDown moves one panel; ArrowDown moves a few lines and stays there instead of jumping to the next panel.',
      center
        ? 'With a 56px fixed header, every panel, the first one at scroll 0 included, rests centered in the area below the header.'
        : 'With a 56px fixed header, every panel, the first one at scroll 0 included, rests with its top directly under the header.',
      center ? 'The first and last panels rest centered like the others.' : 'The last panel can rest at the top like the others.',
      'Prev and next move one panel each, a quick double click moves two, and they are disabled on the first and last panel.',
      'After any scroll, including one that rests between two panels, prev and next step from the panel nearest the snap position.',
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
