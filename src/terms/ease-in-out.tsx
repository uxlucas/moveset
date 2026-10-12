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
      { value: 'keyword', label: 'Keyword' },
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
      { value: 'ease-out', label: 'Ease-out' },
      { value: 'linear', label: 'Linear' },
    ],
    default: 'none',
  },
] as const satisfies readonly Control[]

type V = ControlValues<typeof controls>

// `p25`/`p75`: share of the distance covered at 25% and 75% of the duration, in percent, sampled from the curve.
const CURVES: Record<V['curve'], { css: string; motion: string; name: string; p25: number; p75: number }> = {
  quart: { css: 'cubic-bezier(0.77, 0, 0.175, 1)', motion: '[0.77, 0, 0.175, 1]', name: 'ease-in-out quart, the house --ease-in-out', p25: 5, p75: 96 },
  cubic: { css: 'cubic-bezier(0.645, 0.045, 0.355, 1)', motion: '[0.645, 0.045, 0.355, 1]', name: 'ease-in-out cubic', p25: 9, p75: 93 },
  expo: { css: 'cubic-bezier(1, 0, 0, 1)', motion: '[1, 0, 0, 1]', name: 'ease-in-out expo', p25: 3, p75: 97 },
  keyword: { css: 'ease-in-out', motion: '[0.42, 0, 0.58, 1]', name: 'the built-in ease-in-out keyword', p25: 13, p75: 87 },
}
const COMPARE: Record<Exclude<V['compare'], 'none'>, { css: string; label: string }> = {
  'ease-out': { css: 'cubic-bezier(0.23, 1, 0.32, 1)', label: '`cubic-bezier(0.23, 1, 0.32, 1)` (ease-out)' },
  linear: { css: 'linear', label: '`linear`' },
}

const ITEMS = ['a', 'b', 'c'] as const
type Order = Record<(typeof ITEMS)[number], number>
// The first item moves to the end; the other two shift over one slot each.
const HOME: Order = { a: 0, b: 1, c: 2 }
const MOVED: Order = { a: 2, b: 0, c: 1 }
const SIZE = { card: { w: 64, h: 48, gap: 8 }, detail: { w: 104, h: 68, gap: 12 } }
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
            className={`absolute left-0 top-0 flex flex-col justify-between rounded-lg bg-surface shadow-card [--o:0] data-[order=1]:[--o:1] data-[order=2]:[--o:2] transition-[transform] duration-(--d) ease-(--e) group-data-[snap=true]/stage:transition-none ${id === 'a' ? 'z-10' : ''} ${detail ? 'p-3' : 'p-2'}`}
          >
            <span className={`rounded-sm ${id === 'a' ? 'bg-demo-subject' : 'bg-demo-2'} ${detail ? 'size-4' : 'size-3'}`} />
            <span className={`h-1.5 rounded-full bg-demo-2 ${id === 'b' ? 'w-2/3' : 'w-1/2'}`} />
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
      <Row size={size} ease={CURVES[values.curve].css} label={compare ? 'ease-in-out' : undefined} />
      {compare && <Row size={size} ease={compare.css} label={values.compare} />}
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
  const c = CURVES[v.curve]
  if (v.curve === 'quart') return '`var(--ease-in-out)` (`cubic-bezier(0.77, 0, 0.175, 1)`)'
  if (v.curve === 'keyword') return '`ease-in-out` keyword (comparison only; ship `cubic-bezier(0.77, 0, 0.175, 1)`)'
  return `\`${c.css}\` (${c.name})`
}

function cssCode(v: V): string {
  const c = CURVES[v.curve]
  const timing = v.curve === 'quart' ? 'var(--ease-in-out)' : c.css
  const compare =
    v.compare === 'ease-out'
      ? [
          '',
          '/* Comparison only. Ease-out arrives early and coasts in: it reads as',
          '   something entering, not as something with weight moving across. */',
          '.row.compare .item {',
          `  transition-timing-function: ${COMPARE['ease-out'].css};`,
          '}',
        ]
      : v.compare === 'linear'
        ? [
            '',
            '/* Comparison only. Constant speed starts and stops abruptly, with no',
            '   sense of mass. */',
            '.row.compare .item {',
            '  transition-timing-function: linear;',
            '}',
          ]
        : []
  return [
    ...(v.curve === 'quart' ? [':root {', '  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);', '}', ''] : []),
    '/* Fixed slots, like a segmented control knob: the offset is known, so a',
    '   transition on transform is enough. Not left or margin, which relayout',
    '   every frame. For a real DOM reorder, use the FLIP in the JS tab. */',
    '.item {',
    '  --slot: 0;',
    '  transform: translateX(calc(var(--slot) * (100% + 8px))); /* item width + gap */',
    `  /* ${c.name[0].toUpperCase()}${c.name.slice(1)}: accelerates, then brakes, like something`,
    '     with mass. A transition, so a new target mid-flight continues from where',
    '     the item is. */',
    `  transition: transform ${v.duration}ms ${timing};`,
    ...(v.duration === '400' ? ['  /* 400ms is above the 300ms budget for product UI. */'] : []),
    '}',
    '.item[data-slot="1"] { --slot: 1; }',
    '.item[data-slot="2"] { --slot: 2; }',
    ...compare,
    '',
    '/* Reduced motion: items jump to their new place. */',
    '@media (prefers-reduced-motion: reduce) {',
    '  .item { transition: none; }',
    '}',
  ].join('\n')
}

