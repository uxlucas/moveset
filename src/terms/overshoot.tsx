import { spring } from 'motion/react'
import { useRef, type CSSProperties } from 'react'
import { scaled } from '@/components/demo/playback'
import { snap, useCycle } from '@/components/demo/use-cycle'
import { GlyphSvg } from '@/components/site/glyph'
import { defineTerm, type Control, type ControlValues, type DemoProps, type GlyphProps } from '@/lib/term-types'

const controls = [
  {
    id: 'amount',
    type: 'select',
    label: 'Amount',
    options: [
      { value: '0', label: '0' },
      { value: '3', label: '3%' },
      { value: '8', label: '8% (strong)' },
      { value: '15', label: '15% (cartoon)' },
    ],
    default: '3',
  },
  {
    id: 'source',
    type: 'select',
    label: 'Source',
    options: [
      { value: 'curve', label: 'Back curve' },
      { value: 'spring', label: 'Spring' },
    ],
    default: 'curve',
  },
  {
    id: 'compare',
    type: 'select',
    label: 'Compare',
    options: [
      { value: 'none', label: 'None' },
      { value: 'plain', label: 'No overshoot' },
    ],
    default: 'none',
  },
] as const satisfies readonly Control[]

type V = ControlValues<typeof controls>
type Amount = V['amount']

/**
 * Each amount as a back curve and as a spring, both measured as a share of the distance travelled.
 * `y1`: the first y of `cubic-bezier(0.34, y1, 0.64, 1)`; a bezier's peak depends only on its y values, and these
 * peak at 3.0, 8.0 and 15.0%. `bounce`: the Motion spring bounce with the matching overshoot; a spring's peak is
 * exp(-ζπ / √(1 - ζ²)) with ζ = 1 - bounce, so 0.25, 0.37 and 0.48 go 2.8, 7.8 and 14.8% past (overshoot.test.ts).
 * The house caps bounce at 0.3, about 4.6%.
 */
export const AMOUNTS: Record<Amount, { y1: number | null; bounce: number; springPeak: number }> = {
  '0': { y1: null, bounce: 0, springPeak: 0 },
  '3': { y1: 1.3, bounce: 0.25, springPeak: 2.8 },
  '8': { y1: 1.5, bounce: 0.37, springPeak: 7.8 },
  '15': { y1: 1.72, bounce: 0.48, springPeak: 14.8 },
}
const BOUNCE_CAP = 0.3

const EASE_OUT = { css: 'cubic-bezier(0.23, 1, 0.32, 1)', motion: '[0.23, 1, 0.32, 1]' }
export const ENTER_MS = 300
// The return is plain and about 25% faster: overshoot marks an arrival, never a departure.
const RETURN_MS = 225
// The distance the prompt and code use; the demo moves three chip widths.
const TRAVEL = 240
// One point every 5ms: the 15% spring turns at its peak in under 90ms, and coarser sampling cuts the peak short.
export const POINTS = 61

// Empty beat at the start before the arrival, and the hold once it has settled.
const REST_MS = 400
const HOLD_MS = 1100

const s = (ms: number) => ms / 1000

export function bezier(amount: Amount): { css: string; motion: string } {
  const { y1 } = AMOUNTS[amount]
  if (y1 === null) return EASE_OUT
  return { css: `cubic-bezier(0.34, ${y1}, 0.64, 1)`, motion: `[0.34, ${y1}, 0.64, 1]` }
}

/** The spring for this amount, sampled into a CSS linear() easing over ENTER_MS by Motion's own spring generator. */
export function springPoints(amount: Amount): string[] {
  const gen = spring({ keyframes: [0, 1], duration: ENTER_MS, bounce: AMOUNTS[amount].bounce })
  return Array.from({ length: POINTS }, (_, i) =>
    i === POINTS - 1 ? '1' : String(Math.round(gen.next((ENTER_MS * i) / (POINTS - 1)).value * 1000) / 1000),
  )
}

const timing = (v: V) => (v.source === 'spring' ? `linear(${springPoints(v.amount).join(', ')})` : bezier(v.amount).css)

// The chip is a fixed share of the track: one chip width, three widths of travel, room for 15% past the slot.
const SHARE = 4.6

