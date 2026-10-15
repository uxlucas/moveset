# Spring

Also called: physics-based animation, springy motion, bouncy, it bounces a bit, spring physics, stiffness and damping

> Motion driven by physics instead of a fixed duration, so it can carry velocity and settle naturally.

A spring moves an element the way a weight on a spring would, instead of following a curve over a set time. It always knows its own velocity, so a new target mid-move picks up from where the element is and how fast it is going: it slows, turns and settles, where a curve would drop its speed and snap into reverse, or stop and start over. Duration and bounce are the easy way to reason about it: duration is roughly how long it takes to settle, and bounce 0 settles without passing the target, the default for product UI. Design it in duration and bounce; when it can be redirected, ship the matching stiffness and damping, because Motion 14 drops velocity on duration/bounce springs.

## Use when

- Gesture-driven motion: sheets, swipe to dismiss, a drag released with momentum.
- Anything the user can interrupt or reverse mid-move, like a toggle clicked twice quickly.
- Things meant to feel physical, like a knob, a card that settles into a slot or a Dynamic Island-style morph.

## Avoid when

- Dialogs, menus and icon swaps: use bounce 0 or an ease-out curve. Bounce belongs on marketing and decorative moments.
- Bounce above 0.3, anywhere. Product UI ships bounce 0.
- Changes triggered from the keyboard. Do not animate them.
- Moves with a set rhythm, like a progress bar or a marquee. Use a curve or linear.

## Prompt

```text
Animate this card between two spots with a spring.

- Setup: the card is a `<button type="button">`; each click toggles it between A (`x: 0`) and B (`x: 240px`) and sets `aria-pressed`. Mid-move it retargets from where it is; never restart or queue.
- Spring: `{ type: "spring", duration: 0.5, bounce: 0 }`, settled by 500ms. Bounce 0, the product UI default: never passes the target.
- Motion route (no curve, no `transition-duration`): `const x = useMotionValue(0)`, `style={{ x }}`; each click `animate(x, target, { ...spring, velocity: x.getVelocity() })`, `spring` = `{ type: "spring", stiffness: 341, damping: 36.9, mass: 1 }`. Motion hands each new animation the current velocity, but Motion 14 drops it on `duration`/`bounce` (and `visualDuration`) springs; the physics form keeps it. `transform` strings have no velocity.
- One-shots (entrances): `animate={{ transform: "translateX(240px)" }}` with the duration/bounce form runs on the compositor.
- `transform` only; never `left` or `margin`.
- CSS route: `transition: transform 500ms linear(…)`, at least 20 points sampled from the spring. No velocity: reversed mid-move it flips direction at speed.
- Reduced motion, or a keyboard click (`event.detail === 0`): the card is at its target next frame, no travel. Motion: `x.jump(target)`; CSS: `transition: none`. Entrances fade in at their end spot over 150ms instead.
```

### Acceptance checklist

- [ ] Motion route: the card has no CSS transition on `transform` (computed `transition-duration` is `0s`).
- [ ] All routes: left alone, a move is settled by 500ms (±1 frame): from then on `x` stays within 0.5px of the spot.
- [ ] All routes: sampled every frame, `x` never passes the target: at most 240.5px on the way to B, at least -0.5px on the way to A.
- [ ] Motion route: after a mid-flight click, the next frame still moves toward the old target by less than the frame before; it then turns once and never reverses within a single frame.
- [ ] Motion route: five clicks within a second never jump and never queue; each click retargets at once from where the card is.
- [ ] CSS route: clicked mid-move, the card heads for the other spot from where it is, with no jump in position; it reverses at speed, since CSS keeps no velocity.
- [ ] All routes: only `transform` changes; the card's `offsetLeft` stays the same throughout.
- [ ] All routes: with reduced motion on, or activated with Enter or Space, the card is painted at its target in the first frame after the event, with no in-between positions.

## Code

### CSS

