---
verdict: pass
reviewedAt: 2026-10-12
approved: true
approvedBy: Lucas Lima
approvedAt: 2026-10-12
---

# Review: parallax (round 3)

Scoped re-check of ae476e6 (`git diff 22b5d1b..ae476e6 -- src/terms/parallax.tsx tests/e2e/batch-2.spec.ts`) on a fresh review-mode build at :3200. Verdict: **pass**. N1 is fixed, the prompt changes are right and within budget, and the new e2e guard measures geometry. Two nits remain. Rounds 1 and 2 follow below for the record.

## Round 3 evidence

| Item | Status | Evidence |
|---|---|---|
| N1 card cadence | ADDRESSED | Card `GEOMETRY` `:47` (top 24, block 64, panel 110, hero 158%), `durationMs: size === 'card' ? 4000 : 7600` `:95`. Sampled after every frame over one full cycle on `/`. **DPR 1:** travel 90px, 0→90→0 in 3849ms, loop period 5215ms with the hold; 35 of 193 in-motion frames do not move (18%); peak 2px/frame; bottom hold ~630ms. **DPR 2:** 36 of 194 (19%). Published cards: 0–22%. Implementer: 39/194 (20%). |
| Card blocks at max scroll / still | ADDRESSED | At max (90): 31% of a block shows above the panel. Still (50): block top 4px inside the window, panel overlapping it by 8px, so the block is whole. Entry page unchanged: still 110 (whole, 12px inside), 54% at max. |
| Card layer exactness | Pass | Transform minus scrollTop × 0.6 after each frame: max 1.2px (the known one-frame lag nit), no drift. Entry scrub, all six combinations: on-screen error ≤ 9.8e-5px, transform error ≤ 7e-15, up and down identical. |
| Visible-window sentence | Right | "Visible while the layer(s) peek(s) above the panel (first 40vh of scroll); more padding, longer window." With `padding-top: 40vh` the panel's top reaches the viewport top after 40vh of scroll, and from then on it covers everything in the hero. 40vh is the upper bound, and padding sets it, so the sentence is accurate. |
| Layer wording | Consistent | One word per count in every line (`layer`/`layers`, "peeks"/"peek", "Layer:"/"Each layer:", "Two layers, far first"). Read all six prompts. |
| JS "after the DOM exists" | Present | "JS route (after the DOM exists: end of `<body>`, or after mount)". |
| ≤230 words at every combination | Pass | 220 / 228 / 220 / 228 / 220 / 228 (0.2, 0.4, 0.6 × 2, 3 layers). No blocked words, no em dashes, `<html>` and `<body>` backticked. |
| e2e guard: no line straddling the hero edge | Asserts geometry | `batch-2.spec.ts` sets `scrollTop` to max under reduced motion, waits two frames, and counts front-panel `.rounded-full` rects with `top < heroBottom < bottom`. It runs on both the card and the entry page. I ran the same logic live: 0 on both, unmutated. I then set the hero height to cut through a line: it counted 1 on both. The guard is not vacuous. The companion test (blocks show at max ≥ 0.25 at 0.2×, ≥ 0.3 otherwise; still whole and overlapped) also measures rects. (I did not run the suite: the scratch config starts its own server on 3200.) |
| useWhen duplicate | ADDRESSED | Removed. |

## Round 3 open nits (non-blocking)

| Severity | Where | What | Fix |
|---|---|---|---|
| Nit | Prompt, CSS route line | The rewrite dropped the subject of the animation: "`.hero { view-timeline: --hero block }`; `animation: parallax linear both`, then…". An agent could put the animation on `.hero`. `var(--ratio)` and the `%` of its own height only work on the layers. | "…; layers: `animation: parallax linear both`…" (+1 word, 229 at most). |
| Nit | Demo `:61` (unchanged) | One-frame lag in autoplay, ≤1.2px. | Optional, as before. |

Feel: the card now moves on most frames at a calm pace, the blocks drift a visible 36px against the panel's 90, and the turn happens with a third of a block on screen. Lucas's 1× / 0.25× feel check at `/review` is the remaining gate.

Layer 3 re-review of `src/terms/parallax.tsx` at `batch-2` 22b5d1b (fix) + fe75a68 (e2e), served review-mode at :3200. Same reviewer as round 1, who did not write the entry. The tree was clean.

Verdict: **fail**, on one new item. Every round 1 finding is addressed and verified, both blockers included. The tabs, run standalone with a heading and real copy, show the layers in the open top and stay exact. But shortening the travel fixed blocker 2 by shrinking the card's scroll to 55px, and the card now crawls. In 69% of in-motion frames it does not move at all, against 0–22% for every published scroll card. The fix is local to the card's geometry and timing.