function Track({ size, ease, label, twin }: { size: DemoProps['size']; ease: string; label?: string; twin?: boolean }) {
  const detail = size === 'detail'
  const pad = detail ? 6 : 4
  const box: CSSProperties = { left: pad, top: pad, height: detail ? 48 : 32, width: `calc((100% - ${2 * pad}px) / ${SHARE})` }
  return (
    <div className="w-full" style={{ maxWidth: detail ? 440 : 240 }}>
      {label && <p className={`font-mono text-ink-muted ${detail ? 'mb-2 text-[11px]' : 'mb-1.5 text-[10px]'}`}>{label}</p>}
      <div className="relative rounded-xl bg-demo" style={{ height: (detail ? 48 : 32) + 2 * pad }}>
        {/* The target: an empty slot three chip widths along, so passing it and settling back reads at a glance. */}
        <span
          aria-hidden
          data-overshoot-target=""
          className="absolute rounded-lg border border-dashed border-line-strong [transform:translateX(300%)]"
          style={box}
        />
        {/* Heading to the slot (`data-at=b`) it takes the overshooting timing, --d; heading home, plain ease-out, --x. */}
        <div
          data-overshoot-chip={twin ? 'twin' : 'main'}
          data-at="b"
          style={{ ...box, '--e': ease } as CSSProperties}
          className={`absolute flex items-center rounded-lg bg-surface shadow-card transition-[transform] duration-(--x) ease-out data-[at=b]:duration-(--d) data-[at=b]:ease-(--e) data-[at=b]:[transform:translateX(300%)] group-data-[snap=true]/stage:transition-none ${detail ? 'gap-2 px-2.5' : 'gap-1.5 px-1.5'}`}
        >
          <span className={`shrink-0 rounded-sm ${twin ? 'bg-demo-2' : 'bg-demo-subject'} ${detail ? 'size-3.5' : 'size-2.5'}`} />
          <span className="h-1.5 min-w-0 flex-1 rounded-full bg-demo-2" />
        </div>
      </div>
    </div>
  )
}

function OvershootDemo({ values, playing, replayKey, size, timeScale, onCycleEnd }: DemoProps<V>) {
  const rootRef = useRef<HTMLDivElement>(null)

  // One cycle: home (plain and quick, a no-op unless it is in the slot), a beat, then into the slot with the
  // overshoot, and a hold. It ends in the slot, so the still frame, the card loop and a replay start from there.
  useCycle(
    () => {
      const root = rootRef.current
      const place = (at: 'a' | 'b') => root?.querySelectorAll<HTMLElement>('[data-overshoot-chip]').forEach((el) => (el.dataset.at = at))
      const goAt = RETURN_MS + REST_MS
      return {
        steps: [
          [0, () => place('a')],
          [goAt, () => place('b')],
        ],
        endMs: goAt + ENTER_MS + HOLD_MS,
        still: () => {
          if (root) snap(root, () => place('b'))
        },
      }
    },
    { playing, replayKey, timeScale, onCycleEnd },
    `${values.amount}|${values.source}|${values.compare}`,
  )

  const compare = values.compare === 'plain'
  const detail = size === 'detail'
  const vars = { '--d': `${scaled(ENTER_MS, timeScale)}ms`, '--x': `${scaled(RETURN_MS, timeScale)}ms` } as CSSProperties
  return (
    <div ref={rootRef} style={vars} className={`group/stage flex h-full flex-col items-center justify-center px-4 ${detail ? 'gap-6' : 'gap-4'}`}>
      <Track size={size} ease={timing(values)} label={compare ? `${values.amount}% overshoot` : undefined} />
      {compare && <Track size={size} ease={EASE_OUT.css} label="no overshoot" twin />}
    </div>
  )
}

function OvershootGlyph({ active }: GlyphProps) {
  return (
    <GlyphSvg kind="overshoot" active={active}>
      <rect x="7.6" y="3" width=".8" height="6" rx=".4" fill="currentColor" opacity=".35" />
      <circle className="m" cx="4" cy="6" r="1.5" fill="currentColor" />
    </GlyphSvg>
  )
}

const overCap = (v: V) => AMOUNTS[v.amount].bounce > BOUNCE_CAP

