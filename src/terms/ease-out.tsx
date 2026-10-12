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
      { value: 'quint', label: 'Quint (house)' },
      { value: 'cubic', label: 'Cubic' },
      { value: 'expo', label: 'Expo' },
      { value: 'keyword', label: 'Keyword' },
    ],
    default: 'quint',
  },
  {
    id: 'duration',
    type: 'select',
    label: 'Duration',
    options: [
      { value: '150', label: '150ms' },
      { value: '200', label: '200ms' },
      { value: '300', label: '300ms' },
    ],
    default: '200',
  },
  {
    id: 'compare',
    type: 'select',
    label: 'Compare',
    options: [
      { value: 'none', label: 'None' },
      { value: 'ease-in', label: 'Ease-in' },
      { value: 'linear', label: 'Linear' },
    ],
    default: 'none',
  },
] as const satisfies readonly Control[]

type V = ControlValues<typeof controls>

// `css` is what goes in the stylesheet and what getComputedStyle reports; `motion` is the same curve for Motion.
const CURVES: Record<V['curve'], { css: string; motion: string; name: string }> = {
  quint: { css: 'cubic-bezier(0.23, 1, 0.32, 1)', motion: '[0.23, 1, 0.32, 1]', name: 'ease-out quint, the house --ease-out' },
  cubic: { css: 'cubic-bezier(0.215, 0.61, 0.355, 1)', motion: '[0.215, 0.61, 0.355, 1]', name: 'ease-out cubic' },
  expo: { css: 'cubic-bezier(0.19, 1, 0.22, 1)', motion: '[0.19, 1, 0.22, 1]', name: 'ease-out expo' },
  keyword: { css: 'ease-out', motion: '[0, 0, 0.58, 1]', name: 'the built-in ease-out keyword' },
}
const COMPARE: Record<Exclude<V['compare'], 'none'>, { css: string; motion: string }> = {
  'ease-in': { css: 'cubic-bezier(0.42, 0, 1, 1)', motion: '[0.42, 0, 1, 1]' },
  linear: { css: 'linear', motion: '"linear"' },
}
// Closing runs about 25% faster than opening, rounded down to 10ms.
const EXIT_MS: Record<V['duration'], number> = { '150': 110, '200': 150, '300': 220 }
const PRESS_MS = 150
// Closed time between the end of the exit and the next press, and the open hold before the cycle ends.
const CLOSED_MS = 450
const HOLD_MS = 1100

const s = (ms: number) => ms / 1000

function Menu({ size, ease, label }: { size: DemoProps['size']; ease: string; label?: string }) {
  const detail = size === 'detail'
  return (
    <div className={detail ? 'w-32 sm:w-44' : 'w-28'}>
      {label && <p className={`font-mono text-ink-muted ${detail ? 'mb-2 text-[11px]' : 'mb-1.5 text-[10px]'}`}>{label}</p>}
      <div className="relative">
        <div
          data-trigger=""
          data-pressed="false"
          className={`flex items-center justify-between rounded-md bg-surface shadow-card transition-transform duration-(--p) ease-out group-data-[snap=true]/stage:transition-none data-[pressed=true]:[transform:scale(0.97)] ${detail ? 'h-8 w-24 px-2.5' : 'h-6 w-16 px-2'}`}
        >
          <span className={`h-1.5 rounded-full bg-demo-2 ${detail ? 'w-11' : 'w-7'}`} />
          <span className="size-1.5 rotate-45 border-b border-r border-ink-faint" />
        </div>
        <div
          data-popover=""
          data-open="true"
          style={{ '--e': ease } as CSSProperties}
          className={`absolute inset-x-0 origin-top-left rounded-lg bg-surface p-1 opacity-0 shadow-card [transform:scale(0.95)] transition-[opacity,transform] duration-(--x) ease-(--e) group-data-[snap=true]/stage:transition-none data-[open=true]:opacity-100 data-[open=true]:[transform:none] data-[open=true]:duration-(--d) ${detail ? 'top-10' : 'top-7.5'}`}
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`flex items-center rounded-md ${detail ? 'h-7 gap-2 px-2' : 'h-5 gap-1.5 px-1.5'} ${i === 0 ? 'bg-demo' : ''}`}>
              <span className={`shrink-0 rounded-sm ${i === 0 ? 'bg-demo-subject' : 'bg-demo-2'} ${detail ? 'size-2.5' : 'size-2'}`} />
              <span className={`h-1.5 rounded-full bg-demo-2 ${['w-3/5', 'w-1/2', 'w-2/3', 'w-2/5'][i]}`} />
            </div>
          ))}
        </div>
      </div>
      {/* Room for the open menu, so opening never moves anything else. */}
      <div aria-hidden className={detail ? 'h-32' : 'h-[94px]'} />
    </div>
  )
}