## Round 1 findings

| Round 1 finding | Status | Evidence |
|---|---|---|
| Blocking: copied content covers the layers | ADDRESSED | Hero gets `padding-top: 40vh` (CSS `:161`, Motion `pt-[40vh]` `:293`, prompt `:353`). Content is "one in-flow panel after the padding… opaque… slides over the layers" (`:354`). I rendered the CSS tab and the bundled Motion tab standalone with a heading and 12 sentences of copy: block bottom 240px, content top 280px (40vh of 700). Screenshots show the layers in the open top and the copy below. Acceptance `:372` now says so. |
| (judgment) padding vs margin for the open top | Right call | `overflow: clip` does not establish a block formatting context (unlike `hidden`), so a first child's `margin-top` collapses through the hero. The hero's border box, its `inset: 0` layers and its `view-timeline` would then all start below the gap, and the gap would show page background, not layers. My round 1 harness hit exactly this (a 300px margin moved the hero top to 300). Padding is inside the box, so the layers, the `%` reference and `exit-crossing` all include it. `display: flow-root` + margin would also work; padding is simpler. |
| Blocking: back layer hidden for half the loop, turn off screen | ADDRESSED | Fixed-height hero (`GEOMETRY` `:44-47`, 140% / 135%). Share of a block visible at max scroll on the entry page: 0.32 / 0.54 / 0.57 at 0.2 / 0.4 / 0.6 (implementer: 31 / 54 / 56). Card (always 0.4): 0.58. Holds at 375, 768 and 1440 widths (0.66 / 0.53 / 0.54 entry, 0.56 card). The turn is on screen at every depth. **But see N1.** |
| Should fix: house rule wording | ADDRESSED | `docs/house-rules.md:49`: "parallax drops the speed difference, so every layer moves with the content." `HOUSE_RULE` (`:146`) and the a11y note match it. |
| Nit: one-frame lag in autoplay | Not addressed (optional) | Still 1.2px max after each frame (transform vs scroll × (1 − r)). Invisible. |
| Nit: still frame not whole at 0.6× | ADDRESSED | `stillPx` (`:51-54`) caps at the top edge. Block top below the viewport top: 39.4 / 12.0 / 6.2px at 0.2 / 0.4 / 0.6; covered by the panel 42 / 42 / 9px. Whole at every depth. |
| Nit: "dark blocks" label | ADDRESSED | "Two solid blocks" (`:343`). |
| Nit: Motion `bg-white` | ADDRESSED | `bg-[var(--surface,#fff)]` (`:305`), same as the CSS tab. |
| Nit: 3-layer prose inside a code span | ADDRESSED | `` `translate3d(0, progress × (1 − ratio) × 100%, 0)` (80% far, 60% back) `` (`:360`). |
| Nit: "Sparingly" in useWhen | ADDRESSED | Moved to avoid (`:337`). The new useWhen item (`:332`, "A product shot or illustration…") overlaps item 2 ("…illustration, photography behind a headline"); see nits. |
| Nit: sources | ADDRESSED | Motion `useScroll` and WCAG 2.3.3 added (`:386-387`). |

## Prompt-test items

| Item | Status | Evidence |
|---|---|---|
| What "content" is | Present | `:354` "one in-flow panel after the padding, `position: relative`, opaque, full speed". |
| One `--ratio` / `--shift` source | Present, works | The CSS sets `--ratio` per layer once (`:174-175`); the keyframes compute `calc((1 - var(--ratio)) * 100%)` (`:203`); the JS reads `--ratio` from computed style (`:219`). Standalone: CSS native exact, and JS with `CSS.supports` stubbed exact using ratios read from the CSS. My max 0.15px deviation is from my harness rounding the hero height (`offsetHeight`), at the clamp end only. Motion uses its own constants (`FAR`/`BACK`), which is fine for a component. |
| Matrix-based acceptance | Present, matches | The demo at 100px computes exactly `matrix(1, 0, 0, 1, 0, 60)`; the CSS route computes `matrix(1, 0, 0, 1, 0, n × 0.6)` (55.2 at n = 92). |
| Measurable layout item | Present | `:376` hero height and `scrollHeight` constant and equal to without the layers. Standalone: `scrollHeight` 2675 = hero 579 + rest 2096 at every position, all routes. |
| JS reduced-motion mechanism | Present, works live | `arm()` (`:240-254`). With JS stubbed and motion allowed, I switched reduce on mid-page: inline transforms went to `""`, listeners came off, layers flat (error 0). I switched it off again: re-armed and exact. Reduced motion at load: flat in CSS, JS and Motion (error 0). |

