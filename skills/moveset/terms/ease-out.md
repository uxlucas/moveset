# Ease-out

Also called: starts fast and slows down, decelerate, snappy entrance, ease out, deceleration curve

> Motion that starts fast and slows into place, the default for anything responding to the user.

Ease-out is a timing curve that covers most of the distance early and spends the rest of the time settling. On something entering, that fast start means it visibly answers the click within the first frames, so the interface feels quick even at 200ms. The built-in CSS ease-out keyword is too gentle for this: a tenth of the way through it has covered 16% of the distance, where the house curve, cubic-bezier(0.23, 1, 0.32, 1), has covered 40%.

## Use when

- Anything entering or leaving: menus, popovers, dialogs, tooltips, toasts.
- Anything answering a click or tap, like a panel opening or a pressed button.
- When you are unsure which curve to use.

## Avoid when

- Elements already on screen moving from A to B, like a reorder or a sliding tab indicator. Use ease-in-out.
- Hover and color changes. Use ease at 150ms.
- Constant-rate motion, like a marquee, a spinner or progress that is time. Use linear.
- Actions used 100+ times a day or triggered from the keyboard. Do not animate them at all.
- Never ease-in on its own for UI: the slow start makes every click feel late.

## Prompt

```text
Animate this menu open and closed.

- Open: `opacity` 0 to 1, `transform: scale(0.95)` to `none`, 200ms `var(--ease-out)` (`cubic-bezier(0.23, 1, 0.32, 1)`).
- Close: back to `opacity: 0; transform: scale(0.95)`, 150ms, same curve.
- Menu: `position: absolute; top: calc(100% + 4px); left: 0` in a `position: relative` wrapper with the trigger; `transform-origin: top left` (Radix `--radix-popper-transform-origin`, Base UI `--transform-origin`).
- CSS route: `data-open` present = open. `transition-property: opacity, transform`; base rule `transition-duration: 150ms` (close), `[data-open]` `200ms` (open). Transitions, not keyframes: closing mid-open reverses from the current state.
- CSS route, closed: stays mounted, `inert`, `pointer-events: none`.
- Motion route: `AnimatePresence`, unmounts after the exit; during the exit set `pointer-events: none` and `aria-hidden` (`useIsPresent()`). `initial`/`exit` `{ opacity: 0, scale: 0.95 }`, `animate` `{ opacity: 1, scale: 1 }`, `ease: [0.23, 1, 0.32, 1]`, 0.2s in, 0.15s out; `transformOrigin: 'top left'` in `style`.
- Focus: Escape or choosing an item closes and returns focus to the trigger; an outside click closes without moving focus.
- Reduced motion: no scale, opacity only, same durations. CSS: `transform: none` on both states in `@media (prefers-reduced-motion: reduce)`. Motion: `useReducedMotion()`, keep `scale` at 1.
```

### Acceptance checklist

- [ ] Open, the menu's computed `transition-timing-function` is `cubic-bezier(0.23, 1, 0.32, 1)` and `transition-duration` is `0.2s` (CSS route).
- [ ] Closed, its computed `transition-duration` is `0.15s`: closing takes 150ms, no more than 75% of opening (CSS route).
- [ ] Opening starts at 95% size and opacity 0, never from `scale(0)`.
- [ ] The menu grows out of the trigger: its top-left corner stays put while it scales.
- [ ] Closing while it is still opening reverses from its current size and opacity, without first jumping to fully open.
- [ ] Closed, the menu cannot be clicked, focused or reached by a screen reader; while the exit plays it takes no clicks.
- [ ] Escape or choosing an item closes the menu and returns focus to the trigger; a click outside closes it without moving focus.
- [ ] With reduced motion on, the menu fades in and out without changing size.

## Code

### CSS

```css
/* The house ease-out: the fast start is the feedback, the long settle is the rest. */
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
}

/* Markup: <div class="menu-wrap"><button aria-expanded="false">…</button>
   <div class="menu" inert>…</div></div>. To open, set data-open on the menu
   and remove inert; to close, the reverse. */
.menu-wrap {
  position: relative;
}

/* Stays mounted while closed so it can animate out; inert hides it meanwhile. */
.menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  /* Grow out of the trigger. Radix: var(--radix-popper-transform-origin);
     Base UI: var(--transform-origin). */
  transform-origin: top left;
  opacity: 0;
  transform: scale(0.95); /* a visible shape from the first frame, never 0 */
  pointer-events: none;
  transition-property: opacity, transform;
  /* A transition takes the duration of the state it heads to: this closed
     rule times the close, [data-open] the open. */
  transition-duration: 150ms; /* close: about 25% faster */
  transition-timing-function: var(--ease-out);
}

/* A transition, not keyframes: closing mid-open reverses from where it is. */
.menu[data-open] {
  opacity: 1;
  transform: none;
  pointer-events: auto;
  transition-duration: 200ms;
}

/* Reduced motion: fade only. */
@media (prefers-reduced-motion: reduce) {
  .menu,
  .menu[data-open] {
    transform: none;
  }
}
```

### Motion

```tsx
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

// Ease-out quint, the house --ease-out.
// Render it inside a position: relative wrapper with the trigger.
export function Menu({ open, children }: { open: boolean; children: ReactNode }) {
  return <AnimatePresence>{open && <MenuPanel>{children}</MenuPanel>}</AnimatePresence>
}

function MenuPanel({ children }: { children: ReactNode }) {
  // false while the exit plays: the closing menu takes no clicks and is hidden
  // from screen readers.
  const present = useIsPresent()
  // Reduced motion: fade only.
  const from = useReducedMotion() ? 1 : 0.95
  return (
    <motion.div
      // Not the CSS tab's .menu: its transition would fight the transform Motion
      // writes every frame. .menu-panel only positions the panel below the trigger.
      className="menu-panel"
      aria-hidden={present ? undefined : true}
      // Grow out of the trigger.
      style={{ transformOrigin: 'top left', pointerEvents: present ? 'auto' : 'none' }}
      initial={{ opacity: 0, scale: from }}
      animate={{ opacity: 1, scale: 1, transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] } }}
      // Closing runs about 25% faster; reopened mid-exit, it comes back from where it is.
      exit={{ opacity: 0, scale: from, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }}
    >
      {children}
    </motion.div>
  )
}
```

## Accessibility

Keep the closed menu out of the tab order and the accessibility tree: inert while it stays mounted, or unmounted once the exit ends and click-through while the exit plays. When it opens from the keyboard, move focus into it; Escape or choosing an item returns focus to the trigger, an outside click leaves focus where it is. Under reduced motion, drop the scale and keep a short fade, so the menu still appears without moving.

## Related

- [Ease-in-out](https://moveset.lucaslima.design/terms/ease-in-out)
- [Duration](https://moveset.lucaslima.design/terms/duration)
- [Enter and Exit](https://moveset.lucaslima.design/terms/enter-and-exit)
- [Spring](https://moveset.lucaslima.design/terms/spring)

## Often confused with

- [Ease-out vs Ease-in-out](https://moveset.lucaslima.design/compare/ease-in-out-vs-ease-out): Ease-out starts fast and settles; use it for things entering or reacting. Ease-in-out speeds up then slows; use it for things already on screen moving from A to B.

Source: https://moveset.lucaslima.design/terms/ease-out
