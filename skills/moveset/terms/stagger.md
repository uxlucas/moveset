# Stagger

Also called: cascade, staggered entrance, one after another, sequential reveal, staggerChildren, waterfall

> Several items animate one after another with a small delay between each, creating a cascade.

Stagger gives each item in a group the same entrance, started a small fixed step after the one before, so the group arrives as a cascade instead of a block. The eye follows the order, and the whole feels lighter than everything appearing at once. It is decoration: keep the step between 30 and 80ms, cap the total wait, and never hold back clicks or focus while it plays. Split content into meaningful pieces first, then stagger the pieces.

## Use when

- Page and section entrances: heading, copy and actions, or a grid of features arriving together.
- A list or set of cards appearing for the first time, like search results or an empty state filling in.
- Rare moments, like onboarding or a success screen.

## Avoid when

- Lists people scroll through or revisit all day, like an inbox or a feed. Show them at once.
- Anything that holds back interaction: items must be clickable and focusable from the first frame.
- More than about 8 items without a cap. Cap the wait at about 6 steps (360ms at 60ms).
- Content already in place when the page paints, like a dashboard people return to or a list restored on Back. Stagger a state change (results arriving, a step opening) or a first-run entrance.
- Every element on a page. Stagger one group; let the rest appear.
- An item added later, like a new message. Animate that item alone.

## Prompt

```text
Stagger this list's entrance.

- Each item: `opacity` 0 to 1, `translateY(8px)` to `none`, `filter: blur(2px)` to `blur(0px)` or `none`, 300ms `var(--ease-out)` (`cubic-bezier(0.23, 1, 0.32, 1)`).
- Delay: 60ms per step, first item first (`--n` = index). Cap at 6 steps, `min(n, 6)`: no item waits more than 360ms.
- CSS route: `style="--n: 2"` per item; `animation: rise-in 300ms var(--ease-out) both; animation-delay: calc(min(var(--n), 6) * 60ms)`; `@keyframes rise-in` sets only `from`.
- Motion route: list `show: { transition: { delayChildren: (i) => Math.min(i, 6) * 0.06 } }` (`stagger(0.06)`, uncapped; it replaces `staggerChildren`); items `hidden`/`show` as above; `initial="hidden" animate="show"`.
- Plays on mount or when state shows the list; remounts replay, re-renders do not.
- Hidden items keep their space (`opacity`, not `display: none`), clickable and focusable: no `pointer-events: none` or `inert`.
- Exit: the whole list as one, 150ms ease-out, to `opacity: 0; translate: 0 -4px`; never per item. CSS: `data-leaving` on the list (a transition), items `animation-play-state: paused`, unmount on `transitionend`. Motion: `exit` on the list.
- Reduced motion: no stagger, movement or blur; items fade in together over 150ms, the exit only fades. CSS: `animation: fade-in 150ms both` on items, `translate: none` on `[data-leaving]`. Motion: `useReducedMotion()`, `opacity` only.
```

### Acceptance checklist

- [ ] The item k steps from the first item has a delay of k × 60ms: read the computed `animation-delay` (CSS) or `el.getAnimations()[0].effect.getTiming().delay` (JS), or time it from the first frame its opacity rises above 0.01 (any route, ±2 frames).
- [ ] With 10 items, no item starts more than 360ms after the first to start (6 steps).
- [ ] Each item enters over 300ms: opacity 0 to 1, 8px rise, 2px blur to none (`blur(0px)` at rest is fine). Only `opacity`, `transform` and `filter` animate.
- [ ] The list has its final height from the first frame: no item's `offsetTop` changes during the entrance.
- [ ] A click on the last item, the one with the largest delay (under the cap several share it), made while the cascade plays and before it is visible, fires its handler; Tab reaches every item at once.
- [ ] Showing the list again (a remount) replays the entrance; re-rendering it with the same items does not.
- [ ] The exit fades and lifts the list as one, done within 150ms.
- [ ] CSS route: leaving mid-cascade, no item's opacity rises; items still waiting stay at 0 while the list fades. Motion route: the list's opacity falls from the first frame of the exit, so no item that had not appeared flashes in.
- [ ] With reduced motion on, every item appears at the same time, without moving or blurring, within 150ms, and the exit fades without moving.