function moveText(v: V): string {
  const a = AMOUNTS[v.amount]
  if (v.source === 'spring') {
    const spec = `\`{ type: "spring", duration: ${s(ENTER_MS)}, bounce: ${a.bounce} }\``
    if (v.amount === '0') return `${spec}: it never passes the target`
    return `${spec}${overCap(v) ? ` (over the house ${BOUNCE_CAP} bounce cap)` : ''}: about ${a.springPeak}% of the travel past the target`
  }
  if (v.amount === '0') return '`var(--ease-out)` (`cubic-bezier(0.23, 1, 0.32, 1)`): it never passes the target'
  const caveat = { '3': '', '8': ' (above the 2 to 5% product range)', '15': ' (cartoon; product UI stays at 2 to 5%)' }[v.amount]
  return `\`${bezier(v.amount).css}\`: ${v.amount}% of the travel past the target${caveat}`
}

function cssCode(v: V): string {
  const a = AMOUNTS[v.amount]
  const arrival =
    v.source === 'spring'
      ? (() => {
          const points = springPoints(v.amount)
          const rows: string[] = []
          for (let i = 0; i < points.length; i += 10) rows.push(`    ${points.slice(i, i + 10).join(', ')}${i + 10 < points.length ? ',' : ''}`)
          return [
            `  /* The spring { type: "spring", duration: ${s(ENTER_MS)}, bounce: ${a.bounce} }, sampled`,
            `     into linear() with Motion's spring() generator: ${a.bounce === 0 ? 'it never passes the target' : `about ${a.springPeak}% past, then settled`}. */`,
            '  --arrive: linear(',
            ...rows,
            '  );',
          ]
        })()
      : v.amount === '0'
        ? ['  --arrive: cubic-bezier(0.23, 1, 0.32, 1); /* no overshoot */']
        : [
            `  /* A back curve: y1 above 1 carries it ${v.amount}% of the travel past the`,
            '     target before it settles. 3% is cubic-bezier(0.34, 1.3, 0.64, 1), 8%',
            '     (0.34, 1.5, 0.64, 1), 15% (0.34, 1.72, 0.64, 1). The common easeOutBack,',
            '     (0.34, 1.56, 0.64, 1), goes about 10% past. */',
            `  --arrive: ${bezier(v.amount).css};`,
          ]
  return [
    ':root {',
    '  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);',
    ...arrival,
    '}',
    '',
    '/* Markup: <button class="chip" aria-pressed="false">…</button>. On click,',
    '   toggle data-placed and aria-pressed. A curve with y above 1 would push',
    '   any property past its end, so keep it on transform: opacity clamps at 1',
    '   (the fade just ends early), and layout properties relayout every frame. */',
    '.chip {',
    '  transition-property: transform;',
    '  /* A transition takes the timing of the state it heads to. Going home:',
    `     plain ease-out, ${RETURN_MS}ms, no overshoot. */`,
    `  transition-duration: ${RETURN_MS}ms;`,
    '  transition-timing-function: var(--ease-out);',
    '}',
    '.chip[data-placed] {',
    `  transform: translateX(${TRAVEL}px);`,
    `  transition-duration: ${ENTER_MS}ms;`,
    '  transition-timing-function: var(--arrive);',
    '}',
    ...(v.compare === 'plain'
      ? ['', '/* Comparison only: the twin arrives on plain ease-out and stops at the', '   target without passing it. */', '.chip.compare[data-placed] {', '  transition-timing-function: var(--ease-out);', '}']
      : []),
    '',
    '/* A click from the keyboard lands at once: in the click handler, set',
    '   data-instant when event.detail === 0 (Enter or Space), remove it otherwise. */',
    '.chip[data-instant] {',
    '  transition-property: none;',
    '}',
    '',
    '/* Reduced motion: no overshoot and no travel; it is in place at once. */',
    '@media (prefers-reduced-motion: reduce) {',
    '  .chip {',
    '    transition-property: none;',
    '  }',
    '}',
  ].join('\n')
}