```css
/* { type: "spring", duration: 0.5, bounce: 0 } sampled into linear() with
   Motion's spring(). A fixed curve keeps no velocity: reversed mid-move it
   flips direction at speed. For anything the user can redirect, use the JS
   or Motion tab. */
:root {
  --spring: linear(
    0, 0.058, 0.18, 0.321, 0.455, 0.573, 0.671, 0.75, 0.812,
    0.86, 0.897, 0.924, 0.944, 0.96, 0.971, 0.979, 0.985, 0.989,
    0.992, 0.994, 0.996, 0.997, 0.998, 0.999, 1
  );
}

/* Markup: <button class="card" aria-pressed="false">…</button>. On click,
   toggle data-side="b" and aria-pressed. */
.card {
  /* transform only: never left or margin, which relayout every frame. */
  transition: transform 500ms var(--spring);
}
.card[data-side="b"] {
  transform: translateX(240px);
}

/* A click from the keyboard jumps too: in the click handler, set data-instant
   when event.detail === 0 (Enter or Space) and remove it otherwise. */
.card[data-instant] {
  transition: none;
}

/* Reduced motion: no travel. */
@media (prefers-reduced-motion: reduce) {
  .card {
    transition: none;
  }
}
```

### JS

```js
import { animate, motionValue } from 'motion'

// { type: 'spring', duration: 0.5, bounce: 0 } as physics, the same path: Motion 14
// drops the current velocity on duration/bounce (and visualDuration) springs;
// the physics form keeps it.
const spring = { type: 'spring', stiffness: 341, damping: 36.9, mass: 1 }
const reduced = matchMedia('(prefers-reduced-motion: reduce)')

// Not the CSS tab's .card: its transition would fight the transform written every frame.
const card = document.querySelector('.spring-card')
// A number Motion can measure velocity on; a transform string has none.
const x = motionValue(0)
x.on('change', (v) => (card.style.transform = `translateX(${v}px)`))
let side = 'a'

card.addEventListener('click', (event) => {
  side = side === 'a' ? 'b' : 'a'
  card.setAttribute('aria-pressed', String(side === 'b'))
  const to = side === 'b' ? 240 : 0
  // Reduced motion, or a click from the keyboard (detail 0): no travel.
  if (reduced.matches || event.detail === 0) return x.jump(to)
  // Retargets mid-move; the velocity is passed explicitly so the handoff does
  // not depend on when Motion samples it. Never wait for the move to end.
  animate(x, to, { ...spring, velocity: x.getVelocity() })
})
```

### Motion

```tsx
import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import { useState, type MouseEvent } from 'react'

// { type: 'spring', duration: 0.5, bounce: 0 } as physics, the same path: Motion 14
// drops the current velocity on duration/bounce (and visualDuration) springs;
// the physics form keeps it. For a one-shot move nothing interrupts, the
// duration/bounce form in a transition prop works as written.
const spring = { type: 'spring', stiffness: 341, damping: 36.9, mass: 1 } as const

export function SpringCard() {
  const [on, setOn] = useState(false)
  const reduced = useReducedMotion()
  // A number Motion can measure velocity on; a transform string has none.
  const x = useMotionValue(0)

  const toggle = (event: MouseEvent) => {
    const to = on ? 0 : 240
    setOn(!on)
    // Reduced motion, or a click from the keyboard (detail 0): no travel.
    if (reduced || event.detail === 0) return x.jump(to)
    // Retargets mid-move; the velocity is passed explicitly so the handoff does
    // not depend on when Motion samples it. Never wait for the move to end.
    animate(x, to, { ...spring, velocity: x.getVelocity() })
  }

  return (
    <motion.button
      type="button"
      // Not the CSS tab's .card: its transition would fight the transform Motion
      // writes every frame.
      className="spring-card"
      aria-pressed={on}
      onClick={toggle}
      style={{ x }}
    />
  )
}
```

## Accessibility

Make the moving card a real `<button>` and keep its state in `aria-pressed`, updated on click rather than when the motion settles, so assistive tech never waits for the spring. Do not animate changes made from the keyboard. Under reduced motion, skip the travel and put the element in its new place at once; for something entering, a 150ms opacity fade is enough.

## Related

- [Ease-out](https://moveset.lucaslima.design/terms/ease-out)
- [Overshoot](https://moveset.lucaslima.design/terms/overshoot)

## Often confused with

- [Spring vs Overshoot](https://moveset.lucaslima.design/compare/overshoot-vs-spring): A spring is the physics; overshoot is one thing a spring (or a back curve) can do. A spring with bounce 0 never overshoots.

Source: https://moveset.lucaslima.design/terms/spring
