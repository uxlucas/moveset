import { Search } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { BrowserFrame } from '@/components/demo/browser-frame'
import { useAutoScroll, type Bezier, type TrackPoint } from '@/components/demo/use-auto-scroll'
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
// The entry page names people from computing history (none living); the card draws the same rows as bars.
const SECTIONS = [
  { letter: 'A', people: ['Ada Lovelace', 'Alan Turing', 'Anita Borg'] },
  { letter: 'B', people: ['Beatrice Worsley', 'Bernard Galler', 'Bert Sutherland', 'Betty Holberton', 'Bob Bemer'] },
  { letter: 'C', people: ['Carl Petri', 'Charles Babbage', 'Christopher Strachey', 'Claude Shannon', 'Corrado Böhm'] },
  { letter: 'D', people: ['Danny Cohen', 'David Wheeler', 'Dennis Ritchie', 'Donald Davies', 'Dorothy Vaughan', 'Douglas Engelbart'] },
  { letter: 'E', people: ['Edgar Codd', 'Edmund Berkeley', 'Edsger Dijkstra', 'Evelyn Berezin'] },
]
const LINE_WIDTHS = ['w-24', 'w-20', 'w-28', 'w-16']
const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
// Used until the track is measured.
const SCROLL_EASE = [0.45, 0, 0.55, 1] as const
const PUSH_MS = 400
const CYCLE_MS = 5800

// Cruises between handoffs and slows to a steady pace through each push (the next header pushing the pinned one out),
// timed from the measured section tops. Cruise curves leave and meet each push at the push's speed, so the pace
// changes without a jolt; the first starts from rest and the last comes to rest.
function buildTrack(el: HTMLElement, offset: number): TrackPoint[] | undefined {
  const max = el.scrollHeight - el.clientHeight
  const sections = [...el.querySelectorAll<HTMLElement>('[data-section]')]
  const h = sections[0]?.querySelector<HTMLElement>('[data-sticky-header]')?.offsetHeight ?? 0
  const pushes = sections
    .slice(1)
    .map((s) => [s.offsetTop - offset - h, s.offsetTop - offset] as const)
    .filter(([from, to]) => from > 0 && to <= max)
  if (max <= 0 || h <= 0 || pushes.length === 0) return undefined
  const pushSpeed = h / PUSH_MS
  // Each cruise segment's end slope, relative to its average speed, chosen so the whole cycle lands on CYCLE_MS.
  const slope = Math.min(1.5, ((CYCLE_MS - pushes.length * PUSH_MS) * pushSpeed) / (max - pushes.length * h))
  const k = 0.4 * slope
  const fromRest: Bezier = [0.5, 0, 0.6, 1 - k]
  const cruise: Bezier = [0.4, k, 0.6, 1 - k]
  const toRest: Bezier = [0.4, k, 0.5, 1]
  const track: TrackPoint[] = [[0, 0]]
  let t = 0
  let at = 0
  pushes.forEach(([from, to], i) => {
    t += (slope * (from - at)) / pushSpeed
    track.push([Math.round(t), from / max, i === 0 ? fromRest : cruise])
    t += PUSH_MS
    track.push([Math.round(t), to / max, 'linear'])
    at = to
  })
  if (max - at >= 1) track.push([Math.round(t + (slope * (max - at)) / pushSpeed), 1, toRest])
  return track
}

// Watches the headers themselves. A header is stuck while the line `offset + 1`px below the top cuts through it:
// clipped at the top, still showing below the line. Pushed fully out, or with its bottom exactly on the line, it is not.
// The large bottom margin stretches the root far below the list, so the stuck line is the only edge that can clip a
// header; otherwise a header half under the bottom edge that jumps straight to the pinned spot stays between thresholds
// and never gets a callback. The 0.01 threshold gives a callback when a header that exactly touched the line (ratio 0)
// starts sliding back in; with [0, 1] alone it would stay unflagged while pinned.
function useStuckHeaders(rootRef: RefObject<HTMLElement | null>, offset: number) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const { top, bottom } = entry.boundingClientRect
          const line = entry.rootBounds?.top ?? 0
          const clipped = entry.isIntersecting && entry.intersectionRatio < 1
          ;(entry.target as HTMLElement).dataset.stuck = String(clipped && top <= line && bottom > line)
        }
      },
      { root, rootMargin: `-${offset + 1}px 0px 100000px 0px`, threshold: [0, 0.01, 1] },
    )
    root.querySelectorAll('[data-sticky-header]').forEach((h) => io.observe(h))
    return () => io.disconnect()
  }, [rootRef, offset])
}

