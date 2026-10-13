---
name: moveset
description: "Design engineering vocabulary with copy-ready prompts: turns a vague description of motion or interaction into its exact term and a prompt with acceptance criteria. Use when someone describes an effect loosely (\"the header stays put while I scroll\", \"things fade in as they come into view\"), asks what an effect is called, or wants a precise prompt for building one. Terms: Scroll-triggered, Scroll-linked, Parallax, Sticky, Scroll Snap, Ease-out, Ease-in-out."
---

# moveset

A visual dictionary of design engineering terms. Each one shows the idea moving, gives it a precise name, and comes with a prompt you can give your agent. This skill holds the published terms from https://moveset.lucaslima.design.

## How to use

1. When someone describes motion or interaction loosely, find the term in the glossary below. Match on what the effect does, not on the words used; aliases are the loose phrasings people actually say.
2. When a term matches, say its name so you both share the word, then read `terms/<slug>.md` next to this file. It has the full prompt at default values, the acceptance checklist, code for each approach that fits, accessibility notes, and the terms it is often confused with.
3. Build from that file. Keep its exact values (durations, curves, offsets, thresholds): they are decisions, not suggestions. Change one only when asked, and say which.
4. Check the result against every item in the acceptance checklist before calling it done.
5. When two terms are close, read both files and use the "Often confused with" section to pick. When nothing matches, say so rather than forcing the nearest term.

## Glossary

### Scroll

- **Scroll-triggered**: An animation that plays once when an element scrolls into view. Also called: reveal on scroll, animate on scroll, in-view animation, scroll reveal, fade in when scrolled to, appear as you scroll. Read `terms/scroll-triggered.md`.
- **Scroll-linked**: An animation whose progress is tied directly to the scroll position, moving forward and backward as you scroll. Also called: scroll-driven animation, scrubbing, scroll timeline, tied to scroll position, progress follows the scrollbar, scroll scrubbed. Read `terms/scroll-linked.md`.
- **Parallax**: Layers move at different speeds while you scroll, which makes the page feel like it has depth. Also called: depth scroll, multi-speed scroll, layered scroll, background moves slower, background lags behind the content, parallax scrolling. Read `terms/parallax.md`.
- **Sticky**: An element scrolls with the page until it hits an edge, then stays pinned while the rest of its section scrolls underneath. Also called: sticky header, sticky section header, pinned header, header that stays at the top, position sticky, sticky table header, stuck header, header stays while scrolling, content scrolls under the header, sticky nav, section headers push each other. Read `terms/sticky.md`.
- **Scroll Snap**: Scrolling comes to rest exactly on an item instead of stopping anywhere in between. Also called: snap scrolling, paged scroll, full-page scroll, section snapping, stops on each section, scroll-snap-type. Read `terms/scroll-snap.md`.

### Motion & Easing

- **Ease-out**: Motion that starts fast and slows into place, the default for anything responding to the user. Also called: starts fast and slows down, decelerate, snappy entrance, ease out, deceleration curve. Read `terms/ease-out.md`.
- **Ease-in-out**: Motion that speeds up and then slows down, for elements already on screen moving from one spot to another. Also called: speeds up then slows down, smooth both ends, ease in out, acceleration and braking. Read `terms/ease-in-out.md`.

## House motion tokens

Every prompt assumes these values. Define them once in the project's CSS.

```css
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1); /* entering, leaving, or responding to the user */
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1); /* something already on screen moving from A to B */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1); /* sheets and drawers */
  --duration-1: 150ms;
  --duration-2: 200ms;
  --duration-3: 250ms;
  --duration-4: 300ms;
}
```

- Springs default to `{ type: "spring", duration: 0.5, bounce: 0 }`. Bounce 0.1 to 0.3 only for playful or physical motion.
- UI motion stays under 300ms. Exits run about 25% faster than enters.
- Never `ease-in` on UI, never `transition: all`, never enter from `scale(0)`.
- Hover motion only under `@media (hover: hover) and (pointer: fine)`.
- Every motion snippet handles `prefers-reduced-motion`.
