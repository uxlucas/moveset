---
verdict: pass
reviewedAt: 2026-10-13
approved: true
approvedBy: Lucas Lima
approvedAt: 2026-10-13
---

# Review: ease-in-out

Layer 3 craft review of `src/terms/ease-in-out.tsx`, round 2, at f68744a. The reviewer did not write the entry.

I checked the review build on :3200 with Playwright Chromium at 1280×800 and 375×812:
- light and dark, with and without emulated reduced motion
- all 36 new combinations: curve quart/cubic/expo × duration 200/300/400 × compare none/keyword/ease-out/linear
- replay mid-move, the card on `/`, the glyph and `/compare/ease-in-out-vs-ease-out`

I also built all three code tabs literally in scratch pages. The CSS tab went into a flex row with an 8px gap. The JS (FLIP) tab ran as written. The Motion tab was bundled with Motion 14.1.0 and React 19.3.0, wrapped in `MotionConfig` as written. No console errors.

Round 1 failed on two Gate items:
- at Keyword, the prompt contradicted its own acceptance list
- the CSS tab laid a normal row out wrong

Both are fixed and measured below. Verdict: **pass**. Three small nits are new. I'd fix the first one before approval.

## Findings (round 1 → round 2)

| Severity | Where | Before (round 1) | After (round 2) | Status |
|---|---|---|---|---|
| Gate | keyword curve | The prompt said "ship quart", the Motion line said `[0.42, 0, 0.58, 1]`, and acceptance demanded a computed `ease-in-out`. | Keyword has moved to Compare (none/keyword/ease-out/linear); Curve is now quart/cubic/expo. At all 36 combinations the curve in the prompt, its Motion line, both acceptance lines (CSS computed value, FLIP `getTiming()`), the JS `EASE`, the Motion tab, the CSS `transition` and the demo's computed values all agree. At keyword, the twin line reads "Comparison only; ship the house curve" at quart, "ship the curve above" otherwise. Acceptance requires `ease-in-out` (comparison only) on the twin, and the demo twin computes exactly that. | ADDRESSED |
| Gate | CSS tab fixed slots | In a flex row the slots were counted twice (0/216/432). | `.row { position: relative; height: 72px }` and `.item { position: absolute; left: 0; top: 0; width: 96px }`. Built literally inside `display: flex; gap: 8px`, the cards start at **0/104/208** (96 + 8 pitch) and land at **208/0/104**. The curve fits within 0.02%, and a retarget mid-flight is continuous (136.7 → 138 → 144.4 → 174.8). Re-sorting the DOM after `transitionend` moves nothing (208/0/104 before and after) and leaves no running animations, and DOM order becomes `bca`, matching the screen. `.item[data-moving]` computes `z-index: 1`. Under reduced motion the cards jump and fire no `transitionend`. | ADDRESSED |
| Should fix | avoidWhen | No spring or keyboard line. | "Drag to reorder, or anything that follows a finger. Use a spring: a curve reversed mid-flight stops dead." "Reorders triggered from the keyboard. Do not animate them." The a11y note repeats the keyboard rule. | ADDRESSED |
| Nit | symmetry acceptance | "mirror within 2%", with no route named. | "Slow at both ends (CSS or FLIP route): … 5% (±1) … 96% (±1)" for quart, 9/93 for cubic and 3/97 for expo. The true values are 5.3/95.6, 8.7/93.1 and 3.0/97.0, all inside ±1. A new FLIP line (`effect.getTiming()` returns `easing: 'cubic-bezier(0.77, 0, 0.175, 1)'`, `duration: 300`) is verified literally. | ADDRESSED |
| Nit | alias "symmetric easing" | Present. | Removed. | ADDRESSED |
| Nit | CSS comment wrap | 89-character line at quart. | The curve name is now on its own line (`/* Ease-in-out cubic. */`). | ADDRESSED |
| Nit | FLIP source | Missing. | "Paul Lewis: FLIP Your Animations" added (returns 200). | ADDRESSED |
| Nit (optional) | live region in prompt | Only in the a11y note. | Still only in the a11y note. That's acceptable: the prompt is near its word cap. | NOT ADOPTED (optional) |
| Prompt test | what is reordered, trigger | n/a | "Setup: a horizontal row of N cards. A button (or the card itself) moves one card to another slot; the cards in between shift one slot." | ADDRESSED |
| Prompt test | "and back" | n/a | "Moving back reverses the move." and "both directions". | ADDRESSED |
| Prompt test | DOM order stable, re-sort after `transitionend` | n/a | In the prompt's CSS route and the CSS tab comment. Verified literally (row above). | ADDRESSED |
| Prompt test | reduced motion per route | n/a | CSS `transition: none` gives an instant jump (verified). FLIP skips `animate()` (verified: 0 animations). Motion `<MotionConfig reducedMotion="user">` jumps 48 → 264 in one frame under reduce, and animates normally otherwise (48 … 111, 167, 207 … 264 over about 300ms). | ADDRESSED |

