---
verdict: pass
reviewedAt: 2026-10-13
approved: true
approvedBy: Lucas Lima
approvedAt: 2026-10-13
---

# Review: stagger

## Round 3 (8c1f5dd): gate check

**Verdict: pass.** Approval is Lucas's to give, so `approved` stays `false`.

**The round 2 gate is addressed.** The cycle now writes `--n`, `--step` and `--d` (and `data-n`) at `reset`/`in` and on the still frame, and `--x` when the exit starts. React no longer renders them, so a control change can't re-time the paused entrances.

**Interrupts, 250ms into a 100ms forward cascade** (live build on :3200, probe `p12.cjs`, sampled every rAF):

| Interrupt | Item opacity during the leave | List and item × list opacity | Next cascade starts (ms) |
|---|---|---|---|
| Order → Reverse | Paused at `[1, 1, .92, .23, 0, 0]`, then flat | List 1 → .56 → .27 → .12 → .05 → .02; item × list falls on every frame | 514, 414, 314, 215, 115, 15 |
| Order → Center out | Paused, flat | Falls on every frame | 216, 116, 15, 15, 116, 216 |
| Delay → 30ms | Paused, flat | Falls on every frame | 16, 31, 66, 99, 133, 165 |
| Delay → 60ms | Paused, flat | Falls on every frame | 15, 65, 132, 182, 248, 316 |
| Replay | Paused, flat | Falls on every frame | 16, 116 … 516 |
| Compare → All at once | Paused, flat | Falls on every frame | 15, 114 … 514 |

- Across all six interrupts, the largest rise of any item's opacity during the leave is 0.000, and of item × list opacity also 0.000. Waiting items stay at 0.
- The one change between the last `in` frame and the first `leave` frame (`+.04`, `+.23`) is the entrance's normal progress for that frame, the same as with Replay; nothing jumps.
- The round 2 failures (`[0, 0, .23, .92, 1, 1]` and `[1, 1, 1, 1, .99, .98]`) are gone.

**Prompt:** center-out reads "`--n` = distance from the middle, rounded down (6 items: 2, 1, 0, 0, 1, 2)" again (`:190`).

**No new breakage:**
- **18-combination sweep:** starts within one frame of k × delay. The twin starts in the lead item's frame. The list exit stays in sync and is below 0.02 by about 100ms. Blur ≤ 2px, rise 8px, labels correct.
- **Copy:** prompts run 201 to 230 words; 100ms / center / compare is exactly at the 230 limit. No em dashes, blocked words or bare tags.
- **Card on `/`:** loops still → in → leave → in with `data-n=012345` and no console errors.
- **Reduced motion:** still frame with all six at 1 and 0 animations, Play button, no autoplay.

Everything below is the earlier rounds, kept for history.

## Round 2 (b7ccc41): scoped re-review

**What I ran:**
- **Live build on :3200:** the 18-combination sweep again, plus interrupts 250ms into a 100ms cascade. I sampled every frame for each item's opacity, the list's opacity, and their product.
- **Tabs verbatim in scratch pages:**
  - CSS: 6 and 10 items, with `data-leaving` set 150ms in, under both motion settings.
  - Motion: AnimatePresence with `open` set false 60, 150 and 360ms into the cascade, then a remount. Built on motion 14.1.0.
- **Motion tab under `tsc --strict`.**
- **Glyph and reduced-motion checks.**

**Verdict: fail.** Replay is fixed and the recipes are right. A Delay or Order change mid-cascade still flashes the waiting items in.