function jsCode(v: V): string {
  const c = CURVES[v.curve]
  return [
    `const EASE = '${c.css}' // ${c.name}`,
    "const reduced = matchMedia('(prefers-reduced-motion: reduce)')",
    '',
    '// FLIP: measure (First), reorder and measure again (Last), offset each item',
    '// back to where it was (Invert), then animate the offset away (Play).',
    '// Moving the nodes keeps Tab order and screen readers in step with the screen.',
    'export function reorder(list, apply) {',
    '  const items = [...list.children]',
    '  // Measured with any running transform, so a reorder mid-flight starts',
    '  // from where each item is on screen, not from its old slot.',
    '  const first = new Map(items.map((el) => [el, el.getBoundingClientRect()]))',
    '  items.forEach((el) => el.getAnimations().forEach((a) => a.cancel()))',
    '  apply() // move the nodes',
    '  if (reduced.matches) return',
    '  for (const el of items) {',
    '    const was = first.get(el)',
    '    const now = el.getBoundingClientRect()',
    '    const dx = was.x - now.x',
    '    const dy = was.y - now.y',
    '    if (dx === 0 && dy === 0) continue',
    "    // Transform only: layout is already final; the item just hasn't arrived.",
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
    "import { motion, useReducedMotion } from 'motion/react'",
    '',
    'type Item = { id: string; label: string }',
    '',
    'export function Row({ items }: { items: Item[] }) {',
    '  // Reduced motion: items jump to their new place.',
    '  const reduce = useReducedMotion()',
    '  return (',
    '    <ul className="row">',
    '      {items.map((item) => (',
    '        // layout="position" animates the move with transforms (FLIP) and leaves',
    '        // the size alone. Keys must be stable ids, never the index.',
    '        <motion.li',
    '          key={item.id}',
    '          layout="position"',
    `          transition={reduce ? { duration: 0 } : { duration: ${s(Number(v.duration))}, ease: ${c.motion} }}`,
    '        >',
    '          {item.label}',
    '        </motion.li>',
    '      ))}',
    '    </ul>',
    '  )',
    '}',
  ].join('\n')
}

export default defineTerm({
  slug: 'ease-in-out',
  name: 'Ease-in-out',
  category: 'motion',
  order: 2,
  status: 'review',
  definition: 'Motion that speeds up and then slows down, for elements already on screen moving from one spot to another.',
  aliases: ['speeds up then slows down', 'smooth both ends', 'ease in out', 'symmetric easing', 'acceleration and braking'],
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
    'Durations above 300ms on product UI. Longer travel can take a little more, but a reorder should never feel slow.',
  ],
  demo: {
    component: EaseInOutDemo,
    label:
      'A row of three cards. The first card slides to the end while the other two shift over, slow at the start, fast in the middle and slow at the end. It holds, then moves back. With a comparison picked, a twin row below makes the same move at the same instant with ease-out or linear.',
    controls,
    glyph: EaseInOutGlyph,
  },
  prompt: (v) => {
    const ms = Number(v.duration)
    return [
      'Animate items in this row moving to their new spots (reorder).',
      '',
      `- Every moving item: \`transform\` (translate) only, ${ms}ms${v.duration === '400' ? ' (above the 300ms UI budget)' : ''} ${curveText(v)}, both directions, all items together.`,
      '- DOM reorder: FLIP. `getBoundingClientRect()` each item (running transforms included), cancel its animations, reorder, measure again, animate `translate(dx, dy)` to `none`.',
      '- Fixed slots (segmented control knob): `transition: transform` on a known offset, `translateX(calc(slot * (item width + gap)))`.',
      '- Never animate `left`, `top`, `width`, `margin` or `order`.',
      '- A new move mid-flight starts from the current on-screen position.',
      `- Motion: \`layout="position"\`, \`transition: { duration: ${s(ms)}, ease: ${CURVES[v.curve].motion} }\`, stable keys.`,
      ...(v.compare === 'none'
        ? []
        : [`- Comparison only: a twin row below with ${COMPARE[v.compare].label}, same duration, moved at the same instant.`]),
      '- Reduced motion: no animation; items jump to place.',
    ].join('\n')
  },
  acceptance: (v) => {
    const c = CURVES[v.curve]
    const ms = Number(v.duration)
    return [
      `A moving item's computed \`transition-timing-function\` is \`${c.css}\` and \`transition-duration\` is \`${s(ms)}s\` (CSS route); a move takes ${ms}ms.`,
      `Slow at both ends: at 25% of the duration an item has covered about ${c.p25}% of its distance, at 75% about ${c.p75}%, so the two mirror each other within 2%. To measure, pause the transition (\`const a = el.getAnimations()[0]; a.pause()\`), set \`a.currentTime\` to ${ms / 4} and then ${(ms * 3) / 4}, and read the x of \`new DOMMatrix(getComputedStyle(el).transform)\`.`,
      'Only the transform changes while items move: `offsetLeft` and `offsetTop` never take in-between values.',
      'Starting a new move mid-flight continues from where each item is on screen, with no jump.',
      'Every item that moves starts and lands at the same time.',
      'After a reorder, Tab order and screen reader order match what is on screen.',
      ...(v.compare === 'none'
        ? []
        : [`The comparison row moves at the same instant, and its computed \`transition-timing-function\` is \`${COMPARE[v.compare].css}\`.`]),
      'With reduced motion on, items jump to their new places with no animation.',
    ]
  },
  code: (v) => ({ css: cssCode(v), js: jsCode(v), motion: motionCode(v) }),
  a11y: 'Reorder the DOM, not only the picture, so Tab order and screen readers follow what is on screen, and announce the new position of a moved item in a polite live region. Under reduced motion, skip the animation and let items jump to their new places.',
  related: ['ease-out', 'shared-layout', 'interruptibility', 'duration'],
  sources: [
    { label: 'Emil Kowalski: Good vs Great Animations', url: 'https://emilkowal.ski/ui/good-vs-great-animations' },
    { label: 'easing.dev: easing curves', url: 'https://easing.dev' },
  ],
})