## New findings

| Severity | Where | What | Fix |
|---|---|---|---|
| Nit (fix before approval) | `cssCode` keyword comment :184-186 | The comment hard-codes "at a quarter of the time it has covered 13% of the distance, quart 5%". At cubic or expo (6 of 36 combinations) the curve in that tab is not quart; cubic is at 9% and expo at 3%. | Interpolate the name and figure: `${c.name}`, `${c.p25}%`. |
| Nit | CSS tab `.item[data-moving]` :238; prompt "The crossing card sits above (`z-index`)" | Nothing says who sets `data-moving` or when it comes off. A fresh agent has to infer it. | Add to the comment: "set on the card that crosses; remove on `transitionend`". |
| Nit | prompt length | 193 to 226 words. The maximum (cubic/expo, 400ms, keyword) is 4 words under the 230 cap, so any future line will push it over. | No action now. Trim when anything is added. |

## Re-measured

| Check | Result |
|---|---|
| 36 combinations | Each moving item animates `transform` only. All rows share a single `startTime`. `offsetLeft`/`offsetTop` never change. The computed timing function and duration match the selection on both rows. No em dashes, blocked words, `ease-in` or `transition: all` in any prompt, acceptance list or tab. Stage labels read "ease-in-out quart/cubic/expo" over "CSS keyword", "ease-out" or "linear". |
| Keyword twin vs main row | Same `startTime`. Quart 300 against keyword, frame-sampled: 6.8 vs 15.5% at 83ms, 11.5 vs 22.7% at 100ms, 59.5 vs 49.7% at 150ms, 85.3 vs 68.4% at 183ms. The largest gap is about 40px of 232px travel, which is plainly visible. Against cubic the largest gap is about 21px (9%), which is subtle. Against expo it is about 55px. |
| Replay mid-move | Quart 300 with the keyword twin, replayed at 60, 150 or 240ms: continuous (e.g. 177.1 → 176.5 → 174.5 → 170.4; the twin goes 138 → 135.6 → 128.1). Expo 400 at 200ms makes one more frame of travel at peak speed, then reverses. Going back, the item continues home. |
| Reduced motion | The still frame is home with Play. Play runs one cycle. The glyph's animation is `none`. |
| Card, glyph, compare | The card loop is unchanged (move, 1.4s hold, move back, about 3.55s cycle). The glyph animates only when active. The compare page renders both demos playing, with no overflow at 1280 or 375. |

## Feel notes

- **Keyword as a comparison:** it reads better here than it did as a Curve option. Against the default quart, the keyword twin starts sooner and lands later, so "the built-in keyword is softer" shows in one pass. Against cubic the two rows nearly agree. That's honest, since the curves are close, but it teaches the least.
- **Quart 300, expo 200, interruption:** unchanged from round 1. Quart reads as mass, and expo at 200ms is close to a cut. The new avoid line now explains why a reversed curve stops dead.
