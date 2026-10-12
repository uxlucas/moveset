import { useEffect, useRef, type RefObject } from 'react'
import { BrowserFrame } from '@/components/demo/browser-frame'
import { useAutoScroll } from '@/components/demo/use-auto-scroll'
import { defineTerm, type Control, type ControlValues, type DemoProps } from '@/lib/term-types'

const controls = [
  { id: 'offset', type: 'range', label: 'Top offset', min: 0, max: 24, step: 4, unit: 'px', default: 0 },
  { id: 'shadow', type: 'toggle', label: 'Shadow when stuck', default: true },
] as const satisfies readonly Control[]

type V = ControlValues<typeof controls>

const SECTIONS = [
  { letter: 'A', rows: 3 },
  { letter: 'B', rows: 4 },
  { letter: 'C', rows: 4 },
  { letter: 'D', rows: 3 },
]
const LINE_WIDTHS = ['w-24', 'w-20', 'w-28', 'w-16']

// Marks a header stuck when the 1px sentinel just above it scrolls out of view.
function useStuckHeaders(rootRef: RefObject<HTMLElement | null>, offset: number) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const header = entry.target.nextElementSibling as HTMLElement | null
          if (!header) continue
          const above = entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0)
          header.dataset.stuck = String(!entry.isIntersecting && above)
        }
      },
      { root, rootMargin: `-${offset + 1}px 0px 0px 0px`, threshold: 0 },
    )
    root.querySelectorAll('[data-sentinel]').forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [rootRef, offset])
}

