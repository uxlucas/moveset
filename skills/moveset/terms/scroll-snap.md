# Scroll Snap

Also called: snap scrolling, paged scroll, full-page scroll, section snapping, stops on each section, scroll-snap-type

> Scrolling comes to rest exactly on an item instead of stopping anywhere in between.

Scroll snap is plain CSS. The container says how strictly to snap, mandatory or proximity, and each panel says which part lines up: start, center or end. People still scroll freely with wheel, trackpad, touch or keys. When a scroll ends, the browser finishes it on the nearest panel. JavaScript is only needed for extras like next and previous buttons.

## Use when

- Vertical galleries and full-screen feeds, where each image or post is the unit. Use the x axis for a sideways carousel.
- Onboarding steps and full-screen slides, one idea per screen.
- Story sections people page through, where resting between two is never useful.

## Avoid when

- Long-form reading. People need to stop anywhere, and mandatory snapping pulls away the line they were on.
- Panels taller than the viewport. Part of each one becomes hard to reach and read.
- Mixed-height content. Use proximity, or no snapping at all.

## Prompt

```text
Make this page snap to whole panels.

- Container (`html` for the whole page, or a nested scroller with a fixed height and `overflow-y: auto`): `scroll-snap-type: y mandatory`.
- H = a fixed header's height (e.g. 56px), else 0. Container: `scroll-padding-top: H`, `padding-top: H`, `padding-bottom: 48px` (snap area height, viewport − H, minus panel height). Page: `body { margin: 0 }`.
- Panels: `scroll-snap-align: start`, `height: calc(100svh - H - 48px)` (48px short: next panel peeks in; nested: the scroller's height for `100svh`); `.panel + .panel { margin-top: 8px }`.
- `scroll-snap-stop: always` on panels that must not be skipped (steps); else `normal`.
- Nested scroller: `overscroll-behavior-y: contain`, `tabindex="0"`, `role="region"`, an `aria-label`, so arrow keys and PageDown scroll it.
- Prev/next buttons: page `panel.scrollIntoView({ block: 'start', behavior })`; nested `scroller.scrollTo({ top: panel.offsetTop - paddingTop, behavior })`. `behavior: 'smooth'`, `'instant'` under reduced motion; set the current index on click; disabled at the ends.
- Current panel: `scrollsnapchange` on `document` (page) or the scroller (nested) where `'onscrollsnapchange' in window`, `event.snapTargetBlock` (`null` between panels: use the nearest); else on `scrollend` (or 100ms after the last `scroll`), the nearest. Nearest: top closest to the snap area's top.
- No wheel/touch listeners or `preventDefault`.
- Reduced motion: keep snapping (a position, not an animation); container `scroll-behavior: auto`.
```

### Acceptance checklist

- [ ] Releasing a scroll anywhere between two panels, including after a fast fling, comes to rest with one panel's top at the top of the snap area.
- [ ] With focus in the container, PageDown moves exactly one panel and PageUp one back.
- [ ] With a 56px fixed header, every panel, the first one at scroll 0 included, rests with its top directly under the header.
- [ ] The last panel can rest at the top like the others.
- [ ] Prev and next move one panel each, a quick double click moves two, and they are disabled on the first and last panel.
- [ ] After any scroll, including one that rests between two panels, prev and next step from the panel nearest the snap position.
- [ ] In a nested scroller, scrolling past the last panel does not scroll the page behind it.
- [ ] Resizing the window keeps the same panel in place.
- [ ] With reduced motion on, scrolling still snaps; prev and next jump without a glide.

## Code

### CSS

```css
/* The whole page snaps. For a nested scroller, move the html rules onto it,
   give it a fixed height and overflow-y: auto, and use that height for 100svh. */
:root {
  --header: 0px; /* a fixed header's height, e.g. 56px */
}

html {
  scroll-snap-type: y mandatory;
  /* Panels rest under the header, not behind it. */
  scroll-padding-top: var(--header);
  /* Top: the first panel starts below the header. Bottom: the snap area's
     height minus a panel's, so the last panel can rest at the top too. */
  padding-block: var(--header) 48px;
}

body {
  margin: 0;
}

.panel {
  scroll-snap-align: start;
  /* The snap area (viewport minus header) less 48px: the 8px gap and the
     edge of the next panel show. Never taller than the snap area. */
  height: calc(100svh - var(--header) - 48px);
  /* normal lets a fast fling pass panels. always: none can be skipped. */
  scroll-snap-stop: normal;
}

.panel + .panel {
  margin-top: 8px;
}

/* Nested scroller only: the page behind stays put at either end.
   .snap { overscroll-behavior-y: contain; } */

/* Snapping stays under reduced motion: it is where scrolling rests, not an
   animation. Only the glide (scroll-behavior: smooth, where set) goes. */
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
}
```

### JS

```js
// Prev/next buttons and the current panel. Scrolling and snapping are all CSS:
// no wheel or touch listeners, nothing that fights the browser.
// Markup: <button data-prev aria-label="Previous panel">
//         <button data-next aria-label="Next panel">
const panels = [...document.querySelectorAll('.panel')]
const prev = document.querySelector('[data-prev]')
const next = document.querySelector('[data-next]')
const reduce = matchMedia('(prefers-reduced-motion: reduce)')
let current = 0

function show(i) {
  current = i
  prev.disabled = i === 0
  next.disabled = i === panels.length - 1
}

function go(i) {
  const target = Math.min(Math.max(i, 0), panels.length - 1)
  // From the target, not the panel on screen, so a quick double click moves two.
  show(target)
  // scrollIntoView respects scroll-padding. Under reduced motion the glide goes; the snap stays.
  // Nested scroller: this would scroll the page too. Use scroller.scrollTo with the panel's
  // offsetTop minus the scroller's padding-top (the scroller is position: relative).
  panels[target].scrollIntoView({ block: 'start', behavior: reduce.matches ? 'instant' : 'smooth' })
}

// The panel at rest: its top nearest the top of the area below the header.
function nearest() {
  const header = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0
  const off = (p) => Math.abs(p.getBoundingClientRect().top - header)
  return panels.reduce((best, p, i) => (off(p) < off(panels[best]) ? i : best), 0)
}

prev.addEventListener('click', () => go(current - 1))
next.addEventListener('click', () => go(current + 1))

if ('onscrollsnapchange' in window) {
  // Chromium 129+: fires when a scroll comes to rest on a different snap target.
  // A nested scroller fires it on itself, not on document: listen there.
  // The target is null when a scroll rests between two panels (proximity).
  document.addEventListener('scrollsnapchange', (e) => {
    show(e.snapTargetBlock ? panels.indexOf(e.snapTargetBlock) : nearest())
  })
} else if ('onscrollend' in window) {
  addEventListener('scrollend', () => show(nearest()))
} else {
  let idle = 0
  const settle = () => {
    clearTimeout(idle)
    idle = setTimeout(() => show(nearest()), 100)
  }
  addEventListener('scroll', settle, { passive: true })
}
// A reload can restore the scroll position on any panel.
show(nearest())
```

## Accessibility

Snapping must never take scrolling away: no wheel or touch hijacking, and keyboard scrolling keeps working. A nested scroller needs tabindex="0", a region role and a label so arrow keys and PageDown reach it. Label prev and next buttons and disable them at the ends. Under reduced motion snapping stays, since it decides where scrolling rests rather than animating, but buttons jump instead of gliding.

## Related

- [Sticky](https://moveset.lucaslima.design/terms/sticky)
- [Scroll-triggered](https://moveset.lucaslima.design/terms/scroll-triggered)

Source: https://moveset.lucaslima.design/terms/scroll-snap