function StickyDemo({ values, playing, replayKey, size, timeScale, onCycleEnd }: DemoProps<V>) {
  const offset = Number(values.offset)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [stillPx, setStillPx] = useState<number>()
  const [track, setTrack] = useState<TrackPoint[]>()

  useLayoutEffect(() => {
    const el = scrollRef.current
    const b = el?.querySelector<HTMLElement>('[data-section="B"]')
    const row = b?.querySelector<HTMLElement>('[data-row]')
    if (!el || !b || !row) return
    // Still frame: B pinned with about a row and a half passing under it, so the shadow shows.
    setStillPx(Math.round(b.offsetTop - offset + row.offsetHeight * 1.5))
    const next = buildTrack(el, offset)
    setTrack((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
  }, [offset])

  useAutoScroll(scrollRef, { playing, replayKey, timeScale, onCycleEnd, interactive: size === 'detail', durationMs: 4400, stillPx, ease: SCROLL_EASE, track })
  useStuckHeaders(scrollRef, offset)
  const detail = size === 'detail'

  // The entry page is the real list: a Contacts bar when there is an offset, letter headers in ink, rows with an
  // initials avatar and a name. The card is a wireframe of the same rows (a dot and a bar each), so the scroll maths,
  // which measures the layout, holds for both.
  return (
    <BrowserFrame scrollRef={scrollRef} size={size} label="Contact list with sticky letter headers">
      <div className="dark:[--stuck-shadow:0_1px_0_var(--line-strong),0_4px_12px_rgb(0_0_0/0.4)]">
        {offset > 0 && (
          <div className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface px-3" style={{ height: offset }}>
            {detail ? (
              <>
                <span className="text-[13px] font-medium leading-5 text-ink">Contacts</span>
                <Search size={14} aria-hidden className="text-ink-muted" />
              </>
            ) : (
              <span className="h-2 w-14 rounded-full bg-demo-2" />
            )}
          </div>
        )}
        {SECTIONS.map((section, index) => (
          // 1px above the first section, so at rest its header sits below the stuck line instead of on it.
          <div key={section.letter} data-section={section.letter} className={index === 0 ? 'mt-px' : undefined}>
            <div
              data-sticky-header=""
              data-stuck="false"
              style={{ top: offset }}
              className={`sticky z-10 flex min-h-8 items-center bg-surface px-3 transition-shadow duration-150 ease-[ease] motion-reduce:transition-none ${detail ? 'text-[13px] font-semibold text-ink' : 'text-[10px] font-medium text-ink-muted'} ${values.shadow ? 'data-[stuck=true]:[box-shadow:var(--stuck-shadow,0_1px_0_var(--line),0_4px_12px_oklch(0_0_0/0.06))]' : ''}`}
            >
              {section.letter}
            </div>
            {section.people.map((name, i) =>
              detail ? (
                <div key={name} data-row="" className="flex items-center gap-2.5 border-b border-line px-3 py-2">
                  <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-demo-2 text-[11px] font-medium text-ink">
                    {initials(name)}
                  </span>
                  <span className="text-[13px] leading-5 text-ink">{name}</span>
                </div>
              ) : (
                <div key={name} data-row="" className="flex items-center gap-2.5 border-b border-line px-3 py-2">
                  <span className="size-5 shrink-0 rounded-full bg-demo" />
                  <span className={`h-2 rounded-full bg-demo-2 ${LINE_WIDTHS[(i + section.people.length) % LINE_WIDTHS.length]}`} />
                  <span className="ml-auto h-2 w-10 rounded-full bg-demo" />
                </div>
              ),
            )}
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
  status: 'published',
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
  demo: {
    component: StickyDemo,
    label:
      'On the entry page, a contact list scrolls inside a small browser window: letter headers A to E over rows of names from computing history, each with a round initials avatar. Each letter header pins to the top while its section passes underneath, then the next header pushes it away. With a top offset, a Contacts bar stays pinned above the headers. The index card is a wireframe of the same list: a dot and a bar for each row.',
    controls,
    glyph: StickyGlyph,
  },
  prompt: (v) => {
    const offset = Number(v.offset)
    const padding = offset > 0 ? `calc(32px + ${offset}px)` : '32px'
    return [
      'Make the section headers in this list sticky.',
      '',
      '- Wrap each header and its rows in one element, header first.',
      `- Header: real h2 or h3, \`position: sticky; top: ${offset}px;\` in the list's own scroll container, opaque background, z-index above rows.`,
      ...(offset > 0
        ? [
            `- ${offset}px is the height of a bar pinned with \`position: sticky; top: 0\` in the scroll container. If the bar is outside it: \`top: 0\`${v.shadow ? ", rootMargin '-1px 0px 100000px 0px'" : ''} and no offset in \`scroll-padding-top\`.`,
          ]
        : []),
      `- Headers are 32px tall; \`scroll-padding-top: ${padding}\` on the scroll container.`,
      '- No `overflow: hidden`, `auto` or `scroll` on ancestors between header and scroll container; use `overflow: clip`.',
      ...(v.shadow ? ['- Scroll container: no padding. First section wrapper: `margin-top: 1px`.'] : []),
      "- A last section shorter than the container never pins (expected; don't pad it).",
      ...(v.shadow
        ? [
            '- Header: `transition: box-shadow 150ms ease` (none under reduced motion). `[data-stuck="true"]`: `box-shadow: var(--stuck-shadow, 0 1px 0 var(--border, rgb(0 0 0 / 0.08)), 0 4px 12px rgb(0 0 0 / 0.06))`.',
            '- Dark (`prefers-color-scheme: dark`): `--stuck-shadow: 0 1px 0 rgb(255 255 255 / 0.12), 0 4px 12px rgb(0 0 0 / 0.4)`.',
            `- One IntersectionObserver on the headers: root = scroll container, rootMargin '-${offset + 1}px 0px 100000px 0px', threshold [0, 0.01, 1]. Stuck = \`entry.isIntersecting && entry.intersectionRatio < 1 && entry.boundingClientRect.top <= entry.rootBounds.top && entry.boundingClientRect.bottom > entry.rootBounds.top\`, written to the header as \`data-stuck="true"\` or \`"false"\`. Use these values exactly.`,
          ]
        : ["- Don't change the header's style when it is stuck."]),
    ].join('\n')
  },

  acceptance: (v) => {
    const offset = Number(v.offset)
    return [
      `${
        offset > 0
          ? `While scrolling, each header pins directly under the ${offset}px bar, which itself stays pinned at the top of the scroll container`
          : 'While scrolling, each header pins to the top of the scroll container'
      } (a last section shorter than the container never pins; that is expected).`,
      'The next header pushes the current one up; they never overlap.',
      'No row content is visible through a stuck header.',
      v.shadow
        ? "The shadow appears only while a header is stuck, also after setting the scroll container's scrollTop past a header in one step, and goes away when the header scrolls back into place or once it is pushed out (a 1px sliver may remain)."
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
        ...(v.shadow ? ['  padding: 0; /* padding goes on a wrapper, so rootMargin lines up with the top */'] : []),
        offset > 0 ? `  scroll-padding-top: calc(32px + ${offset}px); /* header height + offset */` : '  scroll-padding-top: 32px; /* header height */',
        '}',
        '',
        '.section-header {',
        '  position: sticky;',
        `  top: ${offset}px;`,
        '  z-index: 1;',
        '  min-height: 32px;',
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
              '.list > section:first-of-type {',
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
              `// A header is stuck while the line ${offset + 1}px below the top of the list cuts through it.`,
              "const list = document.querySelector('.list')",
              'const io = new IntersectionObserver(',
              '  (entries) => {',
              '    for (const entry of entries) {',
              '      const { top, bottom } = entry.boundingClientRect',
              '      const line = entry.rootBounds.top',
              '      const clipped = entry.isIntersecting && entry.intersectionRatio < 1',
              '      // bottom > line: pushed out until its bottom touches the line, a header still intersects at ratio 0.',
              '      entry.target.dataset.stuck = String(clipped && top <= line && bottom > line)',
              '    }',
              '  },',
              '  // The 100000px bottom margin keeps the bottom edge from clipping a header, so a jump',
              '  // straight to the pinned spot (anchor link, scrollTop set in code) still gets a callback.',
              '  // The 0.01 threshold: a header sliding back in from ratio 0 gets one too.',
              `  { root: list, rootMargin: '-${offset + 1}px 0px 100000px 0px', threshold: [0, 0.01, 1] },`,
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
