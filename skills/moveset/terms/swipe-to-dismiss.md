# Swipe to Dismiss

Also called: swipe away, drag to dismiss, flick to dismiss, swipe gesture, swipeable toast, swipe to delete

> Dragging an element off screen closes it, and a quick flick counts as much as a long drag.

A swipeable element follows the finger 1:1 while it is dragged: a transform written on every move, with no transition to lag behind it. The release decides. Past about a third of its width (the house number; Sonner uses 45px, Vaul a quarter), or flicked faster than about 0.1px/ms in the direction of the drag, it leaves in that direction on a spring that carries the release velocity; otherwise it springs back to rest. A quick flick counts as much as a long drag, which is what makes the gesture feel like throwing something away instead of filing it. A full off-screen slide is right here, because where it went is the information. And there is always a way to dismiss without the gesture.

## Use when

- Toasts and notifications, where a swipe is already what people do on their phones.
- List rows, cards and chips that can be removed or archived, with an undo.
- Sheets and drawers dragged shut, where the same distance-or-velocity rule decides whether they close.

## Avoid when

- Anything destructive without an undo: a flick is too easy to do by accident.
- Elements inside a horizontal scroller or carousel: the two gestures fight over the same axis.
- A drag that lags behind the finger (a transition on the dragged transform) or resists it: direct manipulation means 1:1.
- As the only way out. Keep a visible Dismiss control for the keyboard and for anyone who cannot swipe.

## Prompt

```text
Make this toast swipe away sideways.

- Reference toast: 376px wide; a third of its width (125.3px; at or past it counts); scale to yours; its container clips.
- Drag: 1:1 (`translateX` per move, no transition); `touch-action: pan-y`; pointer capture; `user-select: none`.
- Threshold: `|x| ≥ width / 3`, or `|v| ≥ 0.1px/ms` signed like `x`, leaves toward `sign(x)`; else back.
- Exit: to `±(width + 16px)`, spring `{ duration: 0.3, bounce: 0 }` out, `{ duration: 0.5, bounce: 0 }` back. Ship as physics (mass 1): `{ stiffness: 947, damping: 61.6 }` and `{ stiffness: 341, damping: 36.9 }`, plus `velocity` (px/s); remove after the exit.
- JS route (`motionValue`, `animate`; `x.on("change")` writes `translateX`): `pointerdown` (not on Dismiss): `x.stop()`, `setPointerCapture`; `pointermove`: `x.set(start + dx)`, log `(e.timeStamp, x)`; `pointerup`, `pointercancel`, `lostpointercapture`: `v` = Δx / Δt over the 100ms ending at `pointerup` (0 under two samples 8ms apart), then `animate(x, target, { ...spring, velocity: v * 1000 })`.
- Motion route: the JS route's pointer events on the `motion.div`, `useMotionValue(0)`, `style={{ x }}`, `animate(x, …)`; not `drag`; `onDismiss()` in `onComplete`.
- Visible Dismiss button: the exit to the right, `velocity: 0`; focus inside returns to the opener, or its container (`focus({ preventScroll: true })`); always-mounted `role="status"` region.
- Reduced motion: drag still follows; `x.jump(target)` on release: gone or at rest next frame (`matchMedia`; Motion: `useReducedMotion()`).
```

### Acceptance checklist

- [ ] The toast has no CSS transition on `transform` (computed `transition-duration` is `0s`), and while dragged its `translateX` equals the pointer's `clientX` minus its value at `pointerdown`, ±0.5px, in the frame after every move; `touch-action` computes to `pan-y`.
- [ ] Released from a third of its width (±0.5px) or further, with no movement in the 100ms ending at `pointerup`, it leaves toward the side it was dragged to; released short of a third with no movement, it goes back to `x: 0`.
- [ ] A flick: released at a fifth of its width after moving at 0.1px/ms or more in that direction over the 100ms ending at `pointerup` (on `event.timeStamp`, from `pointermove` samples at least 8ms apart), it leaves; the same distance at under 0.1px/ms goes back.
- [ ] Leaving, sampled every frame from `pointerup`: `x` moves on from its release value in the release direction, every frame further than the one before, and the first frame's step is at least the release velocity times the frame length (±2px): the speed carries. It passes `±width` and settles within 0.5px of `±(width + 16px)` by 300ms (±1 frame); it is then removed.
- [ ] Going back from a release with no movement in the last 100ms, `x` never passes 0 (bounce 0) and is within 0.5px of 0 by 500ms (±1 frame) from `pointerup`; released while moving toward 0, it carries that speed and may pass 0 once.
- [ ] Grabbed while it is going back, it stops where it is and follows the pointer again from there; released again, the rule applies from the new `x` (`x.get()` on the Motion route), and a grab let go without moving goes back from where it was caught.
- [ ] Enter or Space on the Dismiss button plays the exit to the right from `x: 0`, and focus lands on the opener, or its container, not on `body`. A drag that starts on Dismiss does nothing (the toast stays at `x: 0`); Dismiss still clicks.
- [ ] A vertical swipe that starts on the toast scrolls the page; the pointer is cancelled and the toast goes back to `x: 0`.
- [ ] With reduced motion on, the drag still follows the pointer, and after `pointerup` the next frame has the toast at `±(width + 16px)` (then removed) or at `x: 0`, with no in-between frames.

