# Scroll-linked

Also called: scroll-driven animation, scrubbing, scroll timeline, tied to scroll position, progress follows the scrollbar, scroll scrubbed

> An animation whose progress is tied directly to the scroll position, moving forward and backward as you scroll.

Scroll-linked motion has no duration and no easing. Its progress is a number from 0 to 1, measured over the whole page or over the stretch where one element passes through the viewport, and that number is mapped straight onto a property. Scroll down and it moves forward; scroll back up and it runs backwards, exactly as fast as you scroll. CSS can do this on its own with scroll-driven animations.

## Use when

- A reading progress bar on long articles and docs.
- An element tied to its own pass through the viewport, like a figure that settles into place as it scrolls in and undoes it when the reader scrolls back.
- Storytelling sections where the scroll position is the timeline and the reader sets the pace in both directions.

## Avoid when

- Entrances that should finish on their own once seen. That is scroll-triggered.
- Large movement or scaling that is out of step with the scroll. It can make people with vestibular disorders feel unwell.
- Text people need to read at a given moment. A fade tied to scroll leaves it half transparent wherever the reader stops.

## Prompt

```text
Add a reading progress bar that follows the scroll position of the page.

- Progress = `scrollTop / (scrollHeight - clientHeight)` of the page scroll (`document.scrollingElement`), clamped 0..1; 0 if the page does not scroll. No transition, easing, delay or smoothing.
- For a nested scroller, use its own scrollTop/scrollHeight and `scroll(nearest)`.
- Bar: 2px tall, fixed across the top, full width, `z-index: 50`, `pointer-events: none`, `aria-hidden`, `transform-origin: left`, `transform: scaleX(progress)` (base `scaleX(0)`), `will-change: transform`. Never animate width.
- CSS route: `@keyframes progress` from `scaleX(0)` to `scaleX(1)`; `animation: progress linear both`, then `animation-timeline: scroll(root)`; shorthand first, it resets the timeline.
- Feature-test `CSS.supports('animation-timeline', 'scroll()')` before the bar's first paint and set `data-fallback` on `<html>` when false; then use the JS route. Scope the CSS animation to `html:not([data-fallback])` inside `@supports (animation-timeline: scroll())`.
- JS route: passive scroll listener, one requestAnimationFrame, clamp, write the transform to the element (not framework state). Also recompute on `resize` and a `ResizeObserver` on `document.body`; scroll alone goes stale.
- Page not scrollable: bar at 0. Put `.is-linked` on the bar in the markup and scope the CSS animation to it; JS toggles it from `scrollHeight > clientHeight` on `resize`/`ResizeObserver`; the JS route writes `scaleX(0)`.
- Reduced motion: no override.
```

### Acceptance checklist

- [ ] At 50% of the page, the bar spans half the scroll container's width (clientWidth).
- [ ] At the very top the bar is empty; at the very end it is full. On a page too short to scroll it stays empty.
- [ ] Scrolling back up shrinks the bar at the same rate; it never replays forward or snaps.
- [ ] No transition, delay or smoothing on the element: once the scroll handlers have run, it matches the scroll position in the same frame.
- [ ] After resizing the window or loading more content, progress still matches the scroll position.
- [ ] Only transform changes; nothing around the bar moves.
- [ ] With reduced motion on, the bar still tracks the scroll position.
- [ ] In a browser where `CSS.supports('animation-timeline', 'scroll()')` is false (Firefox today), the JS route gives the same result. To check in Chromium, stub `CSS.supports` to return false before the page loads.

## Code

### CSS

```css
.progress {
  position: fixed;
  inset: 0 0 auto;
  z-index: 50; /* above the page header */
  height: 2px;
  background: currentColor;
  transform-origin: left;
  transform: scaleX(0); /* empty until a timeline or the JS drives it */
  will-change: transform;
  pointer-events: none;
}

/* Same test as the JS tab, which sets data-fallback when it takes over. */
/* .is-linked is in the markup; the JS tab takes it off while the page cannot
   scroll, so the bar empties, and puts it back when it can. */
@supports (animation-timeline: scroll()) {
  html:not([data-fallback]) .progress.is-linked {
    /* The shorthand resets animation-timeline, so it comes first. linear maps
       progress 1:1 (the default is ease); both holds the ends outside the range. */
    animation: progress linear both;
    /* A nested scroller: use scroll(nearest) on an element inside it. */
    animation-timeline: scroll(root);
  }
}

@keyframes progress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

/* prefers-reduced-motion: no override.
   House rule: a progress indicator keeps tracking under reduced motion.
   Its position is the information, and it moves only as far as the
   reader scrolls. */
```

### JS

```js
// Load at the end of `<body>`: the bar exists, and the test runs before it paints.
// Markup: <div class="progress is-linked" aria-hidden="true"></div>
// Same test as the CSS @supports, so the two routes never both drive the bar.
const supported = CSS.supports('animation-timeline', 'scroll()')
// prefers-reduced-motion: no override.
// House rule: a progress indicator keeps tracking under reduced motion.
// Its position is the information, and it moves only as far as the
// reader scrolls.
const bar = document.querySelector('.progress')

if (bar) {
  const root = document.documentElement
  const clamp = (n) => Math.min(Math.max(n, 0), 1)
  let frame = 0

  const render = () => {
    frame = 0
    const max = root.scrollHeight - root.clientHeight
    // Both routes: while the page cannot scroll, .is-linked comes off and the
    // bar empties instead of holding its last value. It goes back on when it can.
    bar.classList.toggle('is-linked', max > 0)
    if (!supported) bar.style.transform = `scaleX(${max > 0 ? clamp(root.scrollTop / max) : 0})`
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(render)
  }

  if (!supported) {
    root.dataset.fallback = ''
    addEventListener('scroll', schedule, { passive: true })
  }
  addEventListener('resize', schedule)
  // Content that loads or goes away changes the range without a scroll.
  new ResizeObserver(schedule).observe(document.body)
  render()
}
```

### Motion

```tsx
import { motion, useScroll } from 'motion/react'

// House rule: a progress indicator keeps tracking under reduced motion.
// So there is no useReducedMotion gate here.
const barClass =
  'pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-current'

export function ReadingProgress() {
  const { scrollYProgress } = useScroll()
  return (
    <motion.div
      aria-hidden
      className={barClass}
      style={{ scaleX: scrollYProgress }}
    />
  )
}
```

## Accessibility

Keep scroll-linked movement small and in step with the scroll: large motion out of step with it can make people with vestibular disorders unwell. Under reduced motion, show decorative effects in their final state. A reading progress bar keeps tracking, since its position is the information (a house rule). It repeats what the scrollbar already says, so hide it from screen readers with aria-hidden.

## Related

- [Scroll-triggered](https://moveset.lucaslima.design/terms/scroll-triggered)
- [Parallax](https://moveset.lucaslima.design/terms/parallax)

## Often confused with

- [Scroll-linked vs Parallax](https://moveset.lucaslima.design/compare/parallax-vs-scroll-linked): Parallax is one use of scroll-linked motion: layers move at different speeds to suggest depth. Scroll-linked is the general technique of tying any property to the scroll position.
- [Scroll-linked vs Scroll-triggered](https://moveset.lucaslima.design/compare/scroll-linked-vs-scroll-triggered): Scroll-triggered plays once on its own clock when something enters view. Scroll-linked has no clock: its progress is the scroll position, so it runs backwards when you scroll up.

Source: https://moveset.lucaslima.design/terms/scroll-linked
