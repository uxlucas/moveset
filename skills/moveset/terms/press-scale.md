# Press Scale

Also called: scale on press, active scale, button press animation, tap feedback, press feedback, pressed state

> A button shrinks slightly while pressed, so the click feels physical.

Press feedback answers the finger: while a button is held it scales down a little, and when it is let go it comes back. The amount is small, 0.97 (Emil ships 0.96 to 0.97), and never below 0.95, where it starts to read as cartoon. What makes it feel right is the transition: 150ms on an ease-out curve, declared on the base rule, so it runs both ways: a quick tap or a release mid-press glides back instead of snapping. The layout box never changes, and the hit area is a 46px pseudo-element that scales with the button, so it is still over 44px while pressed at 0.97. And not every button needs it: dense or high-frequency controls opt out with a colour change instead.

## Use when

- Primary and secondary buttons, cards that act as buttons, and chips: anything pressed a few times a session.
- Touch targets, where the finger covers the control and the scale is the only sign the press landed.
- Icon buttons with a hit area extended by a pseudo-element: 46px at rest, so it is still over 44px while pressed at 0.97.

## Avoid when

- Dense or high-frequency UI: toolbars, list rows, keyboard-driven menus, anything used 100+ times a day. A 150ms colour change, or nothing.
- Scales under 0.95. The button reads as a toy.
- A transition declared only on the pressed state, or none at all: the release snaps.
- Links in running text and anything that moves on press for another reason (a drag handle, a slider thumb).

## Prompt

```text
Give this button press feedback.

- Pressed: `scale: 0.97`, `transform-origin: center`. Emil ships 0.96 to 0.97; never below 0.95 (cartoon).
- Transition: `transition: scale 150ms var(--ease-out)` (`--duration-1`) on the base rule, not the pressed one (both directions).
- CSS route: pressed selector `:not(:disabled):active`: the pointer, and Space held (Enter clicks with no press). A press driven from JS (pointer capture, a loop) sets `data-pressed="true"`; style both.
- Hit area: the button `position: relative`; its `::after`: `content: ""`, `position: absolute`, `inset: 50% auto auto 50%`, `translate: -50% -50%`, `width` and `height` `max(100%, 46px)`; it scales with the button (44.6px while pressed); the layout box never changes.
- Opt-out: dense or high-frequency controls (toolbars, list rows, 100+ uses a day) get `background-color: var(--button-pressed)` (`#e0e0e0`) over 150ms `ease` and `scale: none`: `data-still` (CSS) or a `still` prop (Motion).
- Motion route: `whileTap={{ scale: 0.97 }}`, `transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}`: the pointer, and Enter held (not Space); `still`: `whileTap={{ backgroundColor: "#e0e0e0" }}`. No CSS transition on `scale` there.
- Reduced motion: keep the pressed scale, drop the transitions (the colour one too). CSS: `transition: none` under `prefers-reduced-motion: reduce`, repeated for `[data-still]`; Motion: `useReducedMotion()` sets `transition={{ duration: 0 }}`.
```

### Acceptance checklist

- [ ] CSS route: the button's computed `transition-property` is `scale`, `transition-duration` `0.15s` and `transition-timing-function` `cubic-bezier(0.23, 1, 0.32, 1)`, the same at rest and while pressed. Motion route: the `transition` prop is `{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }` (in the source; the computed transition is not it).
- [ ] Pressed and held, sampled every frame from `pointerdown`: the scale (computed `scale`, or the first value of the `transform` matrix) falls from 1 toward 0.97 without passing it, with in-between frames, and is within 0.001 of 0.97 by 150ms (±1 frame); held longer, it stays there.
- [ ] Released, the scale rises from 0.97 back to 1 without passing it and is within 0.001 of 1 by 150ms (±1 frame) from `pointerup`.
- [ ] Released 50ms into the press, it turns back from where it is: no frame step larger than 0.015 in `scale` (half the press depth), and it never reaches 0.97.
- [ ] The primary button's `offsetWidth` and `offsetHeight` never change during a press. `elementFromPoint` 21px above and 21px below its centre (edges exclusive) returns the button at rest and while pressed: the `::after` is 46px, 44.6px pressed.
- [ ] Held with the pointer, it presses on both routes. Held from the keyboard, Space presses the CSS route and Enter the Motion route; the other key activates it with no feedback. `keyup` releases.
- [ ] A `data-still` (or `still`) control pressed the same way keeps `scale` at `none` (`transform` identity) in every frame and changes only its colour, to `#e0e0e0`, over 150ms.
- [ ] With reduced motion on, the scale is 0.97 within two frames of `pointerdown` (CSS: the first frame) and 1 within two frames of `pointerup`, with no in-between frames.