| Severity (round 1) | Item | Round 2 | Status |
|---|---|---|---|
| Gate | Demo: exit mid-cascade | **Replay is clean.** At the flip the items pause where they are, `[1, 1, .95, .44, 0, 0]`, and the list fades 1 → .56 → .27 → … in about 150ms. The largest rise of any item, and of item × list, is 0.000. Waiting items stay at 0, and the next cascade starts at 16, 116 … 516 with the list back at 1. A Compare change mid-cascade is also clean. **A Delay or Order change is not** (see New findings). | NOT ADDRESSED (partly) |
| Gate | CSS tab exit, prompt, acceptance | Run verbatim, `data-leaving` 150ms into a 100ms cascade with 10 items: items freeze at `[.95, .44, 0 ×8]`, the list fades and lifts −4px, and the largest rise is 0.000. `transitionend` fires for `opacity` and `translate` on the `UL` at about 335ms, and `pointer-events: none` applies while leaving. Prompt `:404`: "the whole list as one … never per item … unmount on `transitionend`". Acceptance `:419-420`. | ADDRESSED |
| Should fix | Reduced-motion exit moves | CSS under reduce: the list's `translate` stays `none`, only `transitionend: opacity` fires, and items keep opacity 1. Motion under reduce: `y: 0`. | ADDRESSED |
| Should fix | Deprecated Motion APIs | `stagger(0.1)` "replaces `staggerChildren`", and reverse uses `stagger(…, { from: "last" })` (`:187-191`). Center drops the shorthand from the prompt. | ADDRESSED |
| Should fix | Untyped `delayChildren` | The tab now reads `(i: number)` / `(i: number, total: number)`. `tsc --strict` shows no TS7006 at any order; the only errors left come from my scratch setup (TS7016, React types not resolved). | ADDRESSED |
| Should fix | ±1 frame | `:413` allows the computed `animation-delay`, `getAnimations()[0].effect.getTiming().delay`, or first opacity > 0.01 at ±2 frames. | ADDRESSED |
| Should fix | First-paint rule | avoidWhen `:382`. | ADDRESSED |
| Nit | 100ms label | `100ms (slow)` (`:15`). | ADDRESSED |
| Nit | Glyph rows | `g-stag-2` and `g-stag-3`. Measured opacity at 1200ms is `.12 .12 .12`: the rows fade together and still rise in sequence. | ADDRESSED |
| Nit | Motion `exit` | AnimatePresence with `exit` on the `ul`, then unmount. A remount replays, with starts at 0, 83 … 584 ×4 and the cap holding. | ADDRESSED |
| Nit | ~400ms figure | "about 6 steps (360ms at 60ms)" (`:381`). | ADDRESSED |
| Prompt test | `blur(0px)` at rest | Accepted in the prompt `:398` and acceptance `:415`. | ADDRESSED |
| Prompt test | "Last item" | Defined as "the one with the largest delay (under the cap several share it)" (`:417`). | ADDRESSED |
| Prompt test | Trigger and remount | "Plays on mount or when state shows the list; remounts replay, re-renders do not" (`:402`), and acceptance `:418`. Verified in Motion: a re-render does not replay, a remount does. | ADDRESSED |

**The Motion route split is honest.** Under a parent `exit`, children keep animating toward `show`. Item opacity still rose by up to 0.23 a frame during the exit.

The list fades from its first exit frame (0.68, then 0.34, then 0.16), so the visible opacity stays tiny. "Visible" here means item opacity × list opacity:

| Exit started | Largest visible opacity of an item that hadn't appeared | Largest visible rise in one frame |
|---|---|---|
| 150ms into 100ms forward | 0.044 | 0.024 |
| 360ms in | 0.050 | 0.041 |
| 60ms into center | 0.015 | 0.011 |
| 60ms into reverse | 0.024 | 0.028 |

The implementer's estimate of under 0.15 was conservative. A strict "no item's opacity rises" would be false for Motion, so scoping it to the CSS route is right. "No item that had not appeared flashes in" holds. Freezing the children isn't needed; it is optional polish.

### New findings

| Severity | Where | What | Fix |
|---|---|---|---|
| **Gate** | `stagger.tsx:82` and `:85` (`--n` and `--step` on paused items), `:137-141`, restart at `:116` | **A Delay or Order change mid-cascade still flashes.** The new values re-render `--n` and `--step` onto the paused `demo-stagger-in` animations, which re-times them at the flip frame while the list is still at opacity 1.00. All three cases were measured 250ms into a 100ms forward cascade, starting from `[1, .99, .88, 0, 0, 0]`. **Order → Reverse:** `[0, 0, .23, .92, 1, 1]`. Three waiting items pop in and two visible ones vanish, then everything fades with the list. **Delay → 30ms:** `[1, 1, 1, 1, .99, .98]`. **Order → Center out:** `[.88, 1, 1, 1, 1, .92]`. The new e2e covers Replay only. | Don't let new values reach the items until `reset`/`in`. Keep the in-flight cycle's `n` and `delay` for the items (and `--step`) until the `in` step, for example committed values in a ref or state swapped at `in`. Or write `--n` and `--step` imperatively in the `in` step. Add an e2e case: an Order change 250ms into a 100ms cascade raises no item's opacity. |
| Nit | prompt `ORDER_TEXT.center` `:169` | Center now reads "`--n` for 6 items: 2, 1, 0, 0, 1, 2" and has lost the rule ("distance from the middle, rounded down"). An agent with 7 or 10 items has to infer it from the Motion formula. | Use "`--n` = distance from the middle, rounded down (6 items: 2, 1, 0, 0, 1, 2)". |

