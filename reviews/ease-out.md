---
verdict: pass
reviewedAt: 2026-10-13
approved: true
approvedBy: Lucas Lima
approvedAt: 2026-10-13
---

# Review: ease-out

## Round 3 (2f20566): final

I judged this round from `git show 2f20566` and the file; no server was running. I also swept the generator at all 36 combinations (no em dashes, no blocked words, no unticked tags, prompt at most 216 words) and ran `vitest` on the content and demo tests (21 passed).

**Verdict: pass.** Both round-2 gates and the nit are fixed.

| Severity | Item | Round 2 | Round 3 | Status |
|---|---|---|---|---|
| Gate | acceptance: "within 0.02 of the frame before" | Fails a correct reversal, the demo included | Removed. "Reverses from its current size and opacity, without first jumping to fully open" still covers it, and the live demo was measured meeting it in round 1. The string is absent at all 36 combinations. | ADDRESSED |
| Should fix | Motion tab class | `className="menu"` inherited the CSS tab's transition, which fought Motion's transform | `className="menu-panel"`, with a comment that it is the panel's own class and only places it (absolute, 4px below the trigger, left-aligned). `.menu-panel` has no CSS rule anywhere and so no transition. `className="menu"` is gone at all 36 combinations; `.menu` appears only in the comment that warns against reusing it. The placement values are in the prompt's Menu bullet. | ADDRESSED |
| Nit | focus wording | Focus returned to the trigger on every close | Prompt (`:372`): "Escape or choosing an item closes and returns focus to the trigger; an outside click closes without moving focus." Acceptance (`:387`) matches, at all 36 combinations. | ADDRESSED |
| Nit (new, optional) | `a11y` (`:395`) | n/a | Still says "return focus to the trigger when it closes", without the outside-click exception. | Optional: align with `:372` |

Everything below is the round 2 record, kept for history.

## Round 2 (016b0e1)

This is the layer 3 craft review of `src/terms/ease-out.tsx` (round 2, at 016b0e1). I did not write the entry.

Round 2 checks:

- The live review build on :3200, in Playwright Chromium:
  - every one of the 36 combinations (3 curves × 3 durations × 4 compares): computed demo styles, twin labels, and the prompt, CSS tab and Motion tab against the selected values;
  - frames sampled per rAF for the keyword twin and for a close 50ms into opening (9 curve × duration pairs, 3 runs each);
  - light and dark at 1280, 375 with compare, reduced motion, `/` and `/compare/ease-in-out-vs-ease-out`.
- The current Motion tab built verbatim in a scratch React 19 + motion 14.1.0 page, alone and with the CSS tab's rules loaded.
- `vitest` on `src/components/demo` and `src/content.test.ts`: 21 passed.

**Verdict: fail.** Every round-1 item is fixed or reworked, and the keyword twin now carries the "too weak" lesson. Two new problems block it:

- **The new acceptance line fails a correct build** (`:384`), the demo included. The wording came from my round-1 suggestion; the error is mine, not the implementer's.
- **The Motion tab reuses the CSS tab's class** (`:312`). Copying both tabs breaks the scale animation and its reversal.

Both are one-line fixes.

## Round 1 → round 2

| Severity | Where | Round 1 | Round 2 | Status |
|---|---|---|---|---|
| Should fix | Curve/Compare, prompt | Keyword was a solo curve labelled "comparison only" | Curve is now `Quint (house) / Cubic / Expo` and Compare is `None / Keyword / Ease-in / Linear`. The twin is labelled `CSS keyword` and the main menu `ease-out <curve>` (e.g. `ease-out quint`). The prompt says "Comparison only; ship the house curve" (quint) or "ship the curve above" (cubic, expo), and the twin's acceptance line expects computed `ease-out` and says "(comparison only)". See "Keyword twin" below for the measured lag. | ADDRESSED |
| Should fix | acceptance `:384` | Vacuous `getAnimations().length <= 2` | Replaced with "within 0.02 of the frame before", which a correct build fails (see New findings) | NOT ADDRESSED (new Gate) |
| Should fix | prompt `:366–369` | CSS and Motion routes mixed | Separate "CSS route", "CSS route, closed" and "Motion route" bullets. The Motion bullet says it unmounts after the exit and sets `pointer-events: none` + `aria-hidden` via `useIsPresent()`; measured in the scratch build: `pe=none hidden=true` during the exit, back to `auto`/`null` on reopen. Also new and correct: which duration goes on which rule, `data-open` presence, reduced motion per route (`transform: none` on both states), the origin in Motion `style`. | ADDRESSED |
| Nit | `content.test.ts:17–25` | `allowEaseIn` covered the whole term | A test pins ease-in in the code to `compare === 'ease-in'` at every combination. My sweep also finds no ease-in in the prompt or acceptance outside that branch. | ADDRESSED |
| Nit | `:389` | Comparison acceptance line unlabelled | "(comparison only)" | ADDRESSED |
| Nit | Motion tab | `role="menu"` | Dropped | ADDRESSED |
| Nit | `:346`, `:348` | avoidWhen gaps | "Hover and color changes. Use ease at 150ms." and "Actions used 100+ times a day or triggered from the keyboard. Do not animate them at all." | ADDRESSED |
| Nit | `:395` | related | Adds `interruptibility` and `enter-and-exit` | ADDRESSED |
| Nit | `use-cycle-hook.test.ts` | Hook untested | 6 jsdom tests: one cycle ends once with 0 timers left; not playing paints still and schedules nothing; a mid-cycle replay restarts and the old end never fires; restartKey/timeScale restart (0.25× → step at 400ms); pause paints still and cancels; unmount leaves 0 timers. All pass. | ADDRESSED |
| Optional | card on `/` | Single menu at card size | Unchanged; that is fine (see the round-1 reasoning) | n/a |

