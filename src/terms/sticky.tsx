import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { BrowserFrame } from '@/components/demo/browser-frame'
import { useAutoScroll } from '@/components/demo/use-auto-scroll'
import { GlyphSvg } from '@/components/site/glyph'
import { defineTerm, type Control, type ControlValues, type DemoProps, type GlyphProps } from '@/lib/term-types'

const controls = [
  {
    id: 'offset',
    type: 'select',
    label: 'Top offset',
    options: [
      { value: '0', label: '0px' },
      { value: '24', label: '24px' },
      { value: '40', label: '40px' },
    ],
    default: '0',
  },
  { id: 'shadow', type: 'toggle', label: 'Shadow when stuck', default: true },
] as const satisfies readonly Control[]

type V = ControlValues<typeof controls>

// Long enough that two handoffs play at detail size and the scroll ends with a header pinned partway through its section.
const SECTIONS = [
  { letter: 'A', rows: 3 },
  { letter: 'B', rows: 5 },
  { letter: 'C', rows: 5 },
  { letter: 'D', rows: 6 },
  { letter: 'E', rows: 4 },
]
const LINE_WIDTHS = ['w-24', 'w-20', 'w-28', 'w-16']
// Milder than the house ease-in-out, so the scroll is not at full speed through each handoff.
const SCROLL_EASE = [0.45, 0, 0.55, 1] as const

// Watches the headers themselves. A header is stuck while the line `offset + 1`px below the top clips its top edge.
// Pushed fully out by the next header, it is not stuck. isIntersecting, not ratio > 0: a header exactly touching the
// line reports ratio 0 and would get no further callback as it slides back in. The large bottom margin stretches the root far below
// the list, so the stuck line is the only edge that can clip a header: a header half under the bottom edge that jumps
// straight to the pinned spot would otherwise stay between thresholds and never get a callback.
function useStuckHeaders(rootRef: RefObject<HTMLElement | null>, offset: number) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const clipped = entry.isIntersecting && entry.intersectionRatio < 1
          const atTop = entry.boundingClientRect.top <= (entry.rootBounds?.top ?? 0)
          ;(entry.target as HTMLElement).dataset.stuck = String(clipped && atTop)
        }
      },
      { root, rootMargin: `-${offset + 1}px 0px 100000px 0px`, threshold: [0, 1] },
    )
    root.querySelectorAll('[data-sticky-header]').forEach((h) => io.observe(h))
    return () => io.disconnect()
  }, [rootRef, offset])
}