**Sweep:**
- The 18 combinations are unchanged where they should be: starts within one frame of k × delay, the twin in the lead's frame, blur ≤ 2, rise 8px.
- The list exit stays in sync and is below 0.02 by about 100ms.
- Labels are correct and `100ms (slow)` appears.
- Prompt length 201 to 228 words (limit 230).
- No em dashes, blocked words, `ease-in`, `transition: all` or bare tags.
- The `offsetTop` change during `leave` is not a layout shift. It comes from the list's transform, which makes the `UL` the items' `offsetParent`; `getBoundingClientRect` and `offsetHeight` (208) are unchanged.
- Reduced motion on the site is unchanged: a still frame with all six in and 0 animations, the Play button, no autoplay, and the glyph off.

Everything below is the round 1 record, kept for history.

## Round 1 (58184d2)

This is the layer 3 craft review of `src/terms/stagger.tsx` on `batch-4` at `58184d2`. I did not write the entry.

## What I checked

- **Live review build on :3200** in Playwright Chromium at 1280, light and dark. For each of the 18 combinations (delay 30/60/100 × order forward/reverse/center × compare none/all) I triggered a Replay and sampled every item on each rAF: the start frame, opacity, transform, filter, `offsetTop` and phase. I also read the computed `animation-*` values, the twin labels, and the text of the prompt, CSS, Motion and JS tabs and the acceptance list.
- **Interruptions:** a Replay and a control change made mid-cascade.
- **Click during the cascade:** a real mouse click on the last item while it was at opacity 0.
- **Reduced motion:** emulated on the entry and on `/`.
- **Other surfaces:** the card on `/`, the sidebar glyph, and 375 px with compare on (no overflow, no console errors).
- **Code tabs run verbatim in scratch pages** (outside the repo):
  - CSS tab: 6 and 10 items at 60/center, 30/reverse and 100/forward.
  - JS tab: 30/reverse with 10 items.
  - Motion tab: bundled with the repo's motion 14.1.0 and React 19.3, at center with 6 items, and forward and reverse with 10 items, plus a re-render.
  - All of the above, with and without reduced motion.
- **Motion tab under `tsc --strict`.**

## Verdict: fail

The lesson itself is right. Timing, order, cap, the recipe, the simultaneous exit and click-through all measure correctly. One gate blocks it: an exit started mid-cascade makes every item that hasn't entered yet flash to full opacity. This happens in the demo, and the CSS recipe teaches the same bug. Four more items should be fixed in the same pass.

## Findings