## Code

### CSS

```css
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
}

/* Markup: <ul class="stagger"><li style="--n: 0">…</li><li style="--n: 1">…
   </li>…</ul>. --n is the item's step: its index. */
.stagger > * {
  /* A one-shot entrance, so keyframes. `both` holds the hidden frame through
     the delay; the item keeps its space and takes clicks the whole time. */
  animation: rise-in 300ms var(--ease-out) both;
  /* Capped at 6 steps: a long list never waits more than 360ms for its last item. */
  animation-delay: calc(min(var(--n, 0), 6) * 60ms);
}

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(8px);
    filter: blur(2px);
  }
}

/* Leaving: the list as one, never per item, or an item still waiting to enter
   would flash in. Set data-leaving on the list; remove it on transitionend. */
.stagger {
  transition: opacity 150ms var(--ease-out), translate 150ms var(--ease-out);
}
.stagger[data-leaving] {
  opacity: 0;
  translate: 0 -4px;
  pointer-events: none;
}
/* Leaving mid-cascade, every item stays where it got to. */
.stagger[data-leaving] > * {
  animation-play-state: paused;
}

/* Reduced motion: everything fades in together; the exit only fades. */
@media (prefers-reduced-motion: reduce) {
  .stagger > * {
    animation-name: fade-in;
    animation-duration: 150ms;
    animation-delay: 0s;
  }
  .stagger[data-leaving] {
    translate: none;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}
```

### JS

```js
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

export function staggerIn(list) {
  const items = [...list.children]
  items.forEach((el, i) => {
    // Reduced motion: every item fades in at once.
    if (reduced) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, fill: 'backwards' })
      return
    }
    const n = Math.min(i, 6)
    el.animate(
      [
        { opacity: 0, transform: 'translateY(8px)', filter: 'blur(2px)' },
        { opacity: 1, transform: 'none', filter: 'none' },
      ],
      // backwards: hidden through the delay, then the item's own styles.
      { duration: 300, delay: n * 60, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'backwards' },
    )
  })
}
```

### Motion

```tsx
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react'
import type { ReactNode } from 'react'

// A delayChildren function gets each child's (index, total); capped at 6 steps.
// Shorthand: stagger(0.06), uncapped; it replaces staggerChildren.
const delayChildren = (i: number) => Math.min(i, 6) * 0.06

const enter: Variants = {
  hidden: { opacity: 0, y: 8, filter: 'blur(2px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] } },
}
// Reduced motion: all items fade in together.
const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.15 } },
}

type Item = { id: string; content: ReactNode }

export function StaggerList({ items, open }: { items: Item[]; open: boolean }) {
  const reduced = useReducedMotion()
  const list: Variants = { hidden: {}, show: { transition: reduced ? {} : { delayChildren } } }
  return (
    <AnimatePresence>
      {open && (
        // Plays when it mounts (open turns true); a remount replays, a re-render
        // does not. Items stay in the DOM, clickable and focusable, throughout.
        <motion.ul
          variants={list}
          initial="hidden"
          animate="show"
          // Leaving: the whole list as one, never per item. Reduced motion: fade only.
          exit={{ opacity: 0, y: reduced ? 0 : -4, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }}
        >
          {items.map((item) => (
            <motion.li key={item.id} variants={reduced ? fade : enter}>
              {item.content}
            </motion.li>
          ))}
        </motion.ul>
      )}
    </AnimatePresence>
  )
}
```

## Accessibility

Every item is in the DOM from the start: the stagger only changes opacity, transform and filter, so screen readers read the whole list and keyboard users can Tab to any item while it plays. Do not move focus or announce items as they appear. Under reduced motion, show every item at once, with at most a 150ms fade and no movement or blur.

## Related

- [Enter and Exit](https://moveset.lucaslima.design/terms/enter-and-exit)
- [Scroll-triggered](https://moveset.lucaslima.design/terms/scroll-triggered)
- [Duration](https://moveset.lucaslima.design/terms/duration)
- [Ease-out](https://moveset.lucaslima.design/terms/ease-out)

Source: https://moveset.lucaslima.design/terms/stagger
