import { Archive, CalendarDays, Folder, Inbox, Settings, Sun, type LucideIcon } from 'lucide-react'
import { useRef } from 'react'
import { scaled } from '@/components/demo/playback'
import { snap, useCycle } from '@/components/demo/use-cycle'
import { GlyphSvg } from '@/components/site/glyph'
import { defineTerm, type Control, type ControlValues, type DemoProps, type GlyphProps } from '@/lib/term-types'

const controls = [
  {
    id: 'delay',
    type: 'select',
    label: 'Delay',
    options: [
      { value: '30', label: '30ms' },
      { value: '60', label: '60ms' },
      { value: '100', label: '100ms (slow)' },
    ],
    default: '60',
  },
  {
    id: 'order',
    type: 'select',
    label: 'Order',
    options: [
      { value: 'forward', label: 'Forward' },
      { value: 'reverse', label: 'Reverse' },
      { value: 'center', label: 'Center out' },
    ],
    default: 'forward',
  },
  {
    id: 'compare',
    type: 'select',
    label: 'Compare',
    options: [
      { value: 'none', label: 'None' },
      { value: 'all', label: 'All at once' },
    ],
    default: 'none',
  },
] as const satisfies readonly Control[]

type V = ControlValues<typeof controls>

const COUNT = 6
// The longest wait is this many steps: items past it start with it.
const CAP = 6
const ENTER_MS = 300
// Exits are quieter: all at once, half the time, a few pixels of travel.
const EXIT_MS = 150
// Empty between the exit and the cascade, and the hold once every item is in.
const GAP_MS = 350
const HOLD_MS = 1000

/** Each item's step, by position in the list. Center out counts from the middle pair. */
function steps(order: V['order'], count = COUNT): number[] {
  return Array.from({ length: count }, (_, i) => {
    if (order === 'reverse') return count - 1 - i
    if (order === 'center') return Math.floor(Math.abs(i - (count - 1) / 2))
    return i
  })
}

const LINE = ['w-3/4', 'w-1/2', 'w-2/3', 'w-2/5', 'w-3/5', 'w-1/2']
// The entry page's rows: a task app's sidebar, the first row the current one. The card draws the same six rows as bars.
const ROWS: { Icon: LucideIcon; label: string }[] = [
  { Icon: Inbox, label: 'Inbox' },
  { Icon: Sun, label: 'Today' },
  { Icon: CalendarDays, label: 'Upcoming' },
  { Icon: Folder, label: 'Projects' },
  { Icon: Archive, label: 'Archive' },
  { Icon: Settings, label: 'Settings' },
]

// The exit belongs to the list, never to the items: an item still waiting to enter must not show. Leaving, the list
// fades and lifts as one over --x (a transition takes the duration of the state it heads to); any other phase puts it
// back at once.
const LIST =
  'flex flex-col transition-[opacity,transform] duration-0 ease-(--ease-out) group-data-[phase=leave]/stage:duration-(--x) group-data-[phase=leave]/stage:opacity-0 group-data-[phase=leave]/stage:[transform:translateY(-4px)] group-data-[phase=out]/stage:duration-(--x) group-data-[phase=out]/stage:opacity-0 group-data-[phase=out]/stage:[transform:translateY(-4px)]'
// A one-shot entrance, so keyframes: `both` holds the hidden frame through the delay. The item keeps its space the
// whole time. Leaving mid-cascade, each item freezes where it is while the list fades. Its step (`--n`, `data-n`) is
// written by the cycle, not rendered: see StaggerDemo.
const ITEM =
  'flex items-center [animation-delay:calc(var(--n)*var(--step))] [animation-duration:var(--d)] [animation-fill-mode:both] [animation-timing-function:var(--ease-out)] group-data-[phase=in]/stage:[animation-name:demo-stagger-in] group-data-[phase=leave]/stage:[animation-name:demo-stagger-in] group-data-[phase=leave]/stage:[animation-play-state:paused]'

