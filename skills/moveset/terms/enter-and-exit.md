# Enter and Exit

Also called: entrance and exit, mount and unmount animation, appear and disappear, fade in and out, exit animation, enter animation, AnimatePresence

> The animations an element plays when it is added to the screen and when it is removed.

An enter announces something new: it fades in and travels a short way from where it belongs, over 200 to 250ms on an ease-out curve. The exit is the quieter half of the pair. By the time something leaves, attention has moved on, so it fades with a nudge of a few pixels toward where it came from, about 25% faster, and never slides its full height back. The two are not mirror images. And anything already in place at first paint plays no entrance at all: enters and exits are for changes the user caused.

## Use when

- Toasts, dialogs, popovers, menus and tooltips: anything added to the screen and later removed.
- List items, tags and chips that come and go while the rest stays.
- Anything opened or dismissed from the keyboard: the change still adds or removes something.

## Avoid when

- Content already in place when the page first paints. No entrance; it is just there.
- An exit that mirrors the enter: the full travel at the full duration. Cut the distance to a few pixels and the time by about 25%.
- An exit that cuts straight to nothing when the enter animated. Fade it, and leave a hint of direction.
- Drawers and sheets. They slide fully off, matching their enter, on the drawer curve.
- Highlight moves inside a component (arrow keys, shortcut toggles): no animation.

## Prompt

```text
Give this toast an enter and an exit. Bottom centre of its `position: relative` container, 16px up.

- Enter: `opacity` 0 to 1 and `transform: translateY(16px)` to `none`, 200ms (`var(--duration-2)`), `var(--ease-out)`.
- Exit: `opacity` 1 to 0 and `translateY(0)` to `translateY(4px)`, toward the edge it came from, 150ms (`calc(var(--duration-2) * 0.75)`), same curve. A few pixels, never the full 16px back.
- First paint: nothing already on screen gets an entrance. Enters and exits play only for a change the user caused, including from the keyboard (Enter on the trigger or Dismiss). Dismissed with focus inside, `trigger.focus({ preventScroll: true })` before closing.
- CSS route: keep it mounted; `data-state` on the toast. `open`: `opacity: 1; visibility: visible; transform: none`, `transition-duration: 200ms`. `closing`, the base rule: the exit target `opacity: 0; visibility: hidden; transform: translateY(4px)`, 150ms, `transition-property: opacity, transform, visibility`. `closed`, set on its own `opacity` `transitionend` (`event.target` is the toast, `propertyName === 'opacity'`): as `closing` at `translateY(16px)`, the enter origin, `transition-duration: 0ms`.
- Motion route: `<AnimatePresence initial={false}>`; `initial={{ opacity: 0, y: 16 }}`, `animate={{ opacity: 1, y: 0 }}`, `transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}`, `exit={{ opacity: 0, y: 4, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }}`; it unmounts after the exit.
- Reduced motion: `opacity` only, same durations. CSS: `transform: none` in every state; Motion: `useReducedMotion()` zeroes `y`.
```

### Acceptance checklist

- [ ] CSS route: the toast's computed `transition-duration` is `0.2s` with `data-state="open"`, `0.15s` while `closing`, and `0s` once `closed`. Motion route: the `transition` durations are 0.2 in and 0.15 out.
- [ ] Entering, it starts 16px below its resting spot at `opacity` 0 (the computed values the moment it is shown), rises and fades in with no frame moving down or dimming, and is settled at `opacity` 1 and `transform: none` within 200ms (±1 frame) of the first animated frame (the first frame where its `opacity` moves).
- [ ] Exiting, `opacity` is 0 within 150ms (±1 frame) of the first animated frame. While visible (`closing`) the toast ends 4px (±0.5) below its spot, never farther and never above it; `closed` sits at the enter origin, hidden.
- [ ] Dismissed while entering, or shown again while exiting, it turns back from where it is with no restart and no jump: no frame steps more than the larger of the enter's and the exit's own largest step (±0.01 `opacity`, ±0.1px).
- [ ] Loaded with the toast already open, no frame shows it below its spot or under `opacity` 1, and `getAnimations()` on it is empty.
- [ ] Shown or dismissed from the keyboard, it plays the same enter and exit.
- [ ] Dismissed from the keyboard, focus lands on the trigger, not `body`.
- [ ] CSS route: closed, its computed `visibility` is `hidden` and its Dismiss button is not in the tab order.
- [ ] With reduced motion on, computed `transform` is `none` in every frame while `opacity` fades over the same durations.

