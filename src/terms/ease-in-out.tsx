import { useRef, type CSSProperties } from 'react'
import { scaled } from '@/components/demo/playback'
import { snap, useCycle } from '@/components/demo/use-cycle'
import { GlyphSvg } from '@/components/site/glyph'
import { defineTerm, type Control, type ControlValues, type DemoProps, type GlyphProps } from '@/lib/term-types'

const controls = [
  {
    id: 'curve',
    type: 'select',
    label: 'Curve',
    options: [
      { value: 'quart', label: 'Quart (house)' },
      { value: 'cubic', label: 'Cubic' },
      { value: 'expo', label: 'Expo' },
    ],
    default: 'quart',
  },
  {
    id: 'duration',
    type: 'select',
    label: 'Duration',
    options: [
      { value: '200', label: '200ms' },
      { value: '300', label: '300ms' },
      { value: '400', label: '400ms' },
    ],
    default: '300',
  },
  {
    id: 'compare',
    type: 'select',
    label: 'Compare',
    options: [
      { value: 'none', label: 'None' },
      { value: 'keyword', label: 'Keyword' },
      { value: 'ease-out', label: 'Ease-out' },
      { value: 'linear', label: 'Linear' },
    ],
    default: 'none',
  },
] as const satisfies readonly Control[]

type V = ControlValues<typeof controls>
type Compare = Exclude<V['compare'], 'none'>

// `p25`/`p75`: share of the distance covered at 25% and 75% of the duration, in percent, sampled from the curve
// (quart 5.3 / 95.6, cubic 8.7 / 93.1, expo 3.0 / 97.0).
const CURVES: Record<V['curve'], { css: string; motion: string; name: string; p25: number; p75: number }> = {
  quart: { css: 'cubic-bezier(0.77, 0, 0.175, 1)', motion: '[0.77, 0, 0.175, 1]', name: 'ease-in-out quart, the house --ease-in-out', p25: 5, p75: 96 },
  cubic: { css: 'cubic-bezier(0.645, 0.045, 0.355, 1)', motion: '[0.645, 0.045, 0.355, 1]', name: 'ease-in-out cubic', p25: 9, p75: 93 },
  expo: { css: 'cubic-bezier(1, 0, 0, 1)', motion: '[1, 0, 0, 1]', name: 'ease-in-out expo', p25: 3, p75: 97 },
}
// The twin row that moves below; `label` names it on the stage.
const COMPARE: Record<Compare, { css: string; label: string }> = {
  keyword: { css: 'ease-in-out', label: 'CSS keyword' },
  'ease-out': { css: 'cubic-bezier(0.23, 1, 0.32, 1)', label: 'ease-out' },
  linear: { css: 'linear', label: 'linear' },
}

const ITEMS = ['a', 'b', 'c'] as const
type Order = Record<(typeof ITEMS)[number], number>
// The first item moves to the end; the other two shift over one slot each.
const HOME: Order = { a: 0, b: 1, c: 2 }
const MOVED: Order = { a: 2, b: 0, c: 1 }
const SIZE = { card: { w: 64, h: 48, gap: 8 }, detail: { w: 104, h: 68, gap: 12 } }
// The entry page's cards: a kanban board's, a column tag over a title. The card draws each as a square and a bar.
const CARDS: Record<(typeof ITEMS)[number], { tag: string; title: string }> = {
  a: { tag: 'Design', title: 'Write the brief' },
  b: { tag: 'Build', title: 'Ship the sidebar' },
  c: { tag: 'Review', title: 'Review the demos' },
}
const SETTLE_MS = 150
const HOLD_MS = 1100
const REST_MS = 200

const s = (ms: number) => ms / 1000

