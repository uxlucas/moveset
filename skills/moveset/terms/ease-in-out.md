# Ease-in-out

Also called: speeds up then slows down, smooth both ends, ease in out, acceleration and braking

> Motion that speeds up and then slows down, for elements already on screen moving from one spot to another.

Ease-in-out is a timing curve that starts slowly, is fastest in the middle and slows again before it stops, the way something with mass accelerates and brakes. It suits an element that is already on screen and travels to a new spot, because the eye can follow it leaving and arriving. On entrances it is the wrong pick: the slow start delays the first visible change after a click.

## Use when

- Reordering a list or a row of cards.
- Layout changes where an element moves to a new position on screen.
- Slider thumbs, segmented control knobs and tab indicators moving between two spots.

## Avoid when

- Things entering or leaving, like menus, dialogs and toasts. Use ease-out.
- Hover and color changes. Use ease at around 150ms.
- Drag to reorder, or anything that follows a finger. Use a spring: a curve reversed mid-flight stops dead.
- Reorders triggered from the keyboard. Do not animate them.
- Durations above 300ms on product UI. Longer travel can take a little more, but a reorder should never feel slow.

## Prompt

```text
Animate a reorder in this row of cards.

- Setup: a horizontal row of N cards. A button (or the card itself) moves one card to another slot; the cards in between shift one slot. Moving back reverses the move.
- Every moving card: `transform: translateX()` only, 300ms `var(--ease-in-out)` (`cubic-bezier(0.77, 0, 0.175, 1)`), all together, both directions. The crossing card sits above (`z-index`).
- CSS route (fixed slots): `.row { position: relative }`; every card stacked at the row's start (`position: absolute; left: 0; top: 0`), moved by `translateX(calc(slot * (card width + gap)))` with `transition: transform`. Keep DOM order stable while moving; re-sort after `transitionend`, slots unchanged (a keyed React reorder kills running transitions).
- FLIP route (DOM reorder): `getBoundingClientRect()` each card (running transforms included), cancel its animations, reorder, re-measure, `el.animate()` `translate(dx, dy)` to `none`.
- Motion route: `layout="position"`, `transition: { duration: 0.3, ease: [0.77, 0, 0.175, 1] }`, stable keys.
- Never animate `left`, `top`, `width`, `margin` or `order`.
- A new move mid-flight starts from the current on-screen position.
- Reduced motion: cards jump. CSS: `transition: none` in `@media (prefers-reduced-motion: reduce)`; FLIP: skip `animate()` if `matchMedia('(prefers-reduced-motion: reduce)').matches`; Motion: `<MotionConfig reducedMotion="user">`.
```

### Acceptance checklist

- [ ] CSS route: a moving card's computed `transition-timing-function` is `cubic-bezier(0.77, 0, 0.175, 1)` and `transition-duration` is `0.3s`. FLIP route: `el.getAnimations()[0].effect.getTiming()` has `easing: 'cubic-bezier(0.77, 0, 0.175, 1)'` and `duration: 300`. A move takes 300ms.
- [ ] Slow at both ends (CSS or FLIP route): at 25% of the duration a card has covered 5% (±1) of its distance, at 75% 96% (±1). To measure, pause the animation (`const a = el.getAnimations()[0]; a.pause()`), set `a.currentTime` to 75 and then 225, and read the x of `new DOMMatrix(getComputedStyle(el).transform)`.
- [ ] Only the transform changes while cards move: `offsetLeft` and `offsetTop` never take in-between values.
- [ ] Starting a new move mid-flight continues from where each card is on screen, with no jump.
- [ ] Every card that moves starts and lands at the same time, and the card crossing the others passes above them.
- [ ] Once a move settles, Tab order and screen reader order match what is on screen.
- [ ] With reduced motion on, cards jump to their new places with no running animations.

## Code

### CSS

