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
          const above = entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0) + offset + 1
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
        {SECTIONS.map((section) => (
          <div key={section.letter}>
            <div data-sentinel="" className="h-px" />
            <div
              data-sticky-header=""
              data-stuck="false"
              style={{ top: values.offset }}
              className={`sticky z-10 border-b border-line bg-surface px-3 py-1 text-[10px] font-medium text-ink-muted transition-shadow duration-150 ease-[ease] ${values.shadow ? 'data-[stuck=true]:shadow-[0_1px_0_var(--line),0_4px_12px_oklch(0_0_0/0.06)]' : ''}`}
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
      `- Give each section header \`position: sticky; top: ${v.offset}px;\` inside the list's own scroll container. Each header should only stick within its own section, so the next header pushes it up instead of overlapping it.`,
      '- Give headers an opaque background that matches the list, and a z-index above the rows, so rows never show through.',
      '- Check every ancestor between the header and the scroll container: `overflow: hidden` or `overflow: auto` on any of them silently breaks sticky.',
      `- Set \`scroll-padding-top\` on the scroll container to the header height plus ${v.offset}px, so rows focused with the keyboard are never hidden behind a stuck header.`,
      ...(v.shadow
        ? [
            '- While a header is stuck, show a soft shadow under it: `box-shadow: 0 1px 0 var(--border), 0 4px 12px rgb(0 0 0 / 0.06)`, transitioned over 150ms with `ease`. Detect "stuck" with an IntersectionObserver watching a 1px sentinel element placed just above each header, not with a scroll listener.',
            '- Under `prefers-reduced-motion: reduce`, drop the shadow transition so the shadow just appears.',
          ]
        : ["- Don't change the header's style when it is stuck."]),
      '- Keep the headers as real headings (h2 or h3) in DOM order.',
    ].join('\n'),
  acceptance: (v) => [
    `While scrolling, each header pins ${v.offset}px from the top of the scroll container.`,
    'The next header pushes the current one up; they never overlap.',
    'No row content is visible through a stuck header.',
    v.shadow
      ? 'The shadow appears only while a header is stuck and goes away when it scrolls back into place.'
      : 'A stuck header looks the same as one in its normal place.',
    'It works inside a nested scroll container, not only when the whole page scrolls.',
    'Tabbing through rows never leaves the focused row hidden behind a stuck header.',
    'Screen readers read each header before its rows.',
  ],
  code: (v) => ({
    css: [
      '.list {',
      '  overflow-y: auto;',
      `  scroll-padding-top: calc(var(--header-height) + ${v.offset}px);`,
      '}',
      '',
      '.section-header {',
      '  position: sticky;',
      `  top: ${v.offset}px;`,
      '  z-index: 1;',
      '  background: var(--surface); /* opaque, so rows never show through */',
      ...(v.shadow
        ? [
            '  transition: box-shadow 150ms ease;',
            '}',
            '',
            '.section-header[data-stuck="true"] {',
            '  box-shadow: 0 1px 0 var(--border), 0 4px 12px rgb(0 0 0 / 0.06);',
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
            '// A 1px .sentinel sits just above each header.',
            '// When it scrolls out of view, the header below it is stuck.',
            "const list = document.querySelector('.list')",
            'const io = new IntersectionObserver(',
            '  (entries) => {',
            '    for (const entry of entries) {',
            '      const header = entry.target.nextElementSibling',
            `      const above = entry.boundingClientRect.top < entry.rootBounds.top + ${v.offset + 1}`,
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
    { label: 'MDN — position: sticky', url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky_positioning' },
  ],
})
