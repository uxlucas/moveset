# Overshoot

Also called: bounce-in, back easing, goes a bit past and comes back, elastic, pop in, easeOutBack

> Motion that travels slightly past its target before settling back, giving a small sense of energy.

Overshoot carries an element a little past its target before it settles back, so the arrival has some energy, like a ball that rolls a touch too far. It comes from a back curve, a cubic-bezier whose first y value is above 1, or from a spring with bounce: bounce is the setting, overshoot is what you see, and a bounce of 0 never overshoots. The amount is a share of the distance travelled, so the same curve reads stronger on a long move than a short one. Around 2 to 5% reads as life; more reads as a cartoon.

## Use when

- Playful, physical arrivals: a like, a toggle knob, a card released into its slot after a drag.
- Success states and rare first-time moments, like finishing onboarding.

## Avoid when

- Dialogs, menus, popovers and icon swaps. A wobble on something that informs or interrupts reads as unsteady; use ease-out.
- Anything used often or meant to feel precise, like a slider thumb, a tab indicator or a drag that follows the finger.
- Exits and returns. Overshoot marks an arrival; leaving stays plain and faster.
- Text and opacity. Text that wobbles is hard to read, and opacity clamps at 1, so an overshooting fade just ends early.
- More than about 5% in product UI, or any spring bounce over 0.3.
- Changes from the keyboard. Do not animate them.

## Prompt

```text
Give this element a slight overshoot when it arrives.

- Setup: a `<button type="button">`; each click toggles it between its start (`translateX(0)`) and its target (`translateX(240px)`, the travel) and sets `aria-pressed`.
- Arrival: `transform` only, 300ms, `cubic-bezier(0.34, 1.3, 0.64, 1)`: 3% of the travel past the target; settled on the target by 300ms from the first animated frame.
- Return: 225ms `cubic-bezier(0.23, 1, 0.32, 1)` (ease-out), no overshoot.
- CSS route: `[data-placed]` (at the target) holds the arrival (300ms, the curve above); the base rule holds the return. Motion route: `animate={{ x }}`, `initial={false}`, `{ duration: 0.3, ease: [0.34, 1.3, 0.64, 1] }` on the way in.
- Only `transform` (translate or scale) takes the curve: never `opacity` (it clamps at 1) or layout properties. Not on exits, dialogs, menus or text.
- Keyboard click (`event.detail === 0`) or reduced motion: no animated travel; at the target next frame. CSS: set `data-instant` from `event.detail === 0`, `[data-instant] { transition-property: none }` after the placed rule, plus `@media (prefers-reduced-motion: reduce)`; Motion: `useReducedMotion()`, `duration: 0` chosen in the same render as `x`.
```

### Acceptance checklist

- [ ] Sampled every frame on the way to the target, `x` peaks once at 240 × 1.030 = 247.2px (±1% of the travel, ±2.4px), then settles.
- [ ] By 300ms from the first animated frame, `x` is within 0.5px of 240px and stays there.
- [ ] Returning, `x` never goes below -0.5px and is home by 225ms: no overshoot on the way back.
- [ ] Only `transform` changes: `opacity` stays put and `offsetLeft` never changes.
- [ ] Activated with Enter or Space, or with reduced motion on, the element is painted at its target in the first frame after the event, with no in-between positions.

## Code

### CSS

```css
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  /* A back curve: y1 above 1 carries it 3% of the travel past the
     target before it settles. 3% is cubic-bezier(0.34, 1.3, 0.64, 1), 8%
     (0.34, 1.5, 0.64, 1), 15% (0.34, 1.72, 0.64, 1). The common easeOutBack,
     (0.34, 1.56, 0.64, 1), goes about 10% past. */
  --arrive: cubic-bezier(0.34, 1.3, 0.64, 1);
}

/* Markup: <button class="chip" aria-pressed="false">…</button>. On click,
   toggle data-placed and aria-pressed. A curve with y above 1 would push
   any property past its end, so keep it on transform: opacity clamps at 1
   (the fade just ends early), and layout properties relayout every frame. */
.chip {
  transition-property: transform;
  /* A transition takes the timing of the state it heads to. Going home:
     plain ease-out, 225ms, no overshoot. */
  transition-duration: 225ms;
  transition-timing-function: var(--ease-out);
}
.chip[data-placed] {
  transform: translateX(240px);
  transition-duration: 300ms;
  transition-timing-function: var(--arrive);
}

/* A click from the keyboard lands at once: in the click handler, set
   data-instant when event.detail === 0 (Enter or Space), remove it otherwise. */
.chip[data-instant] {
  transition-property: none;
}

/* Reduced motion: no overshoot and no travel; it is in place at once. */
@media (prefers-reduced-motion: reduce) {
  .chip {
    transition-property: none;
  }
}
```

### Motion

```tsx
import { motion, useReducedMotion } from 'motion/react'
import { useState, type MouseEvent } from 'react'

// Arriving: about 3% of the travel past the target, then settled.
const arrive = { duration: 0.3, ease: [0.34, 1.3, 0.64, 1] } as const
// Going home: plain ease-out, faster, no overshoot.
const leave = { duration: 0.225, ease: [0.23, 1, 0.32, 1] } as const

export function Chip() {
  const [placed, setPlaced] = useState(false)
  const [instant, setInstant] = useState(false)
  const reduced = useReducedMotion()

  const toggle = (event: MouseEvent) => {
    // A click from the keyboard (Enter or Space report detail 0) lands at once.
    setInstant(event.detail === 0)
    setPlaced(!placed)
  }

  return (
    <motion.button
      type="button"
      className="overshoot-chip"
      aria-pressed={placed}
      onClick={toggle}
      // No animation on mount: it starts where it is.
      initial={false}
      // x is transform only. Never animate opacity or a layout property on this curve.
      animate={{ x: placed ? 240 : 0 }}
      // Reduced motion or a keyboard click: no animated travel. Chosen in the same
      // render as x, so the move never runs on the previous transition.
      transition={reduced || instant ? { duration: 0 } : placed ? arrive : leave}
    />
  )
}
```

## Accessibility

Overshoot is extra movement, so under reduced motion drop it along with the travel: put the element at its target at once, or for something entering, fade it in over 150ms. Changes made from the keyboard land at once too. Update the state (`aria-pressed`, checked) on the click, not when the motion settles.

## Related

- [Spring](https://moveset.lucaslima.design/terms/spring)
- [Ease-out](https://moveset.lucaslima.design/terms/ease-out)
- [Icon Swap](https://moveset.lucaslima.design/terms/icon-swap)

## Often confused with

- [Overshoot vs Spring](https://moveset.lucaslima.design/compare/overshoot-vs-spring): A spring is the physics; overshoot is one thing a spring (or a back curve) can do. A spring with bounce 0 never overshoots.

Source: https://moveset.lucaslima.design/terms/overshoot