function StickyDemo({ values, playing, replayKey, size, timeScale, onCycleEnd }: DemoProps<V>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useAutoScroll(scrollRef, { playing, replayKey, timeScale, onCycleEnd, interactive: size === 'detail', durationMs: 3600, stillAt: 0.4 })
  useStuckHeaders(scrollRef, values.offset)

  return (
    <BrowserFrame scrollRef={scrollRef} size={size} label="Contact list with sticky letter headers">
      <div>
        {values.offset > 0 && <div className="sticky top-0 z-20 border-b border-line bg-surface" style={{ height: values.offset }} />}
        {SECTIONS.map((section) => (
          <div key={section.letter}>
            <div data-sentinel="" className="h-px" />
            <div
              data-sticky-header=""
              data-stuck="false"
              style={{ top: values.offset }}
              className={`sticky z-10 bg-surface px-3 py-1 text-[10px] font-medium text-ink-muted transition-shadow duration-150 ease-[ease] motion-reduce:transition-none ${values.shadow ? 'data-[stuck=true]:shadow-[0_1px_0_var(--line),0_4px_12px_oklch(0_0_0/0.06)]' : ''}`}
            >
              {section.letter}
            </div>
            {Array.from({ length: section.rows }, (_, i) => (
              <div key={i} className="flex items-center gap-2.5 border-b border-line px-3 py-2">
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
    'A toolbar that should stay within reach without taking space from the content.',
  ],
  avoidWhen: [
    'Small screens where a pinned element takes a big share of the viewport.',
    'Stacking several sticky bars, which leaves little room to read.',
    'When the element must stay visible past the end of its parent. Sticky cannot leave its container, so use a fixed element instead.',
  ],
  demo: { component: StickyDemo, label: 'A contact list scrolls inside a small browser window. Each letter header pins to the top while its section passes underneath, then the next header pushes it away.', controls },
  prompt: (v) =>
    [
      'Make the section headers in this list sticky.',
      '',
      "- Wrap each header and its rows in their own element, with the header at the top of that element (right after its sentinel, when you use one). Sticky only holds inside its parent, which is what lets the next header push the current one away instead of stacking on it.",
      `- Give each section header \`position: sticky; top: ${v.offset}px;\`${v.offset > 0 ? ` (${v.offset}px is the height of the bar that stays above the list)` : ''} inside the list's own scroll container. Each header should only stick within its own section, so the next header pushes it up instead of overlapping it.`,
      '- Give headers an opaque background that matches the list, and a z-index above the rows, so rows never show through.',
      '- Check every ancestor between the header and the scroll container: `overflow: hidden`, `overflow-x: hidden`, `overflow: auto` or `overflow: scroll` on any of them silently breaks sticky. Use `overflow: clip` when you need clipping.',
      `- Set \`scroll-padding-top\` on the scroll container to the header height${v.offset > 0 ? ` plus ${v.offset}px` : ''}, so rows focused with the keyboard are never hidden behind a stuck header.`,
      ...(v.shadow
        ? [
            `- While a header is stuck, show a soft shadow under it: \`box-shadow: 0 1px 0 var(--border, rgb(0 0 0 / 0.08)), 0 4px 12px rgb(0 0 0 / 0.06)\`, transitioned over 150ms with \`ease\`. Detect "stuck" with an IntersectionObserver whose root is the list's scroll container and whose rootMargin is '-${v.offset + 1}px 0px 0px 0px', watching a 1px sentinel element placed just above each header. A header is stuck when its sentinel is not intersecting and sits above the root's top edge. Do not use a scroll listener.`,
            '- Under `prefers-reduced-motion: reduce`, drop the shadow transition so the shadow just appears.',
          ]
        : ["- Don't change the header's style when it is stuck."]),
      '- Keep the headers as real headings (h2 or h3) in DOM order.',
    ].join('\n'),
  acceptance: (v) => [
    v.offset > 0
      ? `While scrolling, each header pins directly under the ${v.offset}px bar at the top of the scroll container.`
      : 'While scrolling, each header pins to the top of the scroll container.',
    'The next header pushes the current one up; they never overlap.',
    'No row content is visible through a stuck header.',
    v.shadow
      ? 'The shadow appears only while a header is stuck and goes away when it scrolls back into place.'
      : 'A stuck header looks the same as one in its normal place.',
    "Headers pin to the top of the list's own scroll area, not to the page.",
    'Tabbing through rows, including Shift+Tab back up, never leaves the focused row hidden behind a stuck header.',
    'Screen readers read each header before its rows.',
  ],
  code: (v) => ({
    css: [
      '.list {',
      '  overflow-y: auto;',
      `  scroll-padding-top: calc(32px + ${v.offset}px); /* header height + offset */`,
      '}',
      '',
      '.section-header {',
      '  position: sticky;',
      `  top: ${v.offset}px;`,
      '  z-index: 1;',
      '  background: var(--surface, #fff); /* opaque, so rows never show through */',
      ...(v.shadow
        ? [
            '  transition: box-shadow 150ms ease;',
            '}',
            '',
            '.section-header[data-stuck="true"] {',
            '  box-shadow: 0 1px 0 var(--border, rgb(0 0 0 / 0.08)), 0 4px 12px rgb(0 0 0 / 0.06);',
            '}',
            '',
            '@media (prefers-reduced-motion: reduce) {',
            '  .section-header { transition: none; }',
            '}',
            '',
            '.sentinel { height: 1px; }',
          ]
        : ['}']),
    ].join('\n'),
    ...(v.shadow
      ? {
          js: [
            '// A 1px .sentinel (see the CSS) sits just above each header.',
            '// When it scrolls out of view, the header below it is stuck.',
            '// A header pushed away by the next one keeps stuck=true; harmless for a shadow.',
            "const list = document.querySelector('.list')",
            'const io = new IntersectionObserver(',
            '  (entries) => {',
            '    for (const entry of entries) {',
            '      const header = entry.target.nextElementSibling',
            '      const above = entry.boundingClientRect.top < entry.rootBounds.top',
            '      header.dataset.stuck = String(!entry.isIntersecting && above)',
            '    }',
            '  },',
            `  { root: list, rootMargin: '-${v.offset + 1}px 0px 0px 0px' },`,
            ')',
            "list.querySelectorAll('.sentinel').forEach((s) => io.observe(s))",
          ].join('\n'),
        }
      : {}),
  }),
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