| Severity | Where | What | Fix |
|---|---|---|---|
| **Gate** | `stagger.tsx:79`, `globals.css:267-269`, restart at `:105-107` | **A restart mid-cascade flashes the hidden items.** `demo-stagger-out` has only a `to` keyframe, so it starts from the item's underlying style (opacity 1), not from where the entrance had got to. Replay at 100ms/forward, about 250ms into the cascade: `[1, 0.95, 0.44, 0, 0, 0]` became `[1, 1, 1, 1, 1, 1]` on the next frame, then `0.56` and onward. A control change mid-cascade did exactly the same. The four unentered items pop in for a frame (opacity, and the 8px offset and blur snap away). | Run the exit on the list container (`ul`), not on each item: `opacity 0` and `translateY(-4px)` over 150ms on the `ul`. The items keep whatever state they had, so nothing pops. On `in`, reset the container in the same attribute flip that starts the item keyframes. An exit "all at once" is exactly one container fade. |
| **Gate** (same root) | CSS tab `:217-228`, prompt `:364` | **The recipe ships the same flash.** In a scratch page with the CSS tab verbatim, setting `data-leaving` 150ms into a 100ms cascade gave `[0.88, 0, 0, …]` and then `[1, 1, 1, …]`. This happens in real use when a search re-queries while results are still cascading in. | CSS tab: put the exit on `.stagger[data-leaving]` itself (`opacity: 0; translate: 0 -4px; transition: opacity 150ms var(--ease-out), translate 150ms var(--ease-out)`). Prompt exit bullet: "Exit: the whole list as one, 150ms, to `opacity: 0; translateY(-4px)`; never per item (an item still entering would flash in)." Acceptance: "Leaving mid-cascade, no item's opacity rises." |
| Should fix | CSS tab `:237-245` | **Reduced motion still moves the exit.** `.stagger[data-leaving] > *` (0,2,1) outranks the reduced-motion `.stagger > *` (0,1,1), so `fall-out` keeps `translateY(-4px)`. Measured under emulated reduce: `maxTy -4`. The prompt says "no movement". | With the container exit above, add `@media (prefers-reduced-motion: reduce) { .stagger[data-leaving] { translate: none } }`. |
| Should fix | `MOTION_SHORTHAND :166-170`, used at `:262` and `:360` (prompt and Motion tab) | **Deprecated Motion APIs.** The prompt names `staggerChildren: 0.06` and `staggerChildren …, staggerDirection: -1` as the equivalents. Both are `@deprecated` in motion-dom 14.1.0 (`index.d.ts:2190`, `:2199`), and the docs point to `delayChildren: stagger(interval)` and `stagger(interval, { from: "last" })`. | Forward: "`delayChildren: stagger(0.06)` is the same, without the cap". Reverse: "`stagger(0.06, { from: \"last\" })`". Center stays as is. Keep `staggerChildren` as an alias for search. |
| Should fix | `delayFn :155-163`, Motion tab `:263` | **The Motion tab fails strict TypeScript.** `const delayChildren = (i, total) => …` and `(i) => …` are standalone consts with no contextual type, so `tsc --strict` reports TS7006 (implicit any) on `i` and `total` at every order. This is a `.tsx` file that imports `type Variants`. | `(i: number, total: number) =>`. The prompt bullet can keep it short because it sits inline in `transition`, where the parameters get a contextual type. |
| Should fix | acceptance `:373` | **±1 frame is too tight for the Motion route.** A correct Motion build, timed from first opacity > 0, measured `[99, 49, 0, 0, 49, 99]` against 120/60 at 60ms/center in 2 of 5 runs (−20ms). At 100ms/forward it measured `83, 183, …, 583` against `100, 200, …, 600`. Motion's delay is frame-quantized and so is first-visible detection, so a grader would fail a correct build. CSS stayed within ±17ms. | "±2 frames (±34ms)". Or, for any route, "the computed or `getAnimations()` delay of the item k steps away is k × 60ms". |
| Should fix | `avoidWhen :338-344` | **The first-paint rule is only implied.** Use and avoid cover entrances, lists revisited all day and items added later. Nothing says that content already in place on first paint doesn't get a stagger. The prompt's "Plays once, on first appearance" reads as "on every page load" for the CSS route. | Add to avoidWhen: "Content already in place when the page paints, like a dashboard people return to or a list restored on Back. Stagger a state change (results arriving, a step opening) or a first-run entrance." |
| Nit | controls `:13-15` | The 100ms option isn't marked as slow in the UI. The prompt says "too slow", but the control reads plain `100ms`, whereas Spring's control shows `0.4 (playful)`. | Use the label `100ms (slow)`. |
| Nit | `globals.css:189-199`, `:257-261` | **The glyph's exit is staggered.** Rows fade out at about 1.1s, 1.25s and 1.4s, because the delays carry into the fade. The comment says "fade out together", and the term teaches simultaneous exits. | Keep the delays for the rise, and give rows 2 and 3 their own keyframes, with the fade at the same absolute time as row 1. |
| Nit | Motion tab `:255-291` | **No exit in the Motion tab.** The prompt specifies the exit, and the CSS tab has one, but the Motion tab doesn't. | Add a one-line `exit` on the list (AnimatePresence around it), the whole list as one. |
| Nit | `avoidWhen :341`, `delayLine :175` | **The cap and the ~400ms guidance disagree at 100ms.** avoidWhen says the last item starts within about 400ms, but at 100ms the cap gives 600ms. The 100ms option is labelled too slow, so this is low risk. | Optional: tie the cap to the 400ms: `min(n, 6)` at 30 to 60ms, or say "about 6 steps". |
| Optional | `List :72-83` | The demo can't show that a stagger never blocks interaction: its `li`s have no handler and no focus. I confirmed click-through by adding my own listener: hit-test on the last `LI` at opacity 0 returned it, and `pointer-events: auto`, no `inert`, the click fired. | Leave it, or make the detail items `button`s with a press state. That adds weight, and I wouldn't block on it. |

## Evidence