function EaseOutDemo({ values, playing, replayKey, size, timeScale, onCycleEnd }: DemoProps<V>) {
  const rootRef = useRef<HTMLDivElement>(null)
  const enter = Number(values.duration)
  const exit = EXIT_MS[values.duration]

  // One cycle: close (if open), a beat closed, then press and open, and hold open. It ends open, so the still
  // frame, the card loop and a replay all pick up from an open menu, and a replay mid-open closes from where it is.
  useCycle(
    () => {
      const root = rootRef.current
      const all = (selector: string) => [...(root?.querySelectorAll<HTMLElement>(selector) ?? [])]
      const press = (down: boolean) => all('[data-trigger]').forEach((t) => (t.dataset.pressed = String(down)))
      const setOpen = (open: boolean) => {
        const menus = all('[data-popover]')
        if (menus.every((m) => m.dataset.open === String(open))) return
        press(true)
        menus.forEach((m) => (m.dataset.open = String(open)))
      }
      const openAt = exit + CLOSED_MS
      return {
        steps: [
          [0, () => setOpen(false)],
          [PRESS_MS, () => press(false)],
          [openAt, () => setOpen(true)],
          [openAt + PRESS_MS, () => press(false)],
        ],
        endMs: openAt + enter + HOLD_MS,
        still: () => {
          if (!root) return
          snap(root, () => {
            press(false)
            all('[data-popover]').forEach((m) => (m.dataset.open = 'true'))
          })
        },
      }
    },
    { playing, replayKey, timeScale, onCycleEnd },
    `${values.curve}|${values.duration}|${values.compare}`,
  )

  const compare = values.compare === 'none' ? undefined : COMPARE[values.compare]
  const vars = {
    '--d': `${scaled(enter, timeScale)}ms`,
    '--x': `${scaled(exit, timeScale)}ms`,
    '--p': `${scaled(PRESS_MS, timeScale)}ms`,
  } as CSSProperties

  return (
    <div ref={rootRef} style={vars} className={`group/stage flex h-full items-center justify-center ${size === 'detail' ? 'gap-8 sm:gap-16' : 'gap-8'}`}>
      <Menu size={size} ease={CURVES[values.curve].css} label={compare ? 'ease-out' : undefined} />
      {compare && <Menu size={size} ease={compare.css} label={values.compare} />}
    </div>
  )
}

function EaseOutGlyph({ active }: GlyphProps) {
  return (
    <GlyphSvg kind="ease-out" active={active}>
      <circle className="m" cx="6" cy="6" r="1.5" fill="currentColor" />
    </GlyphSvg>
  )
}

function curveText(v: V) {
  const c = CURVES[v.curve]
  if (v.curve === 'quint') return '`var(--ease-out)` (`cubic-bezier(0.23, 1, 0.32, 1)`)'
  if (v.curve === 'keyword') return '`ease-out` keyword (comparison only; ship `cubic-bezier(0.23, 1, 0.32, 1)`)'
  return `\`${c.css}\` (${c.name})`
}

