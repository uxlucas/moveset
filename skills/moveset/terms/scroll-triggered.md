# Scroll-triggered

Also called: reveal on scroll, animate on scroll, in-view animation, scroll reveal, fade in when scrolled to, appear as you scroll

> An animation that plays once when an element scrolls into view.

The element waits just out of sight. When enough of it enters the viewport, it plays an ordinary timed transition, with its own duration and easing, and finishes no matter what the scroll does next. It plays once: scrolling back up leaves it where it is, which is what separates it from scroll-linked motion. Ease-out at 300 to 500ms is right for an entrance; the other easing options are there so you can feel why.

## Use when

- Marketing and editorial pages, where sections arriving one after another set the pace of the story.
- A grid of features or cards further down a long page, with a short stagger so each row arrives as a group.
- Drawing the eye to one figure, quote or result as the reader reaches it.

## Avoid when

- App UI people need right away, like tables, dashboards, search results and settings. Waiting for content to fade in slows the work down.
- Every element on the page. When everything reveals, nothing stands out, and fast scrolling turns into waiting.
- Motion that should follow the scrollbar and reverse when scrolling back. That is scroll-linked.

## Prompt

```text
Reveal each card once as it scrolls into view.

- Inner box: `opacity` 0 to 1, `translateY(14px)` to `none`, 500ms `var(--ease-out)` (`cubic-bezier(0.23, 1, 0.32, 1)`). Transition only those.
- Observe the card itself (it never moves; only the inner box animates) with `threshold: 0.15`. On intersect: `data-in="true"`, `unobserve`.
- Each callback: keep `isIntersecting` entries with `intersectionRatio >= 0.15`, skip entries already revealed (focus, first paint), DOM order; delay = min(index, 4) × 60ms, cleared on `transitionend`.
- First paint: cards with any pixel on screen show without animating: run the pass at DOMContentLoaded and again at `load` (`#hash` jumps), with inline `transition: none` on the inner box for that pass, restored after a reflow.
- Observer script (end of `<body>` or deferred): mark those and cards scrolled past with `data-in="true"`, then add `js` to `<html>`; hide `.js .reveal:not([data-in="true"]) > .reveal-inner`, transition only when revealed.
- Cards are in the initial HTML (server-rendered or static), keeping their space.
- Motion/SSR: `initial` is in the server HTML; add `<noscript>`, print and 3s-failsafe styles forcing `.reveal-inner` visible.
- `focusin` on an unrevealed card: reveal now, no delay.
- `@media print`: all cards visible, no transition.
- Reduced motion: no transform, opacity over 150ms, no JS delays.
```

### Acceptance checklist

- [ ] Cards in view when the page loads are visible from the first frame and do not animate.
- [ ] Each card below animates the first time it is about 15% inside the viewport, then stays.
- [ ] Scrolling back up never replays a card that has already revealed.
- [ ] One card takes 500ms from hidden to rest.
- [ ] Cards that enter together start 60ms apart in reading order, and none waits more than 240ms.
- [ ] After an instant jump (anchor link or `scrollTo` without smooth), every card in view is fully visible.
- [ ] Cards hold their space before they reveal; nothing below them moves.
- [ ] With JavaScript off, or if the observer script fails to load, every card is visible (the cards must be in the initial HTML).
- [ ] Moving focus into a card that has not revealed starts its reveal immediately, with no stagger delay.
- [ ] With reduced motion on, cards appear without moving and without a stagger, over at most 150ms.
- [ ] Printing the page shows every card.

## Code

### CSS

```css
:root { --ease-out: cubic-bezier(0.23, 1, 0.32, 1); }

/* Markup: <div class="reveal"><div class="reveal-inner">…</div></div>
   The observer watches .reveal, which never moves; .reveal-inner animates.
   The JS tab adds .js only after marking the cards already in view, so the
   first screen is never hidden, and with JavaScript off nothing is. */
.js .reveal:not([data-in="true"]) > .reveal-inner {
  opacity: 0;
  transform: translateY(14px);
}

/* The transition lives on the revealed state only, so hiding is instant. */
.js .reveal[data-in="true"] > .reveal-inner {
  transition-property: opacity, transform;
  transition-duration: 500ms;
  transition-timing-function: var(--ease-out);
}

@media (prefers-reduced-motion: reduce) {
  .js .reveal:not([data-in="true"]) > .reveal-inner { transform: none; }
  .js .reveal[data-in="true"] > .reveal-inner {
    transition-property: opacity;
    transition-duration: 150ms;
  }
}

@media print {
  .js .reveal:not([data-in="true"]) > .reveal-inner { opacity: 1; transform: none; }
  .js .reveal-inner { transition: none !important; }
}
```

### JS

```js
// Load at the end of <body>, or with defer, so it runs by DOMContentLoaded. It
// shows the cards already on screen before it hides anything, so the first
// screen never flashes or waits, and if it fails to load, every card stays visible.
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

// The card is observed and gets data-in; its .reveal-inner is what animates.
function show(card, delay = 0) {
  if (delay) {
    const inner = card.querySelector('.reveal-inner')
    inner.style.transitionDelay = `${delay}ms`
    // Clear it afterwards, so later transitions on the card don't inherit it.
    const clear = () => (inner.style.transitionDelay = '')
    inner.addEventListener('transitionend', clear, { once: true })
  }
  card.dataset.in = 'true'
  io.unobserve(card) // once
}