## Re-measured

- Scrub, all six combinations: entry page, scrollTop 0→133→0 in 10px steps. On-screen error 4.9e-5px, transform error ≤ 7e-15, up and down identical, front panel 1:1. Transition 0s, `will-change: transform` once, `pointer-events: none`, `aria-hidden`, no `background-attachment: fixed`.
- Tabs standalone (900×700, hero 579px with 40vh top, also offset 250px down the page):
  - CSS native, JS stubbed, both loaded with native support (CSS drives, no `data-fallback`), and Motion: all exact.
  - Reduced motion: flat in all three.
- Prompt: 221 words (2 layers) and 228 (3 layers). No blocked words, no em dashes, `<html>` backticked, no "why".
- Takeover: one wheel tick stops autoplay and the position holds. Wheel, End and Home all land exactly. Replay resumes from 0.
- Reduced motion: the still has no autoplay. Play runs one cycle (0→133→0) and returns to the still (110); the Play button comes back.
- No console errors. No horizontal overflow at 375 in light or dark.

## New findings

| Severity | Where | What | Fix |
|---|---|---|---|
| **Blocking** (N1) | `GEOMETRY.card` `:45` (hero `135%`) with `durationMs: 7600` `:93` | The card's travel is now 55px over a ~2.9s pass: back layer 22px, panel 55px, peak 1px/frame. `scrollTop` moves in whole px (integers in Chromium even at DPR 2), so the card steps 1px every two to three frames. Measured in the same run, inside the down pass: 122 of 177 in-motion frames do not move. Published scroll cards: scroll-linked 8/197, sticky 0/241, scroll-triggered 51/230 (peak 4–6px/frame). On the index the most-seen demo is a slow 20Hz crawl with 33px of relative motion. The constraint that set 135% is the 0.2× case, but the card always runs at the default 0.4×. | Tune the card for 0.4× only. Visible at max scroll T is `min(88 − T, 76 − 0.4T) − max(28 − 0.4T, 0)`. With the current geometry that keeps a third of a block up to T ≈ 70 (hero ≈ 145%), only 27% more than now. For real headroom, move the panel lower and the blocks up (e.g. panel 110, top 20, block 60 gives ~90px with a third showing). Then shorten the card cycle, e.g. `durationMs: size === 'card' ? 4000 : 7600`, so the pass averages ≥ ~0.9px/frame. Target: static in-motion frames ≤ ~25%, like the published cards. The entry page (133px, 54/185 static, peak 2) is acceptable as is. |
| Nit | `useWhen` `:332` vs `:331` | "A product shot or illustration that should feel layered as the page opens" restates item 2's "illustration, photography behind a headline". | Make it a different situation (e.g. "A launch or campaign page where the opening screen is the message"), or drop it. Two items are enough. |
| Nit | Prompt `:354` | It does not say where a hero headline goes. With the open top reserved for layers, an agent may put the headline in a layer, which the a11y note forbids, or over the open top without saying it is above the layers. | Optional, if words allow: "headline in the panel, or above the layers in the open top". The prompt is at 228/230. |
| Info | Demo hero `:104-106` | Fixed-height hero with the panel text clipped at the hero's bottom edge. **Acceptable, not a tell.** At max scroll the edge lands between lines at every size I checked (375 / 768 / 1280 / 1440, card and entry): 0 lines sliced, 4.6–4.8px gap after the last visible line. It reads as a window onto a longer page. Because the geometry is fixed px plus a % of the window, the clean edge depends on the window height; the e2e could assert "no line straddles the hero bottom" so a stage-height change does not slice a line later. | Optional e2e guard. |

## Feel notes

- Entry page (0.4×): 133px pass in ~3.1s, peak 2px/frame, holds 1.15s at the bottom with the blocks 54% visible, so the turn is visible now. Up pass mirrors exactly. The relative motion (80px panel vs 53px blocks) reads clearly. At 0.6× the difference is small (53px), which is honest: it is the subtle setting.
- 3 layers: the far slab frames the blocks at the top and shows as a rim at max scroll. It reads as "further" at 0.2× and 0.4×.
- Card: see N1. The still (48/55) and the max-scroll frame both show the blocks and the panel well. The problem is only the cadence and the size of the motion between them.
- Contrast unchanged: subject oklch 0.55 / 0.72, the strongest on the stage in both themes. The far slab is faint but visible.
