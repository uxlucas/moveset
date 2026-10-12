---
verdict: pass
reviewedAt: 2026-10-12
approved: true
approvedBy: Lucas Lima
approvedAt: 2026-10-12
---

# Review: scroll-linked (round 2)

Layer 3 craft re-review of `src/terms/scroll-linked.tsx` at `foundation` 330b4aa (with `docs/house-rules.md` and `tests/e2e/batch-1.spec.ts`). The tree was clean when this ran. Reviewer did not write the entry. Round 1 failed on two gate items. Both are fixed, and so is every should-fix and nit.

Verdict: **pass**. The scrub is exact at all six control combinations. The CSS and JS tabs, run standalone in Chromium, are exact in every combination and in every way the two routes can meet (CSS only, JS only, both with support, both with support stubbed off). Reduced motion behaves as the prompt says. What is left is three nits and two untested-browser notes.

## Round 1 findings

| Round 1 finding | Status | Evidence |
|---|---|---|
| JS scale × section measured `figure.parentElement` | ADDRESSED | `:331-339` measures the figure and undoes the scale (`top = box.top + (box.height - h) / 2`). Standalone test with the figure inside a `<section>` and no wrapper: max error 0 down and up (round 1: 0.38). |
| Still frame for fade/scale × section showed the end state | ADDRESSED | `useStillPx` (`:114-126`) passes `stillPx` = middle of the figure's entry. Reduced motion, light and dark: scrollTop 208, opacity 0.5 / scale 0.96. Other stills: bar × page 0.45, bar × element 0.40, fade/scale × page 0.45. e2e `the still frame shows a figure half way through its own range` covers it. |
| Figure window too short (~440ms) | ADDRESSED | Entry range now scrollTop 48→368 = 320px (`h-80`). Autoplay: 579→1694ms down, 6361→7461ms up, so about 1.1s per pass. Max change per frame 0.022 (fade) / 0.023 (scale), so no pop. |
| Fade/scale × page: no first-screen caveat | ADDRESSED | Intro (`:470`): "Use this only for an element below the first screen; anything visible on load needs its own range." The prompt also covers a page that does not scroll ("progress is 0", no division by zero). |
| "the marked section" had no referent | ADDRESSED | `:466` "give it the class `marked-section`, or use the section the user names". The CSS and JS tabs use `.marked-section`. |
| Bar lacked `pointer-events: none` and stacking | ADDRESSED | CSS `:288,294` (`z-index: 50`, `pointer-events: none`), Motion class `pointer-events-none … z-50`, prompt `:513`. Computed on the standalone bar: pointer-events none, z-index 50. |
| Nit: `useTransform` wording for the bar | ADDRESSED | `:532` "bind `scrollYProgress` straight to `scaleX`"; fade/scale keep `useTransform`. |
| Nit: no content-change handling in JS | ADDRESSED | `resize` plus `new ResizeObserver(schedule).observe(document.body)` (`:385-387`). The acceptance item now says "or loading more content". |
| Nit: "Own section" label | ADDRESSED | "Element in view" (`:25`); the demo label wording matches. |
| Nit: `will-change` toggle on the bar | ADDRESSED | Bar: `will-change: transform` once in CSS, no toggle in the JS route. Figure keeps the 200ms idle release. |
| Info: make the reduced-motion choice a house rule | ADDRESSED | `docs/house-rules.md:49` "Recipes: …". The CSS, JS and Motion bar tabs cite it ("House rule: a progress indicator keeps tracking under reduced motion"), and so do the prompt and the a11y note. See the wording nit below. |

## Prompt-test items

| Item | Status | Evidence |
|---|---|---|
| Feature test `CSS.supports('animation-timeline', 'scroll()')` | Present | JS `:347`, prompt `:529`. |
| `data-fallback` scoping inside `@supports` | Present, works | CSS: `@supports (animation-timeline: scroll()) { html:not([data-fallback]) … }`. Stubbed to false, the JS sets `data-fallback`, the CSS animation computes `none`, the JS drives, error 0. Native, CSS drives, no attribute, error 0. Never both. |
| Named `@keyframes` | Present | `progress` / `reveal` / `settle`, named in the prompt with from/to. |
| Shorthand-before-`animation-timeline` warning | Present | CSS comment and prompt. Computed `animation-timeline` is `scroll(root)` / `--section` / `view()`, so the shorthand did not reset it. |
| `animation-duration: auto` removed | Present | Shorthand is `animation: <name> linear both`; Chromium computes duration `auto` (the initial value). |
| Fill mode `both` with stated reason | Present | "both holds the start and end states outside the range"; computed fill mode `both`. |
| `resize` + `ResizeObserver` | Present | See above. |
| "clientWidth" in acceptance | Present | "the bar spans half the scroll container's width (clientWidth)". |

## New findings

| Severity | Where | What | Fix |
|---|---|---|---|
| Nit | `docs/house-rules.md:49` | "time-based or decorative scroll-linked effects" contradicts the term: a scroll-linked effect has no time base. | "decorative scroll-linked effects (fades, scales) show their final state." |
| Nit | Prompt `:529` | "set `data-fallback` on <html>": the bare `<html>` will be read as a tag by markdown renderers in Copy as markdown, `/terms/<slug>.md` and the skill files. | Put it in backticks: `` `<html>` ``. |
| Nit | Demo `:57, :61` | The article differs by effect: 5 paragraphs above the section for the bar, 3 for fade/scale, and the figure is `h-80` in bar mode too. Not a tell to a visitor: the tall figure reads as an inline hero image, and the first-screen rule is respected (at scrollTop 0 the figure's top is 48px below the fold). Switching effect mid-autoplay does change the scroll length (948 ↔ 806); the running scroll just clamps. | Optional. Leave it, or keep the bar mode at the old `h-36` so only the figure effects carry the tuned layout. |
| Info | CSS tab, Safari | Not testable here (Chromium only). The bar × element route uses `timeline-scope` + a named `view-timeline` behind a `scroll()` feature test, and every route relies on the initial `animation-duration: auto`. | When Safari 26 is available, run the six CSS tabs once. If `timeline-scope` is missing there, test `CSS.supports('timeline-scope', '--a')` for that combination. |

## Feel check

- Scrub, entry page, 10px steps both directions: max error 5e-7 (bar, fade), 6e-6 (scale, float). Values never step backwards, and the down and up passes match at every position. Computed transition is 0s on the bar and figure.
- Card loop (284×156, 494px of scroll): down ~3.5s, hold ~1s, up ~3.5s, hold at top ~1.5s. At most 5px of scroll and 0.010 of bar per frame. The shrink on the way up is plain.
- The figure's entry now reads as scrubbing (~1.1s each way at a steady pace). Bar × element: fills 814→3065ms instead of across the whole pass, and the section's left rule marks it.
- Reduced motion: no autoplay. Play runs one down-and-up cycle, then returns to the still frame. The return jump from 0 to the still frame is shared runtime behaviour, noted in round 1 and out of scope.
- Compare page loads (200) in light and dark with both demos; no console errors on any page tested.

## Content notes

- Definition, use/avoid, aliases and the parallax line are unchanged and still good.
- Acceptance is observable at all six combinations, with a way to check the fallback in Chromium (stub `CSS.supports`).
- Each prompt is self-contained: its range in words and CSS terms, exact values, both routes and how they coexist, Motion only if already used, reduced motion per effect.
- No blocked words; no em or en dashes in the term file.