// The card itself never moves, so threshold 0.15 means 15% of it on screen.
const io = new IntersectionObserver(
  (entries) => {
    // The first callback reports every observed card; later ones only the
    // cards whose visibility changed, leaving ones included. Keep entering ones.
    const entering = entries.filter(
      (e) => e.isIntersecting && e.intersectionRatio >= 0.15,
    )
    // Cards entering together start 60ms apart, at most 4 steps.
    entering.forEach((e, i) => {
      show(e.target, reduced() ? 0 : Math.min(i, 4) * 60)
    })
  },
  { threshold: 0.15 },
)

// First paint: any card with part of it on screen, or already scrolled past,
// is shown without animating. The threshold above is only for cards to come.
function showOnScreen() {
  const cards = [...document.querySelectorAll('.reveal:not([data-in="true"])')]
  const onScreen = cards.filter((card) => card.getBoundingClientRect().top < innerHeight)
  const inners = onScreen.map((card) => card.querySelector('.reveal-inner'))
  for (const inner of inners) inner.style.transition = 'none'
  for (const card of onScreen) show(card)
  document.body.offsetWidth // commit the shown state before transitions come back
  for (const inner of inners) inner.style.transition = ''
}

showOnScreen()
document.querySelectorAll('.reveal:not([data-in="true"])').forEach((card) => io.observe(card))
// Only now hide the cards that are still to come.
document.documentElement.classList.add('js')
// A #hash jump lands at load: run the pass again for the cards it brought on screen.
addEventListener('load', showOnScreen, { once: true })

// Focus can land in a card before it reaches the threshold: start its reveal now.
document.addEventListener('focusin', (e) => {
  const card = e.target.closest('.reveal:not([data-in="true"])')
  if (card) show(card)
})
```

### Motion

```tsx
import { motion, type Variants } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'

// Add this to <head>. Motion writes `initial` into the server HTML, so the
// cards start hidden there; these show them without JavaScript, in print,
// and after 3s if the bundle never hydrates. If hydration takes longer
// than 3s, the failsafe stays on: cards show without animating.
//   <noscript>
//     <style>.reveal-inner { opacity: 1 !important; transform: none !important; }</style>
//   </noscript>
//   <style>
//     .reveal-failsafe .reveal-inner { opacity: 1 !important; transform: none !important; }
//     @media print {
//       .reveal-inner { opacity: 1 !important; transform: none !important;
//                       transition: none !important; }
//     }
//   </style>
//   <script>
//     window.revealFailsafe = setTimeout(() => {
//       document.documentElement.classList.add('reveal-failsafe')
//     }, 3000)
//   </script>

declare global {
  interface Window {
    revealFailsafe?: number
  }
}

// Render once near the root: the bundle has hydrated, so cancel the failsafe.
export function RevealFailsafe() {
  useEffect(() => clearTimeout(window.revealFailsafe), [])
  return null
}

// Cards that enter view in the same frame start 60ms apart, at most
// 4 steps: the same rule as the CSS and JS version.
let step = 0
let frame = 0
function nextDelay() {
  if (!frame) frame = requestAnimationFrame(() => (step = frame = 0))
  return Math.min(step++, 4) * 0.06
}

const variants: Variants = {
  hidden: { opacity: 0, y: 14 },
  // Resolved on the client when the card reveals, so the server HTML never
  // depends on the reduced-motion setting and hydration stays clean.
  // Motion can resolve it more than once per card, so each card keeps its
  // delay in `custom` and takes a stagger step only once.
  shown: (delay: RefObject<number | undefined>) => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return { opacity: 1, y: 0, transition: { duration: 0.15, y: { duration: 0 } } }
    }
    delay.current ??= nextDelay()
    return {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1], delay: delay.current },
    }
  },
}

// `above` renders a card visible and never animates it: use it for cards on
// the first screen. It is decided at render time, so on a taller viewport,
// cards in view on load that are not marked start hidden in the server HTML
// and fade in after hydration. Mark generously.
type RevealProps = { children: ReactNode; above?: boolean }
export function Reveal({ children, above = false }: RevealProps) {
  const delay = useRef<number>(undefined)
  const [focused, setFocused] = useState(false)
  return (
    // The outer div is observed and never moves, so amount 0.15 is 15% of the
    // card on screen. Its variant labels pass down to the inner div, which animates.
    <motion.div
      className="reveal"
      initial={above ? false : 'hidden'}
      whileInView={above ? undefined : 'shown'}
      animate={focused ? 'shown' : undefined}
      viewport={{ once: true, amount: 0.15 }}
      // Focus can land in a card before it reaches that line: reveal it now.
      onFocus={() => {
        delay.current ??= 0
        setFocused(true)
      }}
    >
      <motion.div className="reveal-inner" variants={variants} custom={delay}>
        {children}
      </motion.div>
    </motion.div>
  )
}
```

## Accessibility

With JavaScript off, or when the script fails, every card must be visible: hide cards only from the script that reveals them, and never the ones already on screen. Focus moving into a card that has not revealed starts its reveal at once. Under reduced motion, show content with a 150ms opacity fade, without movement or stagger.

## Related

- [Scroll-linked](https://moveset.lucaslima.design/terms/scroll-linked)

## Often confused with

- [Scroll-triggered vs Scroll-linked](https://moveset.lucaslima.design/compare/scroll-linked-vs-scroll-triggered): Scroll-triggered plays once on its own clock when something enters view. Scroll-linked has no clock: its progress is the scroll position, so it runs backwards when you scroll up.

Source: https://moveset.lucaslima.design/terms/scroll-triggered