## Code

### CSS

```css
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --duration-1: 150ms;
  --button-pressed: #e0e0e0; /* one grey step under the resting #f0f0f0 */
}

/* Markup: <button class="button" type="button">Save</button>. Dense or
   high-frequency controls (toolbars, list rows, 100+ uses a day) add
   data-still: a colour change on press, no scale. */
.button {
  position: relative;
  transform-origin: center;
  /* On the base rule, not :active, so press and release both glide and a
     release mid-press turns back from where it is. */
  transition: scale var(--duration-1) var(--ease-out);
}
/* The hit area: 46px whatever the visual size. It sits inside the button, so it
   scales with the press (44.6px at 0.97); the layout box never changes. */
.button::after {
  content: '';
  position: absolute;
  inset: 50% auto auto 50%;
  width: max(100%, 46px);
  height: max(100%, 46px);
  translate: -50% -50%;
}
/* :active fires for the pointer and Space held; Enter clicks on keydown with no
   press. A press driven from JS (pointer capture, a loop) sets data-pressed="true". */
.button:not(:disabled):active,
.button[data-pressed="true"] {
  scale: 0.97; /* Emil ships 0.96 to 0.97; never below 0.95 */
}

.button[data-still] {
  transition: background-color var(--duration-1) ease;
}
.button[data-still]:not(:disabled):active,
.button[data-still][data-pressed="true"] {
  scale: none;
  background-color: var(--button-pressed);
}

/* Reduced motion: the pressed scale stays (feedback, not motion); the transitions go. */
@media (prefers-reduced-motion: reduce) {
  .button,
  .button[data-still] {
    transition: none;
  }
}
```

### Motion

```tsx
import { motion, useReducedMotion } from 'motion/react'
import type { ComponentProps } from 'react'

const ease = [0.23, 1, 0.32, 1] as const
// The button is its own hit area, 46px so it is still over 44px while pressed
// (44.6px at 0.97); the layout box never changes.
const box = { position: 'relative', minBlockSize: 46, minInlineSize: 46, transformOrigin: 'center' } as const
// The opt-out's colours: the resting grey and one step under it.
const surface = '#f0f0f0'
const pressed = '#e0e0e0'

type Props = ComponentProps<typeof motion.button> & {
  // Dense or high-frequency controls (toolbars, list rows, 100+ uses a day): no scale.
  still?: boolean
}

export function Button({ still = false, style, ...rest }: Props) {
  // Reduced motion: the pressed scale stays (feedback, not motion); the transition goes.
  const reduced = useReducedMotion()
  return (
    <motion.button
      type="button"
      style={{ ...box, backgroundColor: still ? surface : undefined, ...style }}
      // whileTap covers the pointer and Enter held (not Space, which activates with
      // no press), and ends on pointerup anywhere or pointercancel.
      // Emil ships 0.96 to 0.97; never below 0.95, which starts to read as cartoon.
      whileTap={still ? { backgroundColor: pressed } : { scale: 0.97 }}
      transition={reduced ? { duration: 0 } : { duration: 0.15, ease }}
      {...rest}
    />
  )
}
```

## Accessibility

Press feedback is a `<button>` concern: use a real button, so Space and Enter both activate it whatever the feedback does. The feedback is a pointer affordance: `:active` also answers Space held and Motion's `whileTap` Enter held, and the other key activates with no press. Keep the hit area at least 46px at rest with a pseudo-element: it scales with the press and is still over 44px at 0.97. Disabled buttons do not press (`:not(:disabled)`). Under reduced motion keep the pressed scale, which is feedback, and drop the transition, which is motion.

## Related

- [Spring](https://moveset.lucaslima.design/terms/spring)
- [Duration](https://moveset.lucaslima.design/terms/duration)
- [Ease-out](https://moveset.lucaslima.design/terms/ease-out)
- [Icon Swap](https://moveset.lucaslima.design/terms/icon-swap)
- [Overshoot](https://moveset.lucaslima.design/terms/overshoot)

Source: https://moveset.lucaslima.design/terms/press-scale