## New findings

| Severity | Where | What | Fix |
|---|---|---|---|
| **Gate** | `ease-out.tsx:384` | "Closed 50ms into opening, the next frame's scale and opacity are within 0.02 of the frame before" fails on a correct reversal, including the live demo. The close itself runs on ease-out, so its first frame moves fast by design. I toggled `data-open` off 50–67ms into opening (3 runs per pair): the opacity step was 0.20–0.65 in **all 9** curve × duration pairs, and the scale step went over 0.02 at quint 150/200 and expo 150/200 (0.021–0.032). Example, quint 200: s 0.9888 → 0.9680, o 0.775 → 0.360. Nothing jumps to fully open, so the behaviour is right and the check is wrong. A prompt-test grader would fail a correct build. | Drop the line; `:383` already says it. Or make it monotonic: "Closed 50ms into opening, the first closing frame is at or below the last open frame in scale and opacity and still above 0.95 / 0; each later frame is lower still." |
| Should fix | Motion tab `:311–312` | `className="menu"` with "Placed absolutely below the trigger, as in the CSS tab" tells the reader to reuse the `.menu` class. That class carries `transition-property: opacity, transform`, `opacity: 0` and `transform: scale(0.95)`, and its CSS transition fights Motion's per-frame inline transform. In the scratch build with both tabs loaded, the scale lagged (13ms: 0.9500 vs 0.9605 with Motion alone). On reopen mid-exit the scale **kept falling** (0.9692 → 0.9620) before rising, which breaks the tab's own "animates back from its current values" claim. Opacity was unaffected because it runs on WAAPI. | Use `className="menu-panel"` and say "position only: `position: absolute; top: calc(100% + 4px); left: 0`", or put the position in `style`. Don't point at the CSS tab's `.menu`. |
| Nit | prompt `:370`, acceptance `:386` | "On close, return focus to the trigger; Escape and outside click close" also returns focus when the close came from an outside click. That steals focus from whatever the user just clicked. | "Escape or choosing an item closes and returns focus to the trigger; an outside click closes without moving focus." |

## Evidence

**Consistency:** 0 mismatches across the 36 combinations. Every combination had:

- the right computed `transition-timing-function` on both menus, `0.15s` / `0.2s` / `0.3s` while open, `opacity, transform`, and origin `0px 0px`;
- labels `[]` with Compare none, otherwise `[ease-out <curve>, CSS keyword | ease-in | linear]`;
- matching durations and curve in the prompt, CSS tab and Motion tab;
- only the selected twin's curve in the prompt, CSS and Motion, with the right "ship the …" note.

**Copy sweep:** no em dashes, no blocked words, no unticked tags. Prompt 115–209 words (limit 230); full copy at most 415.

**Keyword twin, first frames** ([scale, opacity] at about the same ms after opening; both menus flip in the same frame):

| Pair | ~16ms | ~33ms | ~50ms |
|---|---|---|---|
| quint 200 vs keyword | 0.9669, 0.338 vs 0.9567, 0.135 | 0.9801, 0.601 vs 0.963, 0.26 | 0.9888, 0.775 vs 0.9689, 0.378 |
| expo 150 vs keyword | 0.521 vs 0.177 (opacity) | 0.805 vs 0.34 | 0.918 vs 0.488 |
| cubic 300 vs keyword | 0.156 vs 0.091 (opacity) | | |

The gap is smallest at cubic 300 and still visible. Paused frames at 16 and 33ms show it in both themes (see Paths).

**Motion tab alone:** opens without lag. Reopening 70ms into the exit continues from o 0.056 / s 0.9529 → 0.347 / 0.9682, with no restart. `useIsPresent` gates `pointer-events` and `aria-hidden` during the exit.

**Reduced motion:** before Play, `playing=false`, 0 animations, Play button present, menu open. Play runs, then it rests open with 0 animations.

**Layout:** no overflow at 1280 or 375. At 375 the `CSS keyword` label sits on one line, 16px from the stage edge. No console errors on the entry, `/`, or the compare page, light and dark.

## Feel notes

The keyword twin is now the clearest frame on the page. At 33ms the house curve's menu is two-thirds in and the keyword's a quarter, and nobody has to toggle a control to see "too gentle". The rest of the feel is unchanged from round 1. House quint answers the press; expo is snappier and cubic softer. Ease-in is the starkest contrast, and linear is mechanical.

## Paths

- `.superpowers/review-ease-out-light.png` and `.superpowers/review-ease-out-dark.png`: the entry page at 1280, re-taken.
- Reviewer scratchpad:
  - images: `filmstrip-keyword.png` (its 66ms frame is a capture artifact; the rAF numbers above are authoritative), `keyword-33ms-{light,dark}.png`, `mobile-keyword.png`;
  - `ap2/`: Motion tab + CSS tab build;
  - `r2.mjs` (36 combinations), `r3.mjs` / `r4.mjs` (keyword twin lag and 50ms reversal).