function StickyDemo({ values, playing, replayKey, size, timeScale, onCycleEnd }: DemoProps<V>) {
  const offset = Number(values.offset)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [stillPx, setStillPx] = useState<number>()

  // Still frame: B pinned with about a row and a half passing under it, so the shadow shows.
  useLayoutEffect(() => {
    const b = scrollRef.current?.querySelector<HTMLElement>('[data-section="B"]')
    const row = b?.querySelector<HTMLElement>('[data-row]')
    if (b && row) setStillPx(Math.round(b.offsetTop - offset + row.offsetHeight * 1.5))
  }, [offset])

  useAutoScroll(scrollRef, { playing, replayKey, timeScale, onCycleEnd, interactive: size === 'detail', durationMs: 4400, stillPx, ease: SCROLL_EASE })
  useStuckHeaders(scrollRef, offset)

  return (
    <BrowserFrame scrollRef={scrollRef} size={size} label="Contact list with sticky letter headers">
      {/* 1px above the first header, so at rest it sits below the stuck line instead of on it. */}
      <div className="mt-px dark:[--stuck-shadow:0_1px_0_var(--line-strong),0_4px_12px_rgb(0_0_0/0.4)]">
        {offset > 0 && (
          <div className="sticky top-0 z-20 flex items-center border-b border-line bg-surface px-3" style={{ height: offset }}>
            <span className="h-2 w-14 rounded-full bg-demo-2" />
          </div>
        )}
        {SECTIONS.map((section) => (
          <div key={section.letter} data-section={section.letter}>
            <div
              data-sticky-header=""
              data-stuck="false"
              style={{ top: offset }}
              className={`sticky z-10 bg-surface px-3 py-1 text-[10px] font-medium text-ink-muted transition-shadow duration-150 ease-[ease] motion-reduce:transition-none ${values.shadow ? 'data-[stuck=true]:[box-shadow:var(--stuck-shadow,0_1px_0_var(--line),0_4px_12px_oklch(0_0_0/0.06))]' : ''}`}
            >
              {section.letter}
            </div>
            {Array.from({ length: section.rows }, (_, i) => (
              <div key={i} data-row="" className="flex items-center gap-2.5 border-b border-line px-3 py-2">
                <span className="size-5 shrink-0 rounded-full bg-demo" />
                <span className={`h-2 rounded-full bg-demo-2 ${LINE_WIDTHS[(i + section.rows) % LINE_WIDTHS.length]}`} />
                <span className="ml-auto h-2 w-10 rounded-full bg-demo" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </BrowserFrame>
  )
}

function StickyGlyph({ active }: GlyphProps) {
  return (
    <GlyphSvg kind="sticky" active={active} clipped>
      <g className="m">
        {[5, 7.5, 10, 12.5].map((y) => (
          <rect key={y} x="3" y={y} width="6" height="1" rx=".5" fill="currentColor" opacity=".5" />
        ))}
      </g>
      <rect x="1.2" y="1.2" width="9.6" height="2.6" fill="currentColor" />
    </GlyphSvg>
  )
}

export default defineTerm({
  slug: 'sticky',
  name: 'Sticky',
  category: 'scroll',
  order: 4,
  status: 'review',
  definition: 'An element scrolls with the page until it hits an edge, then stays pinned while the rest of its section scrolls underneath.',
  aliases: [
    'sticky header',
    'sticky section header',
    'pinned header',
    'header that stays at the top',
    'position sticky',
    'sticky table header',
    'stuck header',
    'header stays while scrolling',
    'content scrolls under the header',
    'sticky nav',
    'section headers push each other',
  ],
  description:
    'Sticky is CSS position: sticky. The element sits in the normal flow until scrolling brings it to the offset you set, then it holds there until the end of its parent pushes it out. That last part is why section headers hand off to each other: each header only sticks inside its own section.',
  useWhen: [
    'Section headers in long lists, like contacts, settings or a changelog.',
    'Table headers that need to stay visible while rows scroll.',
    'A toolbar that should stay within reach while its content scrolls.',
  ],
  avoidWhen: [
    'Small screens where a pinned element takes a big share of the viewport.',
    'Stacking several sticky bars, which leaves little room to read.',
    'When the element must stay visible past the end of its parent. Sticky cannot leave its container, so use a fixed element instead.',
  ],
  demo: { component: StickyDemo, label: 'A contact list scrolls inside a small browser window. Each letter header pins to the top while its section passes underneath, then the next header pushes it away.', controls, glyph: StickyGlyph },
  prompt: (v) => {
    const offset = Number(v.offset)
    const padding = offset > 0 ? `calc(32px + ${offset}px)` : '32px'
    return [
      'Make the section headers in this list sticky.',
      '',
      '- Wrap each header and its rows in their own element, with the header at the top of that element. Sticky only holds inside its parent, which is what lets the next header push the current one away instead of stacking on it.',
      `- Give each section header \`position: sticky; top: ${offset}px;\`${offset > 0 ? ` (${offset}px is the height of a bar pinned with \`position: sticky; top: 0\` inside the same scroll container. If your bar sits outside the scroll container, use \`top: 0\`.)` : ''} inside the list's own scroll container.`,
      '- Give headers an opaque background that matches the list, and a z-index above the rows, so rows never show through.',
      '- Check every ancestor between the header and the scroll container: `overflow: hidden`, `overflow-x: hidden`, `overflow: auto` or `overflow: scroll` on any of them silently breaks sticky. Use `overflow: clip` when you need clipping.',
      `- Set \`scroll-padding-top\` on the scroll container to the header height${offset > 0 ? ` plus ${offset}px` : ''} (replace 32px with yours): \`scroll-padding-top: ${padding}\`. Shift+Tab is the case that needs it: moving focus up scrolls the row in at the top edge, where a stuck header would cover it.`,
      ...(v.shadow
        ? [
            `- While a header is stuck, show a soft shadow under it: \`box-shadow: var(--stuck-shadow, 0 1px 0 var(--border, rgb(0 0 0 / 0.08)), 0 4px 12px rgb(0 0 0 / 0.06))\`, transitioned over 150ms with \`ease\`. Tune \`--stuck-shadow\` per theme: on a dark surface the 6% black disappears, so use a stronger line and a darker shadow there, for example \`0 1px 0 rgb(255 255 255 / 0.12), 0 4px 12px rgb(0 0 0 / 0.4)\`.`,
            `- Detect "stuck" with one IntersectionObserver on the headers themselves: root is the list's scroll container, rootMargin is '-${offset + 1}px 0px 100000px 0px', threshold is [0, 1]. A header is stuck when \`entry.isIntersecting && entry.intersectionRatio < 1 && entry.boundingClientRect.top <= entry.rootBounds.top\`: partly clipped by the line 1px below its \`top\`. A header pushed fully out by the next one is not stuck. The large bottom margin keeps the bottom edge from ever clipping a header, so a header that jumps from below straight into the pinned spot (a scrollbar drag, an anchor link, scrollTop set in code) still crosses a threshold. Use \`isIntersecting\`, not \`intersectionRatio > 0\`: a header that exactly touches the line reports a ratio of 0 and gets no further callback as it slides back in. Write the result to a \`data-stuck\` attribute on the header. Do not use a scroll listener.`,
            "- Give the scroll container's first child `margin-top: 1px`. Without it, the first header already sits on the stuck line before any scrolling and shows the shadow at rest.",
            '- Under `prefers-reduced-motion: reduce`, drop the shadow transition so the shadow just appears.',
          ]
        : ["- Don't change the header's style when it is stuck."]),
      '- Keep the headers as real headings (h2 or h3) in DOM order.',
    ].join('\n')
  },
  acceptance: (v) => {
    const offset = Number(v.offset)
    return [
      offset > 0
        ? `While scrolling, each header pins directly under the ${offset}px bar, which itself stays pinned at the top of the scroll container.`
        : 'While scrolling, each header pins to the top of the scroll container.',
      'The next header pushes the current one up; they never overlap.',
      'No row content is visible through a stuck header.',
      v.shadow
        ? "The shadow appears only while a header is stuck, also after setting the scroll container's scrollTop past a header in one step, and goes away when the header scrolls back into place or is pushed out."
        : 'A stuck header looks the same as one in its normal place.',
      "Headers pin to the top of the list's own scroll area, not to the page.",
      'Tabbing through rows, including Shift+Tab back up, never leaves the focused row hidden behind a stuck header.',
      'Screen readers read each header before its rows.',
    ]
  },
  code: (v) => {
    const offset = Number(v.offset)
    return {
      css: [
        '.list {',
        '  overflow-y: auto;',
        offset > 0 ? `  scroll-padding-top: calc(32px + ${offset}px); /* your header height + offset */` : '  scroll-padding-top: 32px; /* your header height */',
        '}',
        '',
        '.section-header {',
        '  position: sticky;',
        `  top: ${offset}px;`,
        '  z-index: 1;',
        '  background: var(--surface, #fff); /* opaque, so rows never show through */',
        ...(v.shadow
          ? [
              '  transition: box-shadow 150ms ease;',
              '}',
              '',
              '.section-header[data-stuck="true"] {',
              '  box-shadow: var(--stuck-shadow, 0 1px 0 var(--border, rgb(0 0 0 / 0.08)), 0 4px 12px rgb(0 0 0 / 0.06));',
              '}',
              '',
              '/* Tune per theme: the light shadow vanishes on a dark surface. */',
              '@media (prefers-color-scheme: dark) {',
              '  .list { --stuck-shadow: 0 1px 0 rgb(255 255 255 / 0.12), 0 4px 12px rgb(0 0 0 / 0.4); }',
              '}',
              '',
              '/* The first header starts 1px below the stuck line, so it is not flagged stuck at rest. */',
              '.list > :first-child {',
              '  margin-top: 1px;',
              '}',
              '',
              '@media (prefers-reduced-motion: reduce) {',
              '  .section-header { transition: none; }',
              '}',
            ]
          : ['}']),
      ].join('\n'),
      ...(v.shadow
        ? {
            js: [
              '// Watch the headers themselves. A header is stuck while the line',
              `// ${offset + 1}px below the top of the list clips its top edge.`,
              '// Pushed fully out by the next header, it is not stuck.',
              '// The large bottom margin keeps the bottom edge from clipping headers,',
              '// so a one-step jump into the pinned spot always crosses a threshold.',
              "const list = document.querySelector('.list')",
              'const io = new IntersectionObserver(',
              '  (entries) => {',
              '    for (const entry of entries) {',
              '      const clipped = entry.isIntersecting && entry.intersectionRatio < 1',
              '      const atTop = entry.boundingClientRect.top <= entry.rootBounds.top',
              '      entry.target.dataset.stuck = String(clipped && atTop)',
              '    }',
              '  },',
              `  { root: list, rootMargin: '-${offset + 1}px 0px 100000px 0px', threshold: [0, 1] },`,
              ')',
              "list.querySelectorAll('.section-header').forEach((h) => io.observe(h))",
            ].join('\n'),
          }
        : {}),
    }
  },
  a11y: 'Keep stuck headers as real headings in reading order, and set scroll-padding-top on the scroll container so a focused row is never hidden underneath a stuck header.',
  related: ['scroll-fade', 'scroll-snap', 'pinned-horizontal-scroll'],
  confusedWith: [
    {
      slug: 'pinned-horizontal-scroll',
      difference: 'Sticky pins one element while its section scrolls past. Pinned horizontal scroll pins a whole section and turns vertical scrolling into sideways movement.',
    },
  ],
  sources: [
    { label: 'MDN: position: sticky', url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky_positioning' },
  ],
})
