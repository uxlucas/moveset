# Icon Swap

Also called: icon transition, copy to check, play to pause, icon cross-fade, icon change animation

> One icon turns into another in place with a quick scale, fade and blur, like copy becoming a check.

An icon that changes with state deserves more than a visibility toggle, and less than a flourish. The incoming icon grows from 30% while it fades in, with a 3px blur sharpening away; the outgoing one does the reverse at the same time, in the same spot, so the change reads as one icon becoming another. The depth of the scale does the work: 0.3 reads as a swap, 0.8 reads as a glitch, and no scale reads as a flicker. The blur bridges the two shapes. A bounce-free spring, or a firm 300ms ease-out, carries it; bounce on an icon is a toy. Nothing swaps on page load: the icon for the first state is just there.

## Use when

- State icons on buttons: copy to check, play to pause, like to liked, mute to unmute.
- Loading to success and other indicators that change in place.
- Icons inside contextual toolbars and actions revealed on hover.

## Avoid when

- Permanent navigation icons and decorative marks: nothing changes, so nothing swaps.
- The first paint. The icon for the initial state is rendered at rest, with no entrance.
- Text labels. Swap words with a crossfade or a plain change, not a scale.
- Any bounce or overshoot. An icon that wobbles reads as a toy.
- A timid scale (0.8 to 0.9) or none, which read as a glitch or a flicker. Without blur, the two shapes show at once.

## Prompt

```text
Swap this button's icon when its state changes: copy to check.

- The incoming icon `scale` 0.3 to 1, `opacity` 0 to 1, `filter: blur(3px)` to `blur(0px)`; the outgoing icon the reverse, together, in the same spot. Bounce 0.
- The button: `<button type="button">`, `position: relative; display: grid; place-items: center`, 44px square; icons 16px. `aria-label="Copy"` stays. Set copied and announce `Copied` (`role="status"`) on the click, not when the swap settles; revert after 1.5s (a second click restarts it).
- CSS route: both icons in the button, the first state's in flow, the other `position: absolute; inset: 0; margin: auto; width: 16px; height: 16px`; nothing unmounts. `data-on="true"` on the button (`"false"` off) picks the shown one; the hidden one holds `opacity: 0; transform: scale(0.3); filter: blur(3px);`. `transition-property: opacity, transform, filter`, 300ms, `cubic-bezier(0.25, 0.1, 0, 1)`.
- Motion route: in the button, `<AnimatePresence mode="popLayout" initial={false}>` around one `motion.span`, `display: grid`, keyed by the state; `initial` and `exit` `{ opacity: 0, scale: 0.3, filter: 'blur(3px)' }`, `animate` `{ opacity: 1, scale: 1, filter: 'blur(0px)' }`, `transition={{ type: "spring", duration: 0.35, bounce: 0 }}`.
- No swap on page load: the first icon is painted at rest (`initial={false}`).
- Reduced motion: `opacity` only, same duration. CSS: `transform: none; filter: none`, repeating the state selectors (or `!important`), or `[data-on="true"]` wins; Motion: `useReducedMotion()` drops `scale` and `filter`.
```

### Acceptance checklist