function cssCode(v: V): string {
  const enter = Number(v.duration)
  const exit = EXIT_MS[v.duration]
  const timing =
    v.curve === 'quint'
      ? '  transition-timing-function: var(--ease-out);'
      : v.curve === 'keyword'
        ? [
            '  /* The built-in keyword is cubic-bezier(0, 0, 0.58, 1): a tenth of the way',
            '     in it has covered 16% of the distance, the house curve 40%. */',
            '  transition-timing-function: ease-out;',
          ].join('\n')
        : `  transition-timing-function: ${CURVES[v.curve].css}; /* ${CURVES[v.curve].name} */`
  const compare =
    v.compare === 'ease-in'
      ? [
          '',
          '/* Comparison only; do not ship ease-in on UI. The same menu with a slow',
          '   start: the first frames barely move, so the click feels ignored. */',
          '.menu.compare {',
          `  transition-timing-function: ${COMPARE['ease-in'].css}; /* ease-in */`,
          '}',
        ]
      : v.compare === 'linear'
        ? [
            '',
            '/* Comparison only. Constant speed: no quick start, and it stops abruptly',
            '   instead of settling. */',
            '.menu.compare {',
            '  transition-timing-function: linear;',
            '}',
          ]
        : []
  return [
    ...(v.curve === 'quint'
      ? [
          '/* Ease-out: fast start, long settle. The fast start is the feedback: the',
          '   menu visibly answers the click in the first frames. */',
          ':root {',
          '  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);',
          '}',
          '',
        ]
      : []),
    '/* Stays mounted while closed so it can animate out. Add `inert` while closed:',
    '   out of the tab order and the accessibility tree. */',
    '.menu {',
    '  /* Grow out of the trigger, not the center. With Radix:',
    '     var(--radix-popper-transform-origin); Base UI: var(--transform-origin). */',
    '  transform-origin: top left;',
    '  opacity: 0;',
    '  transform: scale(0.95); /* a visible shape from the first frame, never 0 */',
    '  pointer-events: none;',
    '  /* Closing values live here, opening values on [data-open]: each direction',
    '     uses the duration of the state it is heading to. */',
    '  transition-property: opacity, transform;',
    `  transition-duration: ${exit}ms; /* close: about 25% faster */`,
    timing,
    '}',
    '',
    '/* A transition, not keyframes: closing mid-open reverses from where it is. */',
    '.menu[data-open="true"] {',
    '  opacity: 1;',
    '  transform: none;',
    '  pointer-events: auto;',
    `  transition-duration: ${enter}ms;`,
    '}',
    ...compare,
    '',
    '/* Reduced motion: fade only, no change in size. */',
    '@media (prefers-reduced-motion: reduce) {',
    '  .menu { transform: none; }',
    '}',
  ].join('\n')
}

function motionCode(v: V): string {
  const ease = CURVES[v.curve].motion
  return [
    "import { AnimatePresence, motion, useReducedMotion } from 'motion/react'",
    "import type { ReactNode } from 'react'",
    '',
    `// ${CURVES[v.curve].name[0].toUpperCase()}${CURVES[v.curve].name.slice(1)}: ${ease}.`,
    ...(v.curve === 'keyword' ? ['// Weak on purpose here; the house curve is [0.23, 1, 0.32, 1].'] : []),
    ...(v.compare === 'ease-in'
      ? ['// For the comparison menu, swap both eases for [0.42, 0, 1, 1] (ease-in).', '// Comparison only; do not ship ease-in on UI.']
      : v.compare === 'linear'
        ? ["// For the comparison menu, swap both eases for 'linear'. Comparison only."]
        : []),
    'export function Menu({ open, children }: { open: boolean; children: ReactNode }) {',
    '  // Reduced motion: fade only.',
    '  const from = useReducedMotion() ? 1 : 0.95',
    '  return (',
    '    <AnimatePresence>',
    '      {open && (',
    '        <motion.div',
    '          role="menu"',
    '          // Grow out of the trigger: here, a menu below a left-aligned button.',
    "          style={{ transformOrigin: 'top left' }}",
    '          initial={{ opacity: 0, scale: from }}',
    `          animate={{ opacity: 1, scale: 1, transition: { duration: ${s(Number(v.duration))}, ease: ${ease} } }}`,
    '          // Closing runs about 25% faster. Reopened mid-exit, it animates back',
    '          // from its current values instead of restarting.',
    `          exit={{ opacity: 0, scale: from, transition: { duration: ${s(EXIT_MS[v.duration])}, ease: ${ease} } }}`,
    '        >',
    '          {children}',
    '        </motion.div>',
    '      )}',
    '    </AnimatePresence>',
    '  )',
    '}',
  ].join('\n')
}