## Code

### JS

```js
import { animate, motionValue } from 'motion'

// Markup: <div role="status"><div class="toast">…<button class="dismiss">Dismiss
// </button></div></div>, shown by <button class="show-toast">. The toast spans
// its container less an inset, so its own width plus a margin takes it clear.
// No CSS transition on .toast: the transform is written here, 1:1 with the pointer.
const DISTANCE = 1 / 3 // of the toast's width, the house number (Sonner 45px, Vaul 25%)
const VELOCITY = 0.1 // px/ms, Emil's number
const WINDOW = 100 // ms the velocity is read over
const SPAN = 8 // ms: samples closer than this read as no velocity
const EDGE = 16 // px past the width, so a shadow clears too
// { duration: 0.3, bounce: 0 } out and { duration: 0.5, bounce: 0 } back, as physics:
// Motion 14 drops the release velocity on duration/bounce springs.
const exit = { type: 'spring', stiffness: 947, damping: 61.6, mass: 1 }
const back = { type: 'spring', stiffness: 341, damping: 36.9, mass: 1 }
const reduced = matchMedia('(prefers-reduced-motion: reduce)')

const toast = document.querySelector('.toast')
const opener = document.querySelector('.show-toast')
// No stylesheet assumed: a vertical swipe still scrolls the page, and nothing is
// selected mid-drag.
toast.style.touchAction = 'pan-y'
toast.style.userSelect = 'none'
const x = motionValue(0)
x.on('change', (v) => (toast.style.transform = `translateX(${v}px)`))
let drag = null // { pointerId, startX, base, samples: [{ t, x }] }

toast.addEventListener('pointerdown', (e) => {
  if (!e.isPrimary || e.button !== 0 || drag || e.target.closest('.dismiss')) return
  toast.setPointerCapture(e.pointerId) // moves and the release stay ours
  x.stop() // picked up mid-spring, it comes from where it is
  drag = { pointerId: e.pointerId, startX: e.clientX, base: x.get(), samples: [] }
})

toast.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.pointerId) return
  const px = drag.base + e.clientX - drag.startX
  x.set(px)
  drag.samples.push({ t: e.timeStamp, x: px }) // the event's clock, not the handler's
})

// px/ms over the last WINDOW ms, so a drag that stopped before the release has none.
function velocityOf(samples, now) {
  const recent = samples.filter((s) => s.t >= now - WINDOW)
  if (recent.length < 2) return 0
  const a = recent[0]
  const b = recent[recent.length - 1]
  return b.t - a.t < SPAN ? 0 : (b.x - a.x) / (b.t - a.t)
}

// A flick counts only in the drag's direction: a fast move back toward rest goes back.
function leave(px, v, width) {
  const side = Math.sign(px)
  const fast = Math.abs(v) >= VELOCITY && Math.sign(v) === side
  return Math.abs(px) >= width * DISTANCE || fast ? side : 0
}

function release(side, v) {
  const target = side * (toast.offsetWidth + EDGE)
  const onComplete = () => side && toast.remove()
  // Reduced motion: the drag followed the pointer; the release jumps to the end.
  if (reduced.matches) {
    x.jump(target)
    return onComplete()
  }
  // Motion wants units per second; v is px/ms.
  animate(x, target, { ...(side ? exit : back), velocity: v * 1000, onComplete })
}

const end = (e) => {
  if (!drag || e.pointerId !== drag.pointerId) return
  const { samples } = drag
  drag = null
  const v = velocityOf(samples, e.timeStamp)
  release(leave(x.get(), v, toast.offsetWidth), v)
}
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) toast.addEventListener(type, end)

// The non-gesture way out: the same exit, to the right, with no speed. Focus
// inside the toast goes back to the opener first, or it drops to body.
toast.querySelector('.dismiss').addEventListener('click', () => {
  if (toast.contains(document.activeElement)) opener.focus({ preventScroll: true })
  release(1, 0)
})
```

### Motion