function motionCode(v: V): string {
  const a = AMOUNTS[v.amount]
  const arrive =
    v.source === 'spring'
      ? `{ type: 'spring', duration: ${s(ENTER_MS)}, bounce: ${a.bounce} } as const`
      : `{ duration: ${s(ENTER_MS)}, ease: ${bezier(v.amount).motion} } as const`
  return [
    "import { motion, useReducedMotion } from 'motion/react'",
    "import { useState, type MouseEvent } from 'react'",
    '',
    `// Arriving: ${v.amount === '0' ? 'no overshoot' : `about ${v.source === 'spring' ? a.springPeak : v.amount}% of the travel past the target, then settled`}.`,
    `const arrive = ${arrive}`,
    '// Going home: plain ease-out, faster, no overshoot.',
    `const leave = { duration: ${s(RETURN_MS)}, ease: [0.23, 1, 0.32, 1] } as const`,
    ...(v.compare === 'plain'
      ? [`// Comparison only: the twin arrives on { duration: ${s(ENTER_MS)}, ease: [0.23, 1, 0.32, 1] }.`]
      : []),
    '',
    'export function Chip() {',
    '  const [placed, setPlaced] = useState(false)',
    '  const [instant, setInstant] = useState(false)',
    '  const reduced = useReducedMotion()',
    '',
    '  const toggle = (event: MouseEvent) => {',
    '    // A click from the keyboard (Enter or Space report detail 0) lands at once.',
    '    setInstant(event.detail === 0)',
    '    setPlaced(!placed)',
    '  }',
    '',
    '  return (',
    '    <motion.button',
    '      type="button"',
    '      className="overshoot-chip"',
    '      aria-pressed={placed}',
    '      onClick={toggle}',
    '      // No animation on mount: it starts where it is.',
    '      initial={false}',
    '      // x is transform only. Never animate opacity or a layout property on this curve.',
    `      animate={{ x: placed ? ${TRAVEL} : 0 }}`,
    '      // Reduced motion or a keyboard click: no animated travel. Chosen in the same',
    '      // render as x, so the move never runs on the previous transition.',
    '      transition={reduced || instant ? { duration: 0 } : placed ? arrive : leave}',
    '    />',
    '  )',
    '}',
  ].join('\n')
}