**Start offsets** (ms from the stagger list's first item, first opacity > 0, per rAF; twin items prefixed `a`):

| Combination | Measured | Expected |
|---|---|---|
| 30 / forward | 0, 17.7, 50.6, 84.6, 117.6, 134 | 0, 30, 60, 90, 120, 150 |
| 30 / reverse (bottom first) | 15.8, 32.4, 65.2, 98.5, 132.3, 165.4 (index 5…0) | same |
| 30 / center | middle pair 17, then 33.4, 65.8 | 0, 30, 60 |
| 60 / forward | 15.3, 65.3, 133.2, 182.3, 248.5, 299.3 (t from `in`) | 0, 60, …, 300 |
| 60 / reverse | 17.5 → 317.5 | same |
| 60 / center | 16.4, 65.7, 133 | 0, 60, 120 |
| 100 / forward, compare | 17.4, 100.6, 200.2, 300.1, 400.1, 500; a0 ×6 @ 17.4 | 0, 100, …, 500 |
| 100 / reverse | 15.8 → 515.3 | same |
| 100 / center | 16.1, 116.4, 216.1 | 0, 100, 200 |

Every combination matches within one frame. Computed delays are exact: `0.06s` steps, center gives `0.12 / 0.06 / 0 / 0 / 0.06 / 0.12`, and the twin is `0s` on all six. The twin always starts in the same frame as the stagger list's lead item.

**Every combination, measured:**

- Duration `0.3s`, timing `cubic-bezier(0.23, 1, 0.32, 1)`, fill `both`.
- Blur ≤ 2px, translateY 8 → 0 on entry and 0 → −4 on exit.
- `offsetTop` unchanged (no layout shift).
- Exit in sync on every frame and below 0.02 opacity by about 100ms (150ms total).
- The `in` phase starts 500ms after `out`.
- Labels `[]` with compare off, `["<d>ms stagger", "all at once"]` with it on.

**Copy sweep across the 18 combinations** (prompt, CSS, Motion, JS and acceptance):

- No em dashes, no blocked words, no `ease-in`, no `transition: all`, no tags outside backticks.
- Prompt length 180 to 225 words, under the 230 limit.
- Delay values match across the prompt and all three tabs.
- "too slow" appears only at 100ms.
- "Comparison only" appears only with compare on.

**Tabs run verbatim:**

| Tab | Result |
|---|---|
| CSS, 60/center, 6 items | 117, 50, 0, 0, 50, 117 |
| CSS, 100/forward, 10 items | 0, 100, 200, 300, 400, 500, 600, 600, 600, 600 (cap holds) |
| CSS, 30/reverse, 10 items | capped at 166 |
| JS, 30/reverse, 10 items | 167 ×4, 134, 117, 84, 50, 16, 0 |
| Motion, fwd and rev, 10 items | the same cap; a re-render doesn't replay |
| Reduced motion, every tab | all items start in the same frame, no transform, no blur, all in by about 117ms (CSS), 133ms (JS) |

The CSS exit under reduced motion still moves −4px (see Findings).

**Reduced motion on the site:**

- The still frame shows all six at opacity 1 with 0 running animations, and the Play button shows.
- No autoplay on the entry or the card.
- Play runs one full cycle and goes back to still. This matches the house demo policy.
- The glyph is `animation-name: none`.

**Glyph:** it animates only while active (`g-stag 2.4s`, delays 0, 0.12s and 0.24s, on the house ease-out). It's inactive on `/`.

**Contrast** (computed lab L values):

| | Canvas | Surface | Ring | Subject square | Line | Twin square |
|---|---|---|---|---|---|---|
| Light | 98.3 | 100 | 91 | 48 | 85 | 85 |
| Dark | 2.8 | 5.7 | 14.2 | 67.5 | 21 | 21 |

The muted twin square keeps the stagger list as the subject. Lines are faint in both themes but are the same tokens as the published demos.

## Feel notes

- **The cascade reads well at 60ms.** The comparison does the teaching: side by side, the block reads heavier and the cascade guides the eye. That's the best moment in the entry.
- **30ms** is almost a block at this size, which is a fair lesson.
- **100ms** drags visibly, and the last item lands about 800ms after the first. The "too slow" label is earned.
- **Center out** reads as a bloom from the middle pair, and reverse as rising from the bottom. Both are clear.
- **The exit** (150ms, −4px, together) is quieter than the entry and reads as "clear the stage". The 350ms beat before the cascade lets the entrance read on its own.
- **The card loop** teaches the cascade alone; the block only shows with compare on. That's fine at card size, and six items are enough.
- **The entry page** plays one cycle and rests with all six in, which is right. The first motion a visitor sees is the full list leaving, which is a slightly odd opener for an entrance term. It's acceptable, since the still frame has to be the full list for SSR and reduced motion.
- **The flash is the only thing that feels wrong**, and visitors will hit it: clicking through Delay and Order mid-cascade is the natural way to use this page.

## Prompt test

I didn't run it as a separate fresh agent. Instead, I ran the CSS, JS and Motion tabs verbatim (above), and they produce the acceptance behaviour, except for the exit-mid-entrance case and the reduced-motion exit.