export default defineTerm({
  slug: 'ease-out',
  name: 'Ease-out',
  category: 'motion',
  order: 1,
  status: 'review',
  definition: 'Motion that starts fast and slows into place, the default for anything responding to the user.',
  aliases: ['starts fast and slows down', 'decelerate', 'snappy entrance', 'ease out', 'deceleration curve'],
  description:
    'Ease-out is a timing curve that covers most of the distance early and spends the rest of the time settling. On something entering, that fast start means it visibly answers the click within the first frames, so the interface feels quick even at 200ms. The built-in CSS ease-out keyword is too gentle for this: a tenth of the way through it has covered 16% of the distance, where the house curve, cubic-bezier(0.23, 1, 0.32, 1), has covered 40%.',
  useWhen: [
    'Anything entering or leaving: menus, popovers, dialogs, tooltips, toasts.',
    'Anything answering a click or tap, like a panel opening or a pressed button.',
    'When you are unsure which curve to use.',
  ],
  avoidWhen: [
    'Elements already on screen moving from A to B, like a reorder or a sliding tab indicator. Use ease-in-out.',
    'Constant-rate motion, like a marquee, a spinner or progress that is time. Use linear.',
    'Never ease-in on its own for UI: the slow start makes every click feel late.',
  ],
  demo: {
    component: EaseOutDemo,
    label:
      'A button is pressed and a menu opens below it, growing from 95% size and fading in from the corner next to the button, fast at first and then settling. It holds, then closes a little faster. With a comparison picked, a second menu opens beside it at the same instant with ease-in or linear.',
    controls,
    glyph: EaseOutGlyph,
  },
  prompt: (v) => {
    const enter = Number(v.duration)
    const exit = EXIT_MS[v.duration]
    return [
      'Animate this menu open and closed.',
      '',
      `- Open: \`opacity\` 0 to 1, \`transform: scale(0.95)\` to \`none\`, ${enter}ms ${curveText(v)}.`,
      `- Close: back to \`opacity: 0; transform: scale(0.95)\`, ${exit}ms, same curve.`,
      '- `transition-property: opacity, transform` only, toggled by `data-open`. Transitions, not keyframes: closing mid-open reverses from the current state.',
      '- `transform-origin` at the trigger: `top left` for a menu below a left-aligned trigger, or the library variable (`--radix-popper-transform-origin`, Base UI `--transform-origin`).',
      '- Closed: stays mounted, `inert`, `pointer-events: none`.',
      `- Motion: \`AnimatePresence\`; \`initial\`/\`exit\` \`{ opacity: 0, scale: 0.95 }\`, \`animate\` \`{ opacity: 1, scale: 1 }\`; \`ease: ${CURVES[v.curve].motion}\`, ${s(enter)}s in, ${s(exit)}s out.`,
      ...(v.compare === 'ease-in'
        ? ['- Comparison only; do not ship ease-in on UI: a second menu beside it with `cubic-bezier(0.42, 0, 1, 1)` (`ease-in`), same durations, toggled at the same instant.']
        : v.compare === 'linear'
          ? ['- Comparison only: a second menu beside it with `linear`, same durations, toggled at the same instant.']
          : []),
      '- Reduced motion: no scale; opacity only, same durations.',
    ].join('\n')
  },
  acceptance: (v) => {
    const enter = Number(v.duration)
    const exit = EXIT_MS[v.duration]
    return [
      `Open, the menu's computed \`transition-timing-function\` is \`${CURVES[v.curve].css}\` and \`transition-duration\` is \`${s(enter)}s\` (CSS route).`,
      `Closed, its computed \`transition-duration\` is \`${s(exit)}s\`: closing takes ${exit}ms, no more than 75% of opening (CSS route).`,
      'Opening starts at 95% size and opacity 0, never from `scale(0)`.',
      'The menu grows out of the trigger: the corner next to the trigger stays put while it scales.',
      'Closing while it is still opening reverses from its current size and opacity, without first jumping to fully open.',
      'Toggling it ten times quickly leaves at most two running animations on the menu (`menu.getAnimations().length <= 2`).',
      'Closed, the menu cannot be clicked, focused or reached by a screen reader.',
      ...(v.compare === 'none'
        ? []
        : [`The comparison menu opens at the same instant, and its computed \`transition-timing-function\` is \`${COMPARE[v.compare].css}\`.`]),
      'With reduced motion on, the menu fades in and out without changing size.',
    ]
  },
  code: (v) => ({ css: cssCode(v), motion: motionCode(v) }),
  a11y: 'Keep the closed menu out of the tab order and the accessibility tree with inert, or unmount it once the exit ends. When it opens from the keyboard, move focus into it, and return focus to the trigger when it closes. Under reduced motion, drop the scale and keep a short fade, so the menu still appears without moving.',
  related: ['ease-in-out', 'duration', 'origin-aware', 'spring'],
  confusedWith: [
    {
      slug: 'ease-in-out',
      difference:
        'Ease-out starts fast and settles; use it for things entering or reacting. Ease-in-out speeds up then slows; use it for things already on screen moving from A to B.',
    },
  ],
  sources: [
    { label: 'Emil Kowalski: Good vs Great Animations', url: 'https://emilkowal.ski/ui/good-vs-great-animations' },
    { label: 'easing.dev: easing curves', url: 'https://easing.dev' },
  ],
})