## Code

### CSS

```css
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --duration-2: 200ms;
}

/* Markup: <div class="toast" data-state="closed">…<button>Dismiss</button></div>.
   Kept mounted, not display + @starting-style: that also plays on first paint.
   Show: data-state="open". Dismiss: data-state="closing",
   and on its own transitionend (event.target the toast, propertyName
   "opacity") data-state="closed", the enter origin, so the next show
   starts from 16px below.
   Focus inside the toast: trigger.focus({ preventScroll: true }) before
   closing, or it drops to body. */
.toast {
  /* The exit target: faded, nudged toward the bottom edge, and out of the
     tab order once the transition ends. visibility is transitioned too, so
     the toast stays visible for the whole exit. A transition takes the
     duration of the state it heads to: this rule times the exit, the open
     rule the enter. */
  opacity: 0;
  transform: translateY(4px);
  visibility: hidden;
  transition-property: opacity, transform, visibility;
  transition-duration: 150ms; /* 0.75 × the enter */
  transition-timing-function: var(--ease-out);
}
.toast[data-state="closed"] {
  /* The enter origin: 16px below its spot, where the exit nudges toward. In
     no time, so a show right after the exit starts from the full travel. */
  transform: translateY(16px);
  transition-duration: 0ms;
}
.toast[data-state="open"] {
  opacity: 1;
  transform: none;
  visibility: visible;
  transition-duration: var(--duration-2); /* enter: 200ms */
}

/* Reduced motion: a fade over the same durations, no travel. */
@media (prefers-reduced-motion: reduce) {
  .toast,
  .toast[data-state] {
    transform: none;
  }
}
```

### Motion

```tsx
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactNode, RefObject } from 'react'

const ease = [0.23, 1, 0.32, 1] as const

type Props = { open: boolean; onDismiss: () => void; trigger: RefObject<HTMLButtonElement | null>; children: ReactNode }

export function Toast({ open, onDismiss, trigger, children }: Props) {
  // Reduced motion: a fade over the same durations, no travel.
  const reduced = useReducedMotion()
  const y = (px: number) => (reduced ? 0 : px)
  return (
    // initial={false}: a toast open at first paint is painted in place, with no
    // entrance. It unmounts once the exit has played.
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          className="toast"
          initial={{ opacity: 0, y: y(16) }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease }}
          // Quieter and faster: a few pixels toward the edge it came from, 0.75 × the enter.
          exit={{ opacity: 0, y: y(4), transition: { duration: 0.15, ease } }}
        >
          {children}
          {/* Focus goes back to the trigger before the exit, or it drops to body when the toast unmounts. */}
          <button
            type="button"
            onClick={() => {
              trigger.current?.focus({ preventScroll: true })
              onDismiss()
            }}
          >
            Dismiss
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

## Accessibility

The toast is usable from the first frame of its enter: put it in a `role="status"` region that is always mounted, so the announcement comes with the click, not after the enter, and give its Dismiss button a label. Dismissed with focus inside it (a keyboard Dismiss), move focus to the trigger with `preventScroll` before closing, so it does not fall to `body`. Closed, keep it out of the tab order (`visibility: hidden` once the exit transition ends, or unmount it). Opening or dismissing from the keyboard animates like a click. Under reduced motion, drop the travel and keep the fade over the same durations.

## Related

- [Duration](https://moveset.lucaslima.design/terms/duration)
- [Ease-out](https://moveset.lucaslima.design/terms/ease-out)
- [Stagger](https://moveset.lucaslima.design/terms/stagger)
- [Scroll-triggered](https://moveset.lucaslima.design/terms/scroll-triggered)

Source: https://moveset.lucaslima.design/terms/enter-and-exit
