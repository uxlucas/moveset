# Sticky

Also called: sticky header, sticky section header, pinned header, header that stays at the top, position sticky, sticky table header, stuck header, header stays while scrolling, content scrolls under the header, sticky nav, section headers push each other

> An element scrolls with the page until it hits an edge, then stays pinned while the rest of its section scrolls underneath.

Sticky is CSS position: sticky. The element sits in the normal flow until scrolling brings it to the offset you set, then it holds there until the end of its parent pushes it out. That last part is why section headers hand off to each other: each header only sticks inside its own section.

## Use when

- Section headers in long lists, like contacts, settings or a changelog.
- Table headers that need to stay visible while rows scroll.
- A toolbar that should stay within reach while its content scrolls.

## Avoid when

- Small screens where a pinned element takes a big share of the viewport.
- Stacking several sticky bars, which leaves little room to read.
- When the element must stay visible past the end of its parent. Sticky cannot leave its container, so use a fixed element instead.

## Prompt

```text
Make the section headers in this list sticky.

- Wrap each header and its rows in one element, header first.
- Header: real h2 or h3, `position: sticky; top: 0px;` in the list's own scroll container, opaque background, z-index above rows.
- Headers are 32px tall; `scroll-padding-top: 32px` on the scroll container.
- No `overflow: hidden`, `auto` or `scroll` on ancestors between header and scroll container; use `overflow: clip`.
- Scroll container: no padding. First section wrapper: `margin-top: 1px`.
- A last section shorter than the container never pins (expected; don't pad it).
- Header: `transition: box-shadow 150ms ease` (none under reduced motion). `[data-stuck="true"]`: `box-shadow: var(--stuck-shadow, 0 1px 0 var(--border, rgb(0 0 0 / 0.08)), 0 4px 12px rgb(0 0 0 / 0.06))`.
- Dark (`prefers-color-scheme: dark`): `--stuck-shadow: 0 1px 0 rgb(255 255 255 / 0.12), 0 4px 12px rgb(0 0 0 / 0.4)`.
- One IntersectionObserver on the headers: root = scroll container, rootMargin '-1px 0px 100000px 0px', threshold [0, 0.01, 1]. Stuck = `entry.isIntersecting && entry.intersectionRatio < 1 && entry.boundingClientRect.top <= entry.rootBounds.top && entry.boundingClientRect.bottom > entry.rootBounds.top`, written to the header as `data-stuck="true"` or `"false"`. Use these values exactly.
```

### Acceptance checklist

- [ ] While scrolling, each header pins to the top of the scroll container (a last section shorter than the container never pins; that is expected).
- [ ] The next header pushes the current one up; they never overlap.
- [ ] No row content is visible through a stuck header.
- [ ] The shadow appears only while a header is stuck, also after setting the scroll container's scrollTop past a header in one step, and goes away when the header scrolls back into place or once it is pushed out (a 1px sliver may remain).
- [ ] Headers pin to the top of the list's own scroll area, not to the page.
- [ ] Tabbing through rows, including Shift+Tab back up, never leaves the focused row hidden behind a stuck header.
- [ ] Screen readers read each header before its rows.

## Code

### CSS

```css
.list {
  overflow-y: auto;
  padding: 0; /* put padding on a wrapper, so rootMargin lines up with top */
  scroll-padding-top: 32px; /* header height */
}

.section-header {
  position: sticky;
  top: 0px;
  z-index: 1;
  min-height: 32px;
  background: var(--surface, #fff); /* opaque, so rows never show through */
  transition: box-shadow 150ms ease;
}

.section-header[data-stuck="true"] {
  box-shadow: var(--stuck-shadow, 0 1px 0 var(--border, rgb(0 0 0 / 0.08)), 0 4px 12px rgb(0 0 0 / 0.06));
}

/* Tune per theme: the light shadow vanishes on a dark surface. */
@media (prefers-color-scheme: dark) {
  .list { --stuck-shadow: 0 1px 0 rgb(255 255 255 / 0.12), 0 4px 12px rgb(0 0 0 / 0.4); }
}

/* The first header starts 1px below the stuck line, so it is not flagged stuck at rest. */
.list > section:first-of-type {
  margin-top: 1px;
}

@media (prefers-reduced-motion: reduce) {
  .section-header { transition: none; }
}
```

### JS

```js
// Watch the headers themselves. A header is stuck while the line
// 1px below the top of the list cuts through it: clipped at the top,
// still showing below the line. Pushed fully out, or with its bottom exactly
// on the line, it is not stuck.
//
// Why the details matter:
// - The 100000px bottom margin keeps the bottom edge from ever clipping a
//   header. Otherwise a header half under the bottom edge that jumps straight
//   into the pinned spot (scrollbar drag, anchor link, scrollTop set in code)
//   stays between thresholds, gets no callback and keeps a stale state.
// - bottom > line: a header pushed out until its bottom exactly touches the
//   line still counts as intersecting (ratio 0), with at most 1px showing.
// - The 0.01 threshold: from that touching state, a header sliding back in
//   stays inside the same [0, 1] band and would get no callback.
const list = document.querySelector('.list')
const io = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const { top, bottom } = entry.boundingClientRect
      const line = entry.rootBounds.top
      const clipped = entry.isIntersecting && entry.intersectionRatio < 1
      entry.target.dataset.stuck = String(clipped && top <= line && bottom > line)
    }
  },
  { root: list, rootMargin: '-1px 0px 100000px 0px', threshold: [0, 0.01, 1] },
)
list.querySelectorAll('.section-header').forEach((h) => io.observe(h))
```

## Accessibility

Keep stuck headers as real headings in reading order, and set scroll-padding-top on the scroll container so a focused row is never hidden underneath a stuck header.

## Related

- [Scroll Snap](https://moveset.lucaslima.design/terms/scroll-snap)

Source: https://moveset.lucaslima.design/terms/sticky