export default defineTerm({
  slug: 'overshoot',
  name: 'Overshoot',
  category: 'motion',
  order: 6,
  status: 'published',
  definition: 'Motion that travels slightly past its target before settling back, giving a small sense of energy.',
  aliases: ['bounce-in', 'back easing', 'goes a bit past and comes back', 'elastic', 'pop in', 'easeOutBack'],
  description:
    'Overshoot carries an element a little past its target before it settles back, so the arrival has some energy, like a ball that rolls a touch too far. It comes from a back curve, a cubic-bezier whose first y value is above 1, or from a spring with bounce: bounce is the setting, overshoot is what you see, and a bounce of 0 never overshoots. The amount is a share of the distance travelled, so the same curve reads stronger on a long move than a short one. Around 2 to 5% reads as life; more reads as a cartoon.',
  useWhen: [
    'Playful, physical arrivals: a like, a toggle knob, a card released into its slot after a drag.',
    'Success states and rare first-time moments, like finishing onboarding.',
  ],
  avoidWhen: [
    'Dialogs, menus, popovers and icon swaps. A wobble on something that informs or interrupts reads as unsteady; use ease-out.',
    'Anything used often or meant to feel precise, like a slider thumb, a tab indicator or a drag that follows the finger.',
    'Exits and returns. Overshoot marks an arrival; leaving stays plain and faster.',
    'Text and opacity. Text that wobbles is hard to read, and opacity clamps at 1, so an overshooting fade just ends early.',
    'More than about 5% in product UI, or any spring bounce over 0.3.',
    'Changes from the keyboard. Do not animate them.',
  ],
  demo: {
    component: OvershootDemo,
    label:
      'A chip sits in an empty slot at the far end of a track. It slides back to the start, plain and quick, then slides into the slot again, travels slightly past it and settles back in place. The amount runs from none to 15%, from a back curve or a spring. With a comparison picked, a twin chip below makes the same move on plain ease-out and stops at the slot without passing it.',
    controls,
    glyph: OvershootGlyph,
  },
  prompt: (v) => {
    const route =
      v.source === 'spring'
        ? `- CSS route: \`[data-placed]\` (at the target) holds the arrival, \`${ENTER_MS}ms linear(…)\` with a point every 5ms or closer, sampled from that spring (\`spring({ duration: ${ENTER_MS}, bounce: ${AMOUNTS[v.amount].bounce} }).next(t).value\` from \`motion\`, last point 1); the base rule holds the return. Motion route: \`animate={{ x }}\`, \`initial={false}\`, the spring as \`transition\` on the way in.`
        : `- CSS route: \`[data-placed]\` (at the target) holds the arrival (${ENTER_MS}ms, the curve above); the base rule holds the return. Motion route: \`animate={{ x }}\`, \`initial={false}\`, \`{ duration: ${s(ENTER_MS)}, ease: ${bezier(v.amount).motion} }\` on the way in.`
    const opener = {
      '0': 'Move this element into place, with no overshoot.',
      '3': 'Give this element a slight overshoot when it arrives.',
      '8': 'Give this element a clear overshoot when it arrives.',
      '15': 'Give this element a strong, cartoon overshoot when it arrives.',
    }[v.amount]
    return [
      opener,
      '',
      `- Setup: a \`<button type="button">\`; each click toggles it between its start (\`translateX(0)\`) and its target (\`translateX(${TRAVEL}px)\`, the travel) and sets \`aria-pressed\`.`,
      `- Arrival: \`transform\` only, ${ENTER_MS}ms, ${moveText(v)}; settled on the target by ${ENTER_MS}ms from the first animated frame.`,
      `- Return: ${RETURN_MS}ms \`cubic-bezier(0.23, 1, 0.32, 1)\` (ease-out), no overshoot.`,
      route,
      `- Only \`transform\` (translate or scale) takes the ${v.source === 'spring' ? 'spring' : 'curve'}: never \`opacity\` (it clamps at 1) or layout properties. Not on exits, dialogs, menus or text.`,
      ...(v.compare === 'plain' ? [`- Comparison only: a twin below on \`${EASE_OUT.css}\`, ${ENTER_MS}ms, same instants; it never passes the target.`] : []),
      '- Keyboard click (`event.detail === 0`) or reduced motion: no animated travel; at the target next frame. CSS: set `data-instant` from `event.detail === 0`, `[data-instant] { transition-property: none }` after the placed rule, plus `@media (prefers-reduced-motion: reduce)`; Motion: `useReducedMotion()`, `duration: 0` chosen in the same render as `x`.',
    ].join('\n')
  },
  acceptance: (v) => {
    const a = AMOUNTS[v.amount]
    const peak = v.source === 'spring' ? a.springPeak : Number(v.amount)
    const px = Math.round((TRAVEL * peak) / 10) / 10
    return [
      v.amount === '0'
        ? `Sampled every frame on the way to the target, \`x\` never passes it: at most ${TRAVEL}.5px.`
        : v.source === 'spring'
          ? `Sampled every frame on the way to the target, \`x\`'s highest point is ${TRAVEL} × ${(1 + peak / 100).toFixed(3)} = ${TRAVEL + px}px (±1% of the travel, ±${TRAVEL / 100}px); any later swing stays under 1px past the target.`
          : `Sampled every frame on the way to the target, \`x\` peaks once at ${TRAVEL} × ${(1 + peak / 100).toFixed(3)} = ${TRAVEL + px}px (±1% of the travel, ±${TRAVEL / 100}px), then settles.`,
      `By ${ENTER_MS}ms from the first animated frame, \`x\` is within 0.5px of ${TRAVEL}px and stays there.`,
      `Returning, \`x\` never goes below -0.5px and is home by ${RETURN_MS}ms: no overshoot on the way back.`,
      'Only `transform` changes: `opacity` stays put and `offsetLeft` never changes.',
      ...(v.compare === 'plain'
        ? [`The comparison element moves at the same instants on \`${EASE_OUT.css}\` and never passes the target (comparison only).`]
        : []),
      'Activated with Enter or Space, or with reduced motion on, the element is painted at its target in the first frame after the event, with no in-between positions.',
    ]
  },
  code: (v) => ({ css: cssCode(v), motion: motionCode(v) }),
  a11y: 'Overshoot is extra movement, so under reduced motion drop it along with the travel: put the element at its target at once, or for something entering, fade it in over 150ms. Changes made from the keyboard land at once too. Update the state (`aria-pressed`, checked) on the click, not when the motion settles.',
  related: ['spring', 'ease-out', 'press-scale', 'icon-swap'],
  sources: [
    { label: 'index.how: Say precisely what you mean', url: 'https://index.how/to/articulate' },
    { label: 'Easings: cubic-bezier curves', url: 'https://easings.co' },
    { label: 'Motion: spring', url: 'https://motion.dev/docs/spring' },
  ],
})