- [ ] CSS route: the hidden icon's computed `opacity` is `0`, `transform` `matrix(0.3, 0, 0, 0.3, 0, 0)` and `filter` `blur(3px)`; the shown icon's are `1`, `none` and `none` (or `blur(0px)`); both have `transition-duration` `0.3s`.
- [ ] Sampled every frame from the click, the incoming icon's scale rises from about 0.3 toward 1 without passing it and its `opacity` from 0 to 1; both are settled (within 0.01) by 300ms (Motion: 350ms) and not before 200ms from the first animated frame (the first frame where the incoming icon's `opacity` is above 0).
- [ ] The button's `offsetWidth` and `offsetHeight` never change during the swap, and the two icons' boxes coincide.
- [ ] On page load nothing animates: `getAnimations()` on both icons is empty and the resting icon has `opacity` 1 in the first frame.
- [ ] Clicked again while `Copied` is showing, the timer restarts and nothing visible changes; clicked while swapping back, it turns around from where it is with no jump (no frame steps more than the swap's own largest step).
- [ ] Enter and Space swap it with the same animation.
- [ ] `aria-label` stays `Copy`; the `role="status"` region reads `Copied` on the click, and the icon reverts 1.5s (±100ms) later; the button's hit area is at least 44 × 44px.
- [ ] With reduced motion on, computed `transform` is `none` and `filter` is `none` (or `blur(0px)`) in every frame, while `opacity` fades over the route's own duration (300ms CSS, 0.35s Motion) from the first animated frame.

## Code

### CSS

```css
/* Markup: <button class="icon-button" type="button" aria-label="Copy">
     <svg class="icon icon-a">…</svg>  <!-- copy, in flow -->
     <svg class="icon icon-b">…</svg>  <!-- check, layered over it -->
   </button>. On click, set data-on="true", announce Copied in a role="status"
   region and revert after 1.5s (a second click restarts the timer). The
   name stays Copy. Both icons stay mounted, so the revert animates the same
   way, and a click during it turns back from where it is. */
.icon-button {
  position: relative; /* .icon-b is placed against the button */
  display: inline-grid;
  place-items: center;
  width: 44px; /* the hit area */
  height: 44px;
}
.icon-b {
  position: absolute;
  inset: 0;
  margin: auto;
}
.icon {
  width: 16px;
  height: 16px;
  transition-property: opacity, transform, filter;
  transition-duration: 300ms;
  transition-timing-function: cubic-bezier(0.25, 0.1, 0, 1); /* a firm ease-out, standing in for the spring */
}
/* The hidden icon: shrunk deep, faded, soft. 0.3, not 0.8: a timid scale
   reads as a glitch. */
.icon-b,
.icon-button[data-on="true"] .icon-a {
  opacity: 0;
  transform: scale(0.3);
  filter: blur(3px);
}
.icon-button[data-on="true"] .icon-b {
  opacity: 1;
  transform: none;
  filter: blur(0px);
}

/* Reduced motion: a fade over the same 300ms, no scale and no blur. The state
   selectors are repeated, so this outranks them. */
@media (prefers-reduced-motion: reduce) {
  .icon-b,
  .icon-button[data-on="true"] .icon-a {
    transform: none;
    filter: none;
  }
}
```

### Motion

```tsx
import { Copy, Check } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

// Bounce 0: an icon is not a toy.
const swap = { type: 'spring', duration: 0.35, bounce: 0 } as const
// The button is a 44px grid box, so the span is a box too and popLayout places
// the leaving icon against it: the two coincide, and the layout never shifts.
const box = { position: 'relative', display: 'grid', placeItems: 'center', inlineSize: 44, blockSize: 44 } as const
// Visually hidden, still read by assistive tech.
const hiddenText = { position: 'absolute', inlineSize: 1, blockSize: 1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' } as const

export function CopyButton() {
  const [copied, setCopied] = useState(false)
  // Not a toggle: the check shows, then reverts after 1.5s; a second click restarts
  // the timer. The name stays Copy; the status region announces Copied.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const copy = () => {
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1500)
  }
  // Reduced motion: opacity only, same duration.
  const reduced = useReducedMotion()
  const hidden = reduced ? { opacity: 0 } : { opacity: 0, scale: 0.3, filter: 'blur(3px)' }
  const shown = reduced ? { opacity: 1 } : { opacity: 1, scale: 1, filter: 'blur(0px)' }
  return (
    <>
      <button
        type="button"
        style={box}
        aria-label="Copy"
        onClick={copy}
      >
        {/* initial={false}: the first icon is painted at rest, no swap on page load.
            popLayout takes the leaving icon out of flow, so the two overlap. */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={copied ? 'check' : 'copy'} style={{ display: 'grid' }} initial={hidden} animate={shown} exit={hidden} transition={swap}>
            {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
          </motion.span>
        </AnimatePresence>
      </button>
      <span role="status" style={hiddenText}>{copied ? 'Copied' : ''}</span>
    </>
  )
}
```

## Accessibility

An icon-only button needs an `aria-label` that names the action, and a 44px hit area whatever the icon size. Report the swap on the click, not when the animation settles, so assistive tech never waits for it: a copy button keeps its name and announces `Copied` in an always-mounted `role="status"` region, then reverts after about 1.5s; play to pause swaps the name; a toggle like Like keeps its name and flips `aria-pressed`. Enter and Space swap it like a click. Under reduced motion, keep the fade and drop the scale and blur.

## Related

- [Overshoot](https://moveset.lucaslima.design/terms/overshoot)
- [Duration](https://moveset.lucaslima.design/terms/duration)
- [Ease-out](https://moveset.lucaslima.design/terms/ease-out)
- [Press Scale](https://moveset.lucaslima.design/terms/press-scale)

Source: https://moveset.lucaslima.design/terms/icon-swap