function List({ size, label, kind }: { size: DemoProps['size']; label?: string; kind: 'stagger' | 'all' }) {
  const detail = size === 'detail'
  return (
    <div data-list={kind} className={detail ? 'w-[136px] sm:w-52' : 'w-[104px]'}>
      {label && <p className={`font-mono text-ink-muted ${detail ? 'mb-2 text-[11px]' : 'mb-1.5 text-[10px]'}`}>{label}</p>}
      {detail ? (
        // The sidebar panel stays while its rows leave and cascade back in; the rows keep the card's 28px height.
        <div className="rounded-xl bg-surface p-1.5 shadow-card">
          <ul data-stagger-list="" className={`${LIST} gap-1`}>
            {ROWS.map(({ Icon, label }, i) => (
              <li key={label} data-stagger-item="" className={`${ITEM} h-7 gap-2.5 rounded-md px-2 ${i === 0 ? 'bg-demo' : ''}`}>
                <Icon size={16} aria-hidden className="shrink-0 text-ink-muted" />
                <span className="text-[13px] leading-5 text-ink">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul data-stagger-list="" className={`${LIST} gap-1`}>
          {LINE.map((line, i) => (
            <li key={i} data-stagger-item="" className={`${ITEM} h-[18px] gap-1.5 rounded-lg bg-surface px-1.5 shadow-card`}>
              <span className={`size-2 shrink-0 rounded-sm ${kind === 'stagger' ? 'bg-demo-subject' : 'bg-demo-2'}`} />
              <span className={`h-1.5 rounded-full bg-demo-2 ${line}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StaggerDemo({ values, playing, replayKey, size, timeScale, onCycleEnd }: DemoProps<V>) {
  const rootRef = useRef<HTMLDivElement>(null)
  const delay = Number(values.delay)
  const n = steps(values.order)

  // One cycle: the list leaves as one, a beat empty, then the cascade, and a hold with all items in. The still frame is
  // all items in, so the card loop, a replay and reduced motion all start from a full list.
  // Phases: `out` leaves from the still frame (items have no animation, all in); `leave` leaves from a cascade, so the
  // items keep their entrance, paused where it is; `in` restarts the entrance. Just before it, `reset` (set and cleared
  // in the same task, never painted) drops the old animation, since the same keyframes name would not replay, and puts
  // the list back in place in the same flip.
  // The timing the items run on (`--n`, `--step`, `--d`) is written here, never rendered: a control change re-renders
  // at once, and new timing on a paused entrance would re-time it in the frame the list is still fully visible. So the
  // leaving cycle keeps the old values until `in` (or the still frame) writes the new ones. `--x`, the list's exit, is
  // written as the exit starts.
  useCycle(
    () => {
      const root = rootRef.current
      const phase = (p: 'still' | 'in' | 'out' | 'leave' | 'reset') => {
        if (root) root.dataset.phase = p
      }
      const timing = () => {
        if (!root) return
        root.style.setProperty('--step', `${scaled(delay, timeScale)}ms`)
        root.style.setProperty('--d', `${scaled(ENTER_MS, timeScale)}ms`)
        for (const list of root.querySelectorAll<HTMLElement>('[data-list]')) {
          list.querySelectorAll<HTMLElement>('[data-stagger-item]').forEach((item, i) => {
            const k = list.dataset.list === 'all' ? 0 : n[i]
            item.style.setProperty('--n', String(k))
            item.dataset.n = String(k)
          })
        }
      }
      const exit = () => root?.style.setProperty('--x', `${scaled(EXIT_MS, timeScale)}ms`)
      const inAt = EXIT_MS + GAP_MS
      return {
        steps: [
          [
            0,
            () => {
              exit()
              phase(root?.dataset.phase === 'in' || root?.dataset.phase === 'leave' ? 'leave' : 'out')            },
          ],
          [
            inAt,
            () => {
              if (!root) return
              phase('reset')
              timing()
              void root.offsetWidth
              phase('in')
            },
          ],
        ],
        endMs: inAt + Math.min(Math.max(...n), CAP) * delay + ENTER_MS + HOLD_MS,
        still: () => {
          if (!root) return
          snap(root, () => {
            exit()
            timing()
            phase('still')
          })
        },
      }
    },
    { playing, replayKey, timeScale, onCycleEnd },
    `${values.delay}|${values.order}|${values.compare}`,
  )

  const compare = values.compare === 'all'
  return (
    <div
      ref={rootRef}
      data-phase="still"
      className={`group/stage flex h-full items-center justify-center ${size === 'detail' ? 'gap-4 sm:gap-16' : 'gap-6'}`}
    >
      <List size={size} kind="stagger" label={compare ? `${delay}ms stagger` : undefined} />
      {compare && <List size={size} kind="all" label="all at once" />}
    </div>
  )
}

function StaggerGlyph({ active }: GlyphProps) {
  return (
    <GlyphSvg kind="stagger" active={active}>
      <rect className="m" x="3" y="3.2" width="6" height="1.1" rx=".55" fill="currentColor" />
      <rect className="m s1" x="3" y="5.5" width="4.5" height="1.1" rx=".55" fill="currentColor" />
      <rect className="m s2" x="3" y="7.8" width="5.5" height="1.1" rx=".55" fill="currentColor" />
    </GlyphSvg>
  )
}

const ORDER_TEXT: Record<V['order'], string> = {
  forward: 'first item first (`--n` = index)',
  reverse: 'last item first (`--n` = count - 1 - index)',
  center: 'middle out: `--n` = distance from the middle, rounded down (6 items: 2, 1, 0, 0, 1, 2)',
}

// The Motion child-delay function for each order: Motion passes (index, total). Inline in `transition` the parameters
// get their types from context; as a standalone const (the Motion tab) they need them spelled out.
function delayFn(v: V, typed = false): string {
  const s = Number(v.delay) / 1000
  const step = {
    forward: 'i',
    reverse: 'total - 1 - i',
    center: 'Math.floor(Math.abs(i - (total - 1) / 2))',
  }[v.order]
  const params = typed ? (v.order === 'forward' ? '(i: number)' : '(i: number, total: number)') : v.order === 'forward' ? '(i)' : '(i, total)'
  return `${params} => Math.min(${step}, ${CAP}) * ${s}`
}

// What Motion offers without a function, and how it differs. staggerChildren and staggerDirection are deprecated in
// motion-dom 14.1 in favour of delayChildren: stagger().
const MOTION_SHORTHAND: Record<V['order'], string> = {
  forward: '`stagger({s})`, uncapped; it replaces `staggerChildren`',
  reverse: '`stagger({s}, { from: "last" })`, uncapped',
  center: '`stagger({s}, { from: "center" })` starts the middle pair half a step late',
}

function delayLine(v: V): string {
  const ms = Number(v.delay)
  const slow = v.delay === '100' ? ' (too slow; ship 30 to 80ms)' : ''
  return `- Delay: ${ms}ms per step${slow}, ${ORDER_TEXT[v.order]}. Cap at ${CAP} steps, \`min(n, ${CAP})\`: no item waits more than ${ms * CAP}ms.`
}

function cssCode(v: V): string {
  const ms = Number(v.delay)
  const markup: Record<V['order'], string[]> = {
    forward: ['/* Markup: <ul class="stagger"><li style="--n: 0">…</li><li style="--n: 1">…', '   </li>…</ul>. --n is the item\'s step: its index. */'],
    reverse: [
      '/* Markup: <ul class="stagger"><li style="--n: 5">…</li>…<li style="--n: 0">…',
      '   </li></ul>. --n is the item\'s step: the last item is 0, so the cascade',
      '   runs bottom up. */',
    ],
    center: [
      '/* Markup: <ul class="stagger"><li style="--n: 2">…</li>…</ul>. --n is the',
      "   item's distance from the middle, rounded down: with 6 items 2, 1, 0, 0,",
      '   1, 2, so the middle pair leads and the ends follow. */',
    ],
  }
  return [
    ':root {',
    '  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);',
    '}',
    '',
    ...markup[v.order],
    '.stagger > * {',
    '  /* A one-shot entrance, so keyframes. `both` holds the hidden frame during',
    '     the delay; the item keeps its space and takes clicks the whole time. */',
    `  animation: rise-in ${ENTER_MS}ms var(--ease-out) both;`,
    `  /* ${ms}ms per step, capped at ${CAP} steps: a long list never waits more`,
    `     than ${ms * CAP}ms for its last item. */`,
    `  animation-delay: calc(min(var(--n, 0), ${CAP}) * ${ms}ms);`,
    ...(v.delay === '100' ? ['  /* 100ms is too slow: ship 30 to 80ms. */'] : []),
    '}',
    '',
    '@keyframes rise-in {',
    '  from {',
    '    opacity: 0;',
    '    transform: translateY(8px);',
    '    filter: blur(2px);',
    '  }',
    '}',
    '',
    '/* Leaving: the whole list as one, faster, a few pixels up. Never per item:',
    '   an item still waiting to enter would flash in for a frame. Set',
    '   data-leaving on the list and remove the list on its transitionend',
    '   (opacity). */',
    '.stagger {',
    `  transition: opacity ${EXIT_MS}ms var(--ease-out), translate ${EXIT_MS}ms var(--ease-out);`,
    '}',
    '.stagger[data-leaving] {',
    '  opacity: 0;',
    '  translate: 0 -4px;',
    '  pointer-events: none;',
    '}',
    '/* Leaving mid-cascade, every item stays where it got to. */',
    '.stagger[data-leaving] > * {',
    '  animation-play-state: paused;',
    '}',
    ...(v.compare === 'all'
      ? [
          '',
          '/* Comparison only: the twin list puts --n: 0 on every item, so all six',
          '   enter at the same instant, as one block. */',
        ]
      : []),
    '',
    '/* Reduced motion: no stagger, no movement, no blur. Everything fades in',
    '   together, and the exit only fades. */',
    '@media (prefers-reduced-motion: reduce) {',
    '  .stagger > * {',
    '    animation-name: fade-in;',
    '    animation-duration: 150ms;',
    '    animation-delay: 0s;',
    '  }',
    '  .stagger[data-leaving] {',
    '    translate: none;',
    '  }',
    '}',
    '',
    '@keyframes fade-in {',
    '  from {',
    '    opacity: 0;',
    '  }',
    '}',
  ].join('\n')
}

function motionCode(v: V): string {
  const s = Number(v.delay) / 1000
  return [
    "import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react'",
    "import type { ReactNode } from 'react'",
    '',
    `// ${Number(v.delay)}ms per step, capped at ${CAP} steps. A delayChildren function gets each`,
    `// child's (index, total); ${MOTION_SHORTHAND[v.order].replaceAll('{s}', String(s)).replaceAll('`', '')}.`,
    `const delayChildren = ${delayFn(v, true)}`,
    '',
    'const enter: Variants = {',
    "  hidden: { opacity: 0, y: 8, filter: 'blur(2px)' },",
    `  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: ${ENTER_MS / 1000}, ease: [0.23, 1, 0.32, 1] } },`,
    '}',
    '// Reduced motion: no stagger, no movement, no blur; all items fade in together.',
    'const fade: Variants = {',
    '  hidden: { opacity: 0 },',
    '  show: { opacity: 1, transition: { duration: 0.15 } },',
    '}',
    ...(v.compare === 'all' ? ['', '// Comparison only: the twin list drops delayChildren, so all items enter at once.'] : []),
    '',
    'type Item = { id: string; content: ReactNode }',
    '',
    'export function StaggerList({ items, open }: { items: Item[]; open: boolean }) {',
    '  const reduced = useReducedMotion()',
    '  const list: Variants = { hidden: {}, show: { transition: reduced ? {} : { delayChildren } } }',
    '  return (',
    '    <AnimatePresence>',
    '      {open && (',
    '        // Plays when it mounts (open turns true); a remount replays, a re-render',
    '        // does not. Items stay in the DOM, clickable and focusable, throughout.',
    '        <motion.ul',
    '          variants={list}',
    '          initial="hidden"',
    '          animate="show"',
    '          // Leaving: the whole list as one, never per item. Reduced motion: fade only.',
    `          exit={{ opacity: 0, y: reduced ? 0 : -4, transition: { duration: ${EXIT_MS / 1000}, ease: [0.23, 1, 0.32, 1] } }}`,
    '        >',
    '          {items.map((item) => (',
    '            <motion.li key={item.id} variants={reduced ? fade : enter}>',
    '              {item.content}',
    '            </motion.li>',
    '          ))}',
    '        </motion.ul>',
    '      )}',
    '    </AnimatePresence>',
    '  )',
    '}',
  ].join('\n')
}

function jsCode(v: V): string {
  const ms = Number(v.delay)
  const step = {
    forward: 'i',
    reverse: 'items.length - 1 - i',
    center: 'Math.floor(Math.abs(i - (items.length - 1) / 2))',
  }[v.order]
  return [
    "const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches",
    '',
    'export function staggerIn(list) {',
    '  const items = [...list.children]',
    '  items.forEach((el, i) => {',
    `    const n = Math.min(${step}, ${CAP})`,
    '    // Reduced motion: no stagger, no movement; every item fades in at once.',
    '    if (reduced) {',
    "      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, fill: 'backwards' })",
    '      return',
    '    }',
    '    el.animate(',
    "      [{ opacity: 0, transform: 'translateY(8px)', filter: 'blur(2px)' }, { opacity: 1, transform: 'none', filter: 'none' }],",
    '      // backwards: hidden through the delay, then the item\'s own styles.',
    `      { duration: ${ENTER_MS}, delay: n * ${ms}, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'backwards' },`,
    '    )',
    '  })',
    '}',
  ].join('\n')
}

export default defineTerm({
  slug: 'stagger',
  name: 'Stagger',
  category: 'motion',
  order: 4,
  status: 'published',
  definition: 'Several items animate one after another with a small delay between each, creating a cascade.',
  aliases: ['cascade', 'staggered entrance', 'one after another', 'sequential reveal', 'staggerChildren', 'waterfall'],
  description:
    'Stagger gives each item in a group the same entrance, started a small fixed step after the one before, so the group arrives as a cascade instead of a block. The eye follows the order, and the whole feels lighter than everything appearing at once. It is decoration: keep the step between 30 and 80ms, cap the total wait, and never hold back clicks or focus while it plays. Split content into meaningful pieces first, then stagger the pieces.',
  useWhen: [
    'Page and section entrances: heading, copy and actions, or a grid of features arriving together.',
    'A list or set of cards appearing for the first time, like search results or an empty state filling in.',
    'Rare moments, like onboarding or a success screen.',
  ],
  avoidWhen: [
    'Lists people scroll through or revisit all day, like an inbox or a feed. Show them at once.',
    'Anything that holds back interaction: items must be clickable and focusable from the first frame.',
    'More than about 8 items without a cap. Cap the wait at about 6 steps (360ms at 60ms).',
    'Content already in place when the page paints, like a dashboard people return to or a list restored on Back. Stagger a state change (results arriving, a step opening) or a first-run entrance.',
    'Every element on a page. Stagger one group; let the rest appear.',
    'An item added later, like a new message. Animate that item alone.',
  ],
  demo: {
    component: StaggerDemo,
    label:
      'On the entry page, a task app\'s sidebar: six rows with an icon and a label, Inbox, Today, Upcoming, Projects, Archive and Settings, the first one highlighted as the current one. The rows leave together, quickly, then come back one after another: each fades in, rises 8px and sharpens from a slight blur, a fixed step after the one before. They hold, then the loop repeats. The order can run top down, bottom up or from the middle out. With a comparison picked, a twin sidebar beside it enters all at once at the same instant. The index card is a wireframe of the same list: six small cards with a square and a bar each.',
    controls,
    glyph: StaggerGlyph,
  },
  prompt: (v) => {
    const s = Number(v.delay) / 1000
    return [
      "Stagger this list's entrance.",
      '',
      `- Each item: \`opacity\` 0 to 1, \`translateY(8px)\` to \`none\`, \`filter: blur(2px)\` to \`blur(0px)\` or \`none\`, ${ENTER_MS}ms \`var(--ease-out)\` (\`cubic-bezier(0.23, 1, 0.32, 1)\`).`,
      delayLine(v),
      `- CSS route: \`style="--n: 2"\` per item; \`animation: rise-in ${ENTER_MS}ms var(--ease-out) both; animation-delay: calc(min(var(--n), ${CAP}) * ${v.delay}ms)\`; \`@keyframes rise-in\` sets only \`from\`.`,
      `- Motion route: list \`show: { transition: { delayChildren: ${delayFn(v)} } }\`${v.order === 'center' ? '' : ` (${MOTION_SHORTHAND[v.order].replaceAll('{s}', String(s))})`}; items \`hidden\`/\`show\` as above; \`initial="hidden" animate="show"\`.`,
      '- Plays on mount or when state shows the list; remounts replay, re-renders do not.',
      '- Hidden items keep their space (`opacity`, not `display: none`), clickable and focusable: no `pointer-events: none` or `inert`.',
      `- Exit: the whole list as one, ${EXIT_MS}ms ease-out, to \`opacity: 0; translate: 0 -4px\`; never per item. CSS: \`data-leaving\` on the list (a transition), items \`animation-play-state: paused\`, unmount on \`transitionend\`. Motion: \`exit\` on the list.`,
      ...(v.compare === 'all' ? ['- Comparison only: a twin list, every delay 0.'] : []),
      '- Reduced motion: no stagger, movement or blur; items fade in together over 150ms, the exit only fades. CSS: `animation: fade-in 150ms both` on items, `translate: none` on `[data-leaving]`. Motion: `useReducedMotion()`, `opacity` only.',
    ].join('\n')
  },
  acceptance: (v) => {
    const ms = Number(v.delay)
    const lead = { forward: 'the first item', reverse: 'the last item', center: 'the middle pair' }[v.order]
    return [
      `The item k steps from ${lead} has a delay of k × ${ms}ms: read the computed \`animation-delay\` (CSS) or \`el.getAnimations()[0].effect.getTiming().delay\` (JS), or time it from the first frame its opacity rises above 0.01 (any route, ±2 frames).`,
      `With 10 items, no item starts more than ${ms * CAP}ms after the first to start (${CAP} steps).`,
      `Each item enters over ${ENTER_MS}ms: opacity 0 to 1, 8px rise, 2px blur to none (\`blur(0px)\` at rest is fine). Only \`opacity\`, \`transform\` and \`filter\` animate.`,
      'The list has its final height from the first frame: no item\'s `offsetTop` changes during the entrance.',
      'A click on the last item, the one with the largest delay (under the cap several share it), made while the cascade plays and before it is visible, fires its handler; Tab reaches every item at once.',
      'Showing the list again (a remount) replays the entrance; re-rendering it with the same items does not.',
      `The exit fades and lifts the list as one, done within ${EXIT_MS}ms.`,
      'CSS route: leaving mid-cascade, no item\'s opacity rises; items still waiting stay at 0 while the list fades. Motion route: the list\'s opacity falls from the first frame of the exit, so no item that had not appeared flashes in.',
      ...(v.compare === 'all' ? ['The comparison list starts at the same instant with every item at delay 0 (comparison only).'] : []),
      'With reduced motion on, every item appears at the same time, without moving or blurring, within 150ms, and the exit fades without moving.',
    ]
  },
  code: (v) => ({ css: cssCode(v), motion: motionCode(v), js: jsCode(v) }),
  a11y: 'Every item is in the DOM from the start: the stagger only changes opacity, transform and filter, so screen readers read the whole list and keyboard users can Tab to any item while it plays. Do not move focus or announce items as they appear. Under reduced motion, show every item at once, with at most a 150ms fade and no movement or blur.',
  related: ['enter-and-exit', 'scroll-triggered', 'duration', 'ease-out'],
  sources: [
    { label: 'Emil Kowalski: 7 Practical Animation Tips', url: 'https://emilkowal.ski/ui/7-practical-animation-tips' },
    { label: 'Motion: stagger', url: 'https://motion.dev/docs/stagger' },
  ],
})