```css
:root {
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
}

/* Fixed slots: every card sits at the row's start and is offset by its slot,
   so a transition on transform is enough. In a flex row the offsets would
   count twice. For a DOM reorder, use the FLIP in the JS tab. */
.row {
  position: relative;
  height: 72px; /* the cards are out of flow: give the row their height */
}

.item {
  position: absolute;
  left: 0;
  top: 0;
  width: 96px;
  --slot: 0;
  /* A translateX percentage is the card's own width, so one slot is 100% +
     the gap. Never left or margin: they relayout every frame. */
  transform: translateX(calc(var(--slot) * (100% + 8px)));
  /* Accelerates, then brakes, like something with mass. A transition, so a
     new target mid-flight continues from where the card is. */
  transition: transform 300ms var(--ease-in-out);
}
.item[data-slot="1"] {
  --slot: 1;
}
.item[data-slot="2"] {
  --slot: 2;
}

/* Set data-moving on the crossing card when its move starts and remove it on
   transitionend. Then re-sort the DOM to match the slots (same data-slot, so
   nothing moves) for Tab order and screen readers; a keyed React reorder
   mid-move remounts the nodes and kills their transitions. */
.item[data-moving] {
  z-index: 1;
}

/* Reduced motion: cards jump to their new place. */
@media (prefers-reduced-motion: reduce) {
  .item {
    transition: none;
  }
}
```

### JS

```js
// Ease-in-out quart, the house --ease-in-out.
const EASE = 'cubic-bezier(0.77, 0, 0.175, 1)'
const reduced = matchMedia('(prefers-reduced-motion: reduce)')

// FLIP: measure, reorder the nodes and measure again, offset each card back
// to where it was, then animate the offset away. Moving the nodes keeps Tab
// order and screen readers in step with the screen.
export function reorder(list, apply) {
  const items = [...list.children]
  // Measured with any running transform, so a reorder mid-flight starts from
  // where each card is on screen.
  const first = new Map(items.map((el) => [el, el.getBoundingClientRect()]))
  items.forEach((el) => el.getAnimations().forEach((a) => a.cancel()))
  apply() // move the nodes
  // Reduced motion: cards jump to their new place.
  if (reduced.matches) return
  for (const el of items) {
    const was = first.get(el)
    const now = el.getBoundingClientRect()
    const dx = was.x - now.x
    const dy = was.y - now.y
    if (dx === 0 && dy === 0) continue
    // Transform only: layout is already final; the card just hasn't arrived.
    el.animate(
      [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
      { duration: 300, easing: EASE },
    )
  }
}
```

### Motion

```tsx
import { MotionConfig, motion } from 'motion/react'

type Item = { id: string; label: string }

export function Row({ items }: { items: Item[] }) {
  return (
    // Under reduced motion, cards jump to their new place.
    <MotionConfig reducedMotion="user">
      <ul className="row">
        {items.map((item) => (
          // layout="position" animates the move with transforms (FLIP) and
          // leaves the size alone. Keys must be stable ids, never the index.
          <motion.li
            key={item.id}
            layout="position"
            transition={{ duration: 0.3, ease: [0.77, 0, 0.175, 1] }}
          >
            {item.label}
          </motion.li>
        ))}
      </ul>
    </MotionConfig>
  )
}
```

## Accessibility

Reorder the DOM, not only the picture, so Tab order and screen readers follow what is on screen: with fixed slots, re-sort once the move ends. Announce the new position of a moved card in a polite live region. Reorders made from the keyboard should not animate. Under reduced motion, skip the animation and let cards jump to their new places.

## Related

- [Ease-out](https://moveset.lucaslima.design/terms/ease-out)
- [Duration](https://moveset.lucaslima.design/terms/duration)

## Often confused with

- [Ease-in-out vs Ease-out](https://moveset.lucaslima.design/compare/ease-in-out-vs-ease-out): Ease-out starts fast and settles; use it for things entering or reacting. Ease-in-out speeds up then slows; use it for things already on screen moving from A to B.

Source: https://moveset.lucaslima.design/terms/ease-in-out