```tsx
import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import { useRef, type PointerEvent, type ReactNode, type RefObject } from 'react'

const DISTANCE = 1 / 3 // of the toast's width, the house number (Sonner 45px, Vaul 25%)
const VELOCITY = 0.1 // px/ms, Emil's number
const WINDOW = 100 // ms the velocity is read over
const SPAN = 8 // ms: samples closer than this read as no velocity
const EDGE = 16 // px past the width, so a shadow clears too
// { duration: 0.3, bounce: 0 } out and { duration: 0.5, bounce: 0 } back, as physics:
// Motion 14 drops the release velocity on duration/bounce springs.
const exit = { type: 'spring', stiffness: 947, damping: 61.6, mass: 1 } as const
const back = { type: 'spring', stiffness: 341, damping: 36.9, mass: 1 } as const
// The toast spans its container (a flex column, or margin-inline: auto) less an
// inset, so its own width plus a margin takes it clear. No stylesheet assumed: a
// vertical swipe still scrolls the page, and nothing is selected mid-drag.
const box = { position: 'relative', inlineSize: 'calc(100% - 24px)', touchAction: 'pan-y', userSelect: 'none' } as const

type Sample = { t: number; x: number }
type Drag = { pointerId: number; startX: number; base: number; samples: Sample[] }

// px/ms over the last WINDOW ms, so a drag that stopped before the release has none.
function velocityOf(samples: Sample[], now: number) {
  const recent = samples.filter((s) => s.t >= now - WINDOW)
  if (recent.length < 2) return 0
  const a = recent[0]
  const b = recent[recent.length - 1]
  return b.t - a.t < SPAN ? 0 : (b.x - a.x) / (b.t - a.t)
}

type Props = { onDismiss: () => void; opener: RefObject<HTMLElement | null>; children: ReactNode }

export function Toast({ onDismiss, opener, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const x = useMotionValue(0)
  const reduced = useReducedMotion()

  const release = (side: number, v: number) => {
    const target = side * ((ref.current?.offsetWidth ?? 0) + EDGE)
    const onComplete = () => side && onDismiss()
    // Reduced motion: the drag followed the pointer; the release jumps to the end.
    if (reduced) {
      x.jump(target)
      return onComplete()
    }
    // Motion wants units per second; v is px/ms.
    animate(x, target, { ...(side ? exit : back), velocity: v * 1000, onComplete })
  }

  // Decided on x.get(), the position, not the drag distance: a toast caught on
  // its way back is not at the grab point.
  // A flick counts only in the drag's direction: a fast move back toward rest goes back.
  const leave = (px: number, v: number) => {
    const width = ref.current?.offsetWidth ?? 0
    const side = Math.sign(px)
    const fast = Math.abs(v) >= VELOCITY && Math.sign(v) === side
    return Math.abs(px) >= width * DISTANCE || fast ? side : 0
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || e.button !== 0 || drag.current || (e.target as HTMLElement).closest('button')) return
    e.currentTarget.setPointerCapture(e.pointerId) // moves and the release stay ours
    x.stop() // picked up mid-spring, it comes from where it is
    drag.current = { pointerId: e.pointerId, startX: e.clientX, base: x.get(), samples: [] }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || e.pointerId !== d.pointerId) return
    const px = d.base + e.clientX - d.startX
    x.set(px)
    d.samples.push({ t: e.timeStamp, x: px }) // the event's clock, not the handler's
  }

  // pointercancel (a touch that became a scroll) and a lost capture release too.
  const end = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || e.pointerId !== d.pointerId) return
    drag.current = null
    const v = velocityOf(d.samples, e.timeStamp)
    release(leave(x.get(), v), v)
  }

  return (
    // Pointer events, not drag="x": the drag prop starts after 3px, decides in
    // postRender, cannot be cancelled before it starts and drags from child buttons.
    <motion.div
      ref={ref}
      className="toast"
      style={{ ...box, x }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
    >
      {children}
      {/* The non-gesture way out: the same exit, to the right, with no speed. Focus
          goes back to the opener first, or it drops to body. */}
      <button
        type="button"
        onClick={() => {
          opener.current?.focus({ preventScroll: true })
          release(1, 0)
        }}
      >
        Dismiss
      </button>
    </motion.div>
  )
}
```

## Accessibility

The gesture is never the only way out: keep a visible Dismiss button on the element, and let Enter and Space run the same exit. Keep the toast in an always-mounted `role="status"` region, so it is announced when it appears and nothing waits for the motion. If focus is inside when it is dismissed, move it to the control that opened the toast, or to its container (`focus({ preventScroll: true })`), so it does not fall to `body`. The drag follows the pointer under reduced motion too: it is direct manipulation, not an animation; only the release animation is replaced by a jump to the end state.

## Related

- [Spring](https://moveset.lucaslima.design/terms/spring)
- [Enter and Exit](https://moveset.lucaslima.design/terms/enter-and-exit)

Source: https://moveset.lucaslima.design/terms/swipe-to-dismiss
