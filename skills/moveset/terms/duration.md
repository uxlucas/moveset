# Duration

Also called: timing, how long it takes, animation length, feels slow, too fast, ms, animation speed

> How long an animation takes, which decides whether it feels instant, smooth or slow.

Duration is how long an animation runs from start to finish, and it shapes how an interface feels: a 180ms dropdown reads as a response, the same dropdown at 400ms reads as the interface thinking. Product UI stays at or under 300ms. Exits run about 25% faster than enters, because the user has already moved on. Size and distance pick the spot inside the range: a tooltip that moves a few pixels needs less time than a sheet crossing the screen, so one number is right for one element and wrong for the next. Something used 100+ times a day gets no animation at all.

## Use when

- Hover, press and color changes: 100 to 150ms.
- Tooltips and small popovers: 125 to 200ms. Menus and dropdowns: 150 to 250ms.
- Dialogs, drawers, sheets and toasts: 200 to 300ms.
- Page-level transitions: 300 to 400ms, the only place UI goes past 300ms.

## Avoid when

- Anything in product UI over 300ms, other than a page-level transition. If it feels slow, cut the duration before touching the curve.
- A duration inherited from a snippet or a library default. Pick it from the kind of element and how far it moves.
- One duration for every element. At 300ms a sheet is right and a tooltip drags.
- Exits as long as enters. The user has decided; let it go about 25% faster.
- Actions used 100+ times a day, or changes driven by the keyboard inside a component (arrow-key highlight, shortcut toggles). Give them no animation at all, not a shorter one.

## Prompt

```text
Time this dropdown.

- Tokens: `--duration-1: 150ms; --duration-2: 200ms; --duration-3: 250ms; --duration-4: 300ms; --ease-out: cubic-bezier(0.23, 1, 0.32, 1)`.
- By kind, for reference: hover and color 100 to 150ms (`--duration-1`, `ease`); press `--duration-1` on `--ease-out`; tooltips 125 to 200ms; menus and dropdowns 150 to 250ms (`--duration-2`); dialogs and toasts `--duration-3`; drawers and sheets `--duration-4`. Only page-level transitions pass 300ms, 400ms at most.
- Exits of overlays (menus, tooltips, dialogs, sheets, toasts): enter × 0.75, `calc(var(--duration-N) * 0.75)`. Hover and press are symmetric.
- Bigger elements and longer travel take the long end; never one duration for everything.
- Used 100+ times a day, or driven by the keyboard inside a component (arrow-key highlight, shortcut toggles): no animation.
- This dropdown: open 200ms (`var(--duration-2)`), close 150ms (`calc(var(--duration-2) * 0.75)`); `opacity` 0 and `transform: scale(0.95)` to `none`, `transform-origin` at the trigger; `var(--ease-out)`.
- CSS route: `transition-property: opacity, transform`; the base rule holds the close duration, `[data-open]` the open; closed, it stays mounted with `inert`.
- Motion route: `transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}`, `exit={{ …, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }}`, inside `AnimatePresence`; `useReducedMotion()` drops the scale.
- Arrow-key highlight inside the menu: instant.
- Reduced motion: no scale, `opacity` only, same durations.
```

### Acceptance checklist

- [ ] CSS route: the dropdown's computed `transition-duration` is `0.2s` with `[data-open]` and `0.15s` without. Motion route: the `transition` durations are 0.2 in and 0.15 out.
- [ ] The close is configured at no more than 75% of the open: 150ms against 200ms.
- [ ] Its computed `transition-timing-function` is `cubic-bezier(0.23, 1, 0.32, 1)` (CSS route).
- [ ] No transition or animation in the UI is longer than 0.3s, except page-level transitions, which stay at or under 0.4s.
- [ ] Hover and press changes finish within 150ms.
- [ ] Moving the highlight with the arrow keys shows in the next frame with no transition.
- [ ] With reduced motion on, the dropdown fades without changing size, over the same durations.

## Code

### CSS

```css
/* Durations by kind of element. Product UI stays at or under --duration-4;
   only page-level transitions go past it, to 400ms at most. */
:root {
  --duration-1: 150ms; /* hover, press, color; tooltips */
  --duration-2: 200ms; /* menus, dropdowns, popovers */
  --duration-3: 250ms; /* dialogs, toasts */
  --duration-4: 300ms; /* drawers, sheets: the ceiling */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
}

/* Hover and press: --duration-1 each way; color on ease, the press scale on
   --ease-out. */
.button {
  transition-property: background-color, scale;
  transition-duration: var(--duration-1);
  transition-timing-function: ease, var(--ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .button:hover {
    background-color: var(--button-hover);
  }
}
.button:active {
  scale: 0.97;
}

/* The dropdown. A transition takes the duration of the state it heads to:
   this closed rule times the close, [data-open] the open. To open, set
   data-open and remove inert; to close, the reverse. */
.dropdown {
  transform-origin: top left; /* grow out of the trigger */
  opacity: 0;
  transform: scale(0.95);
  transition-property: opacity, transform;
  transition-timing-function: var(--ease-out);
  transition-duration: calc(var(--duration-2) * 0.75); /* close: 150ms */
}
.dropdown[data-open] {
  opacity: 1;
  transform: none;
  transition-duration: var(--duration-2);
}

/* Arrow keys move the highlight: no transition, ever. */
.dropdown [role="menuitem"] {
  transition-property: none;
}

@media (prefers-reduced-motion: reduce) {
  .button:active {
    scale: none;
  }
  /* No scale: a fade over the same durations. */
  .dropdown,
  .dropdown[data-open] {
    transform: none;
  }
}
```

### Motion

```tsx
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

// Seconds by kind: hover, press and tooltip 0.15, dropdown 0.2, dialog and
// toast 0.25, sheet 0.3; only page-level transitions go past that, to 0.4.
// Exits run at 0.75 × the enter.
export function Dropdown({ open, children }: { open: boolean; children: ReactNode }) {
  // Reduced motion: no scale, a fade over the same durations.
  const hidden = { opacity: 0, scale: useReducedMotion() ? 1 : 0.95 }
  const shown = { opacity: 1, scale: 1 }
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="dropdown-panel"
          style={{ transformOrigin: 'top left' }}
          initial={hidden}
          animate={shown}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          exit={{ ...hidden, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

## Accessibility

Duration has no accessibility cost of its own as long as nothing waits for it: make the element usable from the first frame of the enter, and move focus when it opens, not when the animation ends. Changes made from the keyboard inside a component should not animate. Under reduced motion, drop the movement and keep at most a fade over the same short durations.

## Related

- [Ease-out](https://moveset.lucaslima.design/terms/ease-out)
- [Ease-in-out](https://moveset.lucaslima.design/terms/ease-in-out)
- [Enter and Exit](https://moveset.lucaslima.design/terms/enter-and-exit)
- [Spring](https://moveset.lucaslima.design/terms/spring)
- [Stagger](https://moveset.lucaslima.design/terms/stagger)

Source: https://moveset.lucaslima.design/terms/duration