function Row({ size, ease, label }: { size: DemoProps['size']; ease: string; label?: string }) {
  const { w, h, gap } = SIZE[size]
  const detail = size === 'detail'
  // Items are a third of the row less the gaps, and a slot is one item width plus a gap: a translateX percentage
  // is the item's own width, so the offsets hold when a narrow stage shrinks the row.
  return (
    <div data-row="" className="w-full" style={{ maxWidth: 3 * w + 2 * gap }}>
      {label && <p className={`font-mono text-ink-muted ${detail ? 'mb-2 text-[11px]' : 'mb-1.5 text-[10px]'}`}>{label}</p>}
      <div className="relative w-full" style={{ height: h }}>
        {ITEMS.map((id) => (
          <div
            key={id}
            data-item={id}
            data-order={HOME[id]}
            style={
              {
                width: `calc((100% - ${2 * gap}px) / 3)`,
                height: h,
                transform: `translateX(calc(var(--o) * (100% + ${gap}px)))`,
                '--e': ease,
              } as CSSProperties
            }
            className={`absolute left-0 top-0 flex flex-col rounded-lg bg-surface p-2 shadow-card [--o:0] data-[order=1]:[--o:1] data-[order=2]:[--o:2] transition-[transform] duration-(--d) ease-(--e) group-data-[snap=true]/stage:transition-none ${id === 'a' ? 'z-10' : ''} ${detail ? 'gap-0.5' : 'justify-between'}`}
          >
            {detail ? (
              // Two lines of 16px and a 12px tag in the 52px inside the card: the title may wrap once.
              <>
                <span className="text-[12px] leading-4 text-ink-muted">{CARDS[id].tag}</span>
                <span className="text-[13px] font-medium leading-4 text-ink [text-wrap:balance]">{CARDS[id].title}</span>
              </>
            ) : (
              <>
                <span className={`size-3 rounded-sm ${id === 'a' ? 'bg-demo-subject' : 'bg-demo-2'}`} />
                <span className={`h-1.5 rounded-full bg-demo-2 ${id === 'b' ? 'w-2/3' : 'w-1/2'}`} />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function EaseInOutDemo({ values, playing, replayKey, size, timeScale, onCycleEnd }: DemoProps<V>) {
  const rootRef = useRef<HTMLDivElement>(null)
  const duration = Number(values.duration)

  // One cycle: back home (a no-op unless a replay lands mid-move, which then reverses from where the items are),
  // a beat, the move, a hold, the move back. The still frame is home, so the first play starts without a jump.
  useCycle(
    () => {
      const root = rootRef.current
      const place = (order: Order) =>
        root?.querySelectorAll<HTMLElement>('[data-item]').forEach((el) => (el.dataset.order = String(order[el.dataset.item as keyof Order])))
      const moveAt = duration + SETTLE_MS
      const backAt = moveAt + duration + HOLD_MS
      return {
        steps: [
          [0, () => place(HOME)],
          [moveAt, () => place(MOVED)],
          [backAt, () => place(HOME)],
        ],
        endMs: backAt + duration + REST_MS,
        still: () => {
          if (root) snap(root, () => place(HOME))
        },
      }
    },
    { playing, replayKey, timeScale, onCycleEnd },
    `${values.curve}|${values.duration}|${values.compare}`,
  )

  const compare = values.compare === 'none' ? undefined : COMPARE[values.compare]
  return (
    <div
      ref={rootRef}
      style={{ '--d': `${scaled(duration, timeScale)}ms` } as CSSProperties}
      className={`group/stage flex h-full flex-col items-center justify-center px-4 ${size === 'detail' ? 'gap-6' : 'gap-5'}`}
    >
      <Row size={size} ease={CURVES[values.curve].css} label={compare ? `ease-in-out ${values.curve}` : undefined} />
      {compare && <Row size={size} ease={compare.css} label={compare.label} />}
    </div>
  )
}

function EaseInOutGlyph({ active }: GlyphProps) {
  return (
    <GlyphSvg kind="ease-in-out" active={active}>
      <circle cx="3.5" cy="6" r=".7" fill="currentColor" opacity=".4" />
      <circle cx="8.5" cy="6" r=".7" fill="currentColor" opacity=".4" />
      <circle className="m" cx="6" cy="6" r="1.5" fill="currentColor" />
    </GlyphSvg>
  )
}

function curveText(v: V) {
  if (v.curve === 'quart') return '`var(--ease-in-out)` (`cubic-bezier(0.77, 0, 0.175, 1)`)'
  return `\`${CURVES[v.curve].css}\` (${CURVES[v.curve].name})`
}

// "Ship the house curve" only fits when the house curve is the one picked.
const shipNote = (v: V) => (v.curve === 'quart' ? 'ship the house curve' : 'ship the curve above')

function compareLine(v: V): string[] {
  if (v.compare === 'none') return []
  const twin = {
    keyword: 'the CSS `ease-in-out` keyword (`cubic-bezier(0.42, 0, 0.58, 1)`)',
    'ease-out': '`cubic-bezier(0.23, 1, 0.32, 1)` (ease-out)',
    linear: '`linear`',
  }[v.compare]
  const label = v.compare === 'keyword' ? `Comparison only; ${shipNote(v)}` : 'Comparison only'
  return [`- ${label}: a twin row below with ${twin}, same duration, moved at the same instant.`]
}

function cssCode(v: V): string {
  const c = CURVES[v.curve]
  const timing = v.curve === 'quart' ? 'var(--ease-in-out)' : c.css
  const compare: Record<V['compare'], string[]> = {
    none: [],
    keyword: [
      '',
      `/* Comparison only; ${shipNote(v)}. The built-in keyword,`,
      '   cubic-bezier(0.42, 0, 0.58, 1), starts and stops less sharply: at a',
      `   quarter of the time it has covered 13% of the distance, ${c.name.split(',')[0]} ${c.p25}%. */`,
      '.row.compare .item {',
      '  transition-timing-function: ease-in-out;',
      '}',
    ],
    'ease-out': [
      '',
      '/* Comparison only. Ease-out arrives early and coasts in: it reads as',
      '   something entering, not as something with weight moving across. */',
      '.row.compare .item {',
      `  transition-timing-function: ${COMPARE['ease-out'].css};`,
      '}',
    ],
    linear: [
      '',
      '/* Comparison only. Constant speed starts and stops abruptly, with no',
      '   sense of mass. */',
      '.row.compare .item {',
      '  transition-timing-function: linear;',
      '}',
    ],
  }
  return [
    ...(v.curve === 'quart' ? [':root {', '  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);', '}', ''] : []),
    '/* Fixed slots, like a segmented control knob. Every card is stacked at the',
    "   row's start and moved by a known offset, so a transition on transform is",
    '   enough. Copied into a flex row, the offsets would be counted twice.',
    '   For a DOM reorder, use the FLIP in the JS tab. */',
    '.row {',
    '  position: relative;',
    '  height: 72px; /* the cards are out of flow: give the row their height */',
    '}',
    '',
    '.item {',
    '  position: absolute;',
    '  left: 0;',
    '  top: 0;',
    '  width: 96px;',
    '  --slot: 0;',
    "  /* A translateX percentage is the card's own width, so one slot is",
    '     100% + the gap. Never left or margin: they relayout every frame. */',
    '  transform: translateX(calc(var(--slot) * (100% + 8px)));',
    `  /* ${c.name[0].toUpperCase()}${c.name.slice(1)}. */`,
    '  /* Accelerates, then brakes, like something with mass. A transition, so',
    '     a new target mid-flight continues from where the card is. */',
    `  transition: transform ${v.duration}ms ${timing};`,
    ...(v.duration === '400' ? ['  /* 400ms is above the 300ms budget for product UI. */'] : []),
    '}',
    '.item[data-slot="1"] { --slot: 1; }',
    '.item[data-slot="2"] { --slot: 2; }',
    '',
    '/* Set data-moving on the card that crosses the others when its move starts,',
    '   and remove it on transitionend: it passes above them. */',
    '.item[data-moving] {',
    '  z-index: 1;',
    '}',
    '',
    '/* Keep DOM order stable while cards move. After transitionend, re-sort the',
    '   DOM to match the slots (each card keeps its data-slot, so nothing moves),',
    '   so Tab order and screen readers follow the screen. A keyed React reorder',
    '   in the middle of a move remounts nodes and kills their transitions. */',
    ...compare[v.compare],
    '',
    '/* Reduced motion: cards jump to their new place. */',
    '@media (prefers-reduced-motion: reduce) {',
    '  .item { transition: none; }',
    '}',
  ].join('\n')
}

function jsCode(v: V): string {
  const c = CURVES[v.curve]
  return [
    `// ${c.name[0].toUpperCase()}${c.name.slice(1)}.`,
    `const EASE = '${c.css}'`,
    "const reduced = matchMedia('(prefers-reduced-motion: reduce)')",
    '',
    '// FLIP: measure (First), reorder and measure again (Last), offset each card',
    '// back to where it was (Invert), then animate the offset away (Play).',
    '// Moving the nodes keeps Tab order and screen readers in step with the screen.',
    'export function reorder(list, apply) {',
    '  const items = [...list.children]',
    '  // Measured with any running transform, so a reorder mid-flight starts',
    '  // from where each card is on screen, not from its old slot.',
    '  const first = new Map(items.map((el) => [el, el.getBoundingClientRect()]))',
    '  items.forEach((el) => el.getAnimations().forEach((a) => a.cancel()))',
    '  apply() // move the nodes',
    '  // Reduced motion: cards jump to their new place.',
    '  if (reduced.matches) return',
    '  for (const el of items) {',
    '    const was = first.get(el)',
    '    const now = el.getBoundingClientRect()',
    '    const dx = was.x - now.x',
    '    const dy = was.y - now.y',
    '    if (dx === 0 && dy === 0) continue',
    "    // Transform only: layout is already final; the card just hasn't arrived.",
    '    el.animate(',
    "      [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],",
    `      { duration: ${v.duration}, easing: EASE },`,
    '    )',
    '  }',
    '}',
  ].join('\n')
}

function motionCode(v: V): string {
  const c = CURVES[v.curve]
  return [
    "import { MotionConfig, motion } from 'motion/react'",
    '',
    'type Item = { id: string; label: string }',
    '',
    'export function Row({ items }: { items: Item[] }) {',
    '  return (',
    '    // reducedMotion="user": under reduced motion, cards jump to their new place.',
    '    <MotionConfig reducedMotion="user">',
    '      <ul className="row">',
    '        {items.map((item) => (',
    '          // layout="position" animates the move with transforms (FLIP) and',
    '          // leaves the size alone. Keys must be stable ids, never the index.',
    '          <motion.li',
    '            key={item.id}',
    '            layout="position"',
    `            transition={{ duration: ${s(Number(v.duration))}, ease: ${c.motion} }}`,
    '          >',
    '            {item.label}',
    '          </motion.li>',
    '        ))}',
    '      </ul>',
    '    </MotionConfig>',
    '  )',
    '}',
  ].join('\n')
}

export default defineTerm({
  slug: 'ease-in-out',
  name: 'Ease-in-out',
  category: 'motion',
  order: 2,
  status: 'published',
  definition: 'Motion that speeds up and then slows down, for elements already on screen moving from one spot to another.',
  aliases: ['speeds up then slows down', 'smooth both ends', 'ease in out', 'acceleration and braking'],
  description:
    'Ease-in-out is a timing curve that starts slowly, is fastest in the middle and slows again before it stops, the way something with mass accelerates and brakes. It suits an element that is already on screen and travels to a new spot, because the eye can follow it leaving and arriving. On entrances it is the wrong pick: the slow start delays the first visible change after a click.',
  useWhen: [
    'Reordering a list or a row of cards.',
    'Layout changes where an element moves to a new position on screen.',
    'Slider thumbs, segmented control knobs and tab indicators moving between two spots.',
  ],
  avoidWhen: [
    'Things entering or leaving, like menus, dialogs and toasts. Use ease-out.',
    'Hover and color changes. Use ease at around 150ms.',
    'Drag to reorder, or anything that follows a finger. Use a spring: a curve reversed mid-flight stops dead.',
    'Reorders triggered from the keyboard. Do not animate them.',
    'Durations above 300ms on product UI. Longer travel can take a little more, but a reorder should never feel slow.',
  ],
  demo: {
    component: EaseInOutDemo,
    label:
      "On the entry page, a row of three kanban cards, each a column tag over a title: Design, Write the brief; Build, Ship the sidebar; Review, Review the demos. The first card slides to the end while the other two shift over, slow at the start, fast in the middle and slow at the end. It holds, then moves back. With a comparison picked, a twin row below makes the same move at the same instant with the CSS ease-in-out keyword, ease-out or linear, each row under its curve name. The index card is a wireframe of the same three cards: a square and a bar each.",
    controls,
    glyph: EaseInOutGlyph,
  },
  prompt: (v) => {
    const ms = Number(v.duration)
    return [
      'Animate a reorder in this row of cards.',
      '',
      '- Setup: a horizontal row of N cards. A button (or the card itself) moves one card to another slot; the cards in between shift one slot. Moving back reverses the move.',
      `- Every moving card: \`transform: translateX()\` only, ${ms}ms${v.duration === '400' ? ' (above the 300ms UI budget)' : ''} ${curveText(v)}, all together, both directions. The crossing card sits above (\`z-index\`).`,
      "- CSS route (fixed slots): `.row { position: relative }`; every card stacked at the row's start (`position: absolute; left: 0; top: 0`), moved by `translateX(calc(slot * (card width + gap)))` with `transition: transform`. Keep DOM order stable while moving; re-sort after `transitionend`, slots unchanged (a keyed React reorder kills running transitions).",
      '- FLIP route (DOM reorder): `getBoundingClientRect()` each card (running transforms included), cancel its animations, reorder, re-measure, `el.animate()` `translate(dx, dy)` to `none`.',
      `- Motion route: \`layout="position"\`, \`transition: { duration: ${s(ms)}, ease: ${CURVES[v.curve].motion} }\`, stable keys.`,
      '- Never animate `left`, `top`, `width`, `margin` or `order`.',
      '- A new move mid-flight starts from the current on-screen position.',
      ...compareLine(v),
      "- Reduced motion: cards jump. CSS: `transition: none` in `@media (prefers-reduced-motion: reduce)`; FLIP: skip `animate()` if `matchMedia('(prefers-reduced-motion: reduce)').matches`; Motion: `<MotionConfig reducedMotion=\"user\">`.",
    ].join('\n')
  },
  acceptance: (v) => {
    const c = CURVES[v.curve]
    const ms = Number(v.duration)
    return [
      `CSS route: a moving card's computed \`transition-timing-function\` is \`${c.css}\` and \`transition-duration\` is \`${s(ms)}s\`. FLIP route: \`el.getAnimations()[0].effect.getTiming()\` has \`easing: '${c.css}'\` and \`duration: ${ms}\`. A move takes ${ms}ms.`,
      `Slow at both ends (CSS or FLIP route): at 25% of the duration a card has covered ${c.p25}% (±1) of its distance, at 75% ${c.p75}% (±1). To measure, pause the animation (\`const a = el.getAnimations()[0]; a.pause()\`), set \`a.currentTime\` to ${ms / 4} and then ${(ms * 3) / 4}, and read the x of \`new DOMMatrix(getComputedStyle(el).transform)\`.`,
      'Only the transform changes while cards move: `offsetLeft` and `offsetTop` never take in-between values.',
      'Starting a new move mid-flight continues from where each card is on screen, with no jump.',
      'Every card that moves starts and lands at the same time, and the card crossing the others passes above them.',
      'Once a move settles, Tab order and screen reader order match what is on screen.',
      ...(v.compare === 'none'
        ? []
        : [`The comparison row moves at the same instant, and its computed \`transition-timing-function\` is \`${COMPARE[v.compare].css}\` (comparison only).`]),
      'With reduced motion on, cards jump to their new places with no running animations.',
    ]
  },
  code: (v) => ({ css: cssCode(v), js: jsCode(v), motion: motionCode(v) }),
  a11y: 'Reorder the DOM, not only the picture, so Tab order and screen readers follow what is on screen: with fixed slots, re-sort once the move ends. Announce the new position of a moved card in a polite live region. Reorders made from the keyboard should not animate. Under reduced motion, skip the animation and let cards jump to their new places.',
  related: ['ease-out', 'shared-layout', 'interruptibility', 'duration'],
  sources: [
    { label: 'Emil Kowalski: Good vs Great Animations', url: 'https://emilkowal.ski/ui/good-vs-great-animations' },
    { label: 'Paul Lewis: FLIP Your Animations', url: 'https://aerotwist.com/blog/flip-your-animations/' },
    { label: 'easing.dev: easing curves', url: 'https://easing.dev' },
  ],
})
