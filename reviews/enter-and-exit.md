---
verdict: pass
reviewedAt: 2026-10-13
approved: true
approvedBy: Lucas Lima
approvedAt: 2026-10-13
---

# Review: enter-and-exit

## Round 3: scoped check after the second fix round (batch-6, cdbe781)

What I read: Round 2 (below), `.superpowers/batch-6-fixes-2.md` items 8 to 13, `git show cdbe781 -- src/terms/enter-and-exit.tsx`, and the current term file.

What I drove: the review build on :3200 in Playwright Chromium. I sampled the toast's computed `opacity`, `transform`, `visibility`, `transition-duration` and `data-state` every frame at all six combinations. I re-dumped the six prompts with `dump-prompt.ts`. I rebuilt both tabs for all six combinations in a scratch page (esbuild, one copy of React and Motion from the worktree). I also wrote a CSS build at Mirrored / 8 from the prompt text alone, without looking at the tab. Times are ±17ms (60fps headless).

**Verdict: fail, on one line again.** N1, N2, N3 and items 11 and 13 are fixed, and nothing regressed. The new interruption tolerance from item 12 is false at the default combination (N4). It says "no frame steps more than the exit's own largest step". At Quiet 16, the demo, the CSS tab and the from-prompt build all step 2.87px when dismissed one frame into the enter, and the Quiet exit's largest step is 1.75px. So a correct build fails the check, which is the same kind of problem as N1. The fix is to the wording only. The acceptance list does not count toward the 230 words.

### Items

| # | Item | Status | Evidence |
|---|---|---|---|
| 8 / N1 | Acceptance line 1 | Fixed | Quiet and Mirrored: "`0.2s` with `data-state="open"`, `0.15s` (or `0.2s`) while `closing`, and `0s` once `closed`". The demo matches at all four combinations: `open` 0.2s, `closing` 0.15s (Quiet) or 0.2s (Mirrored), `closed` 0s. So does the CSS tab, frame by frame (Quiet 8: `closed 0s matrix(…, 0, 8)`). None still says "`0.2s` with `open` and `0s` without". It measures 0.2s while open and 0s at rest, in both the demo and the tab. |
| 9, 13 / N2 | Focus return, both routes | Fixed | The sentence now sits in the shared "First paint" bullet: "Dismissed with focus inside, `trigger.focus({ preventScroll: true })` before closing." That bullet sits above both route bullets. In the scratch page, a keyboard Dismiss sends focus to the trigger at all six combinations on both routes (CSS → `cshow`, Motion → `mshow`). In the demo, Enter on Dismiss gives Show toast with `:focus-visible`, and scrollY stayed at 248 before and after. The Motion tab only does this if the parent follows the tab's comment (see N5). |
| 10 / N3 | Mirrored `closed` 0ms | Agree with keeping it | Without the rule, Mirrored `closed` would take 0.2s from the base rule, and the line-1 acceptance would be false on a correct build. With it, the rule changes nothing you can see, and the new comment is true. The comment could give the real reason, "so `closed` computes `0s`, as on every route", but that is optional. |
| 11 | Mirrored wording, CSS base rule, container, placement | Fixed | "played backwards" is gone from the prompt, both tabs and the term file. It now reads "same curve and duration, the full travel back (`--ease-out`, not reversed …)". The CSS route gives every state's values: `open` `opacity: 1; visibility: visible; transform: none` at 200ms; the base `closing` rule with the exit target and its duration; `closed` "as `closing` at `translateY(Npx)`" at 0ms. The setup line reads "Bottom centre of its `position: relative` container, 16px up". The demo is centred by margins at the bottom edge; its 12px inset is a scaled frame, accepted in round 2. **From the prompt alone (Mirrored / 8)** the build needed nothing else. It paints open with 0 animations and sits centred (100 / 100px side gaps) 16px up. Exit: 0.662 / 2.71 → 0 / 8 by 216ms → `closed` at 0s. Enter: 0.339 / 5.29 → 1 / 0 by 212ms. A re-show 40ms after `closed` starts from 0 / 8. Turn-backs both ways have no jump. Focus goes to the trigger, and Tab skips the closed Dismiss. A hover-out `color` `transitionend` did not cut the exit short. Under reduced motion `transform` is `none` in every frame and the fade is unchanged. **The CSS tab** gives the same values to ±0.003 in every frame, and so does the demo. |
| 12 | Tolerances | Partly (N4) | "within 200ms (±1 frame) of the first animated frame (the first frame where its `opacity` moves)": enter 168ms, Quiet exit 117ms, Mirrored exit 167ms (all within). The step bound is the problem (N4). |
| 6 | Prompt hygiene | Pass | Word counts: Quiet 226 / 226, Mirrored 228 / 228, None 193 / 193 (8 / 16px), all ≤230, so the builder's max of 228 holds. There are no blocked words and no em dashes, and code and tags are backticked. It reads terse. **The dropped "highlight moves inside a component get none" clause:** nothing is lost. A toast has no inner highlight, the prompt test called the clause untestable here, and the rule still lives in `avoidWhen`. |

### New findings

| # | Severity | Where | Before | After |
|---|---|---|---|---|
| N4 | Should fix | Acceptance, interruption line (`:465`) | "no frame steps more than the exit's own largest step." I dismissed one frame after the enter's first animated frame at Quiet 16. The toast goes 0.339 / 10.58 → 0.044 / 7.71: a 2.87px step (2.88 in the CSS tab, 2.87 in the from-prompt build). The Quiet exit's largest step is 1.75px. The motion is right: it keeps rising smoothly toward the 4px target, so there is no jump, and the line is what is wrong. Mirrored, re-shown 180ms into the exit, steps 0.001 → 0.340 against an exit step of 0.338, so it fails by frame jitter, because there the enter and exit share curve and duration. | "no frame steps more than the larger of the enter's and the exit's own largest step (±0.01 `opacity`, ±0.1px)". Measured maxima at Quiet 16: enter 0.34 / 5.42px, exit 0.44 / 1.75px; interruptions ≤0.415 / 2.88px. |
| N5 | Nit (optional) | Motion tab | The focus return is a JSX comment. If you paste the tab as is with a plain `onDismiss={() => setOpen(false)}`, focus drops to `body` after a keyboard Dismiss (measured at Quiet 16, Mirrored 8 and None 8). The prompt and the comment both say what to do, so this does not block. | If you want the code to carry it, as Icon Swap's box now does, take a `trigger` ref prop. Then the button does `onClick={() => { trigger.current?.focus({ preventScroll: true }); onDismiss() }}`. |
| N6 | Nit (optional) | Prompt setup line | "Bottom centre" does not say how to centre. `left: 50%; transform: translateX(-50%)` would be overwritten by `transform: none` and `translateY(…)`. The demo centres by margins for this reason (`:80`). | "Bottom centre (margins, not `transform`)" adds 4 words, which puts Mirrored at 232. Save them elsewhere, for example drop "the enter origin," from the CSS route's `closed` clause. |
| N7 | Nit (optional) | Prompt, reduced motion | "`transform: none` in every state" is right. But at Quiet, a lone `.toast { transform: none }` in the media query loses to `.toast[data-state="closed"] { transform: translateY(16px) }`. The tab avoids this with `.toast, .toast[data-state]`. Icon Swap got the same note in item 7. | "…in every state (repeat the state selectors)". Only if the words fit. |

### Regressions

None.

- **Timings, demo.** Quiet 16: exit 0.564 / 1.74 → 0 / 4 at about 133ms, then `closed` at 16 and 0s. Quiet 8: the same exit, then `closed` at 8. Mirrored 16: 0.662 / 5.41 → 0 / 16 at about 183ms. Mirrored 8: 0.663 / 2.7 → 0 / 8. None: 1 / 0, then 0 / t hidden in the next frame. Enter at all six: 0 / t → 0.339 / 0.66t → 1 / 0 by about 168ms, `cubic-bezier(0.23, 1, 0.32, 1)`.
- **Timings, tabs.** The CSS tab matches the demo frame for frame at all six. The Motion tab runs the same durations: it unmounts at 195ms (Quiet) or 246ms (Mirrored), with `initial={false}`.
- **Labels.** At all six they read `enter 200ms, Npx` and `exit 150ms, 4px` / `exit 200ms, Npx` / `exit none`.
- **First paint.** The SSR HTML has `data-state="open"` on the entry and on `/`. With reduced motion the still frame is `open`, `transform: none`, 0 animations. Both tabs paint open with 0 animations.
- **Interruption.** A re-show 40ms into the exit turns back from 0.123 / 3.51 (Quiet) or 0.225 / 12.4 (Mirrored 16). A re-show 40ms after `closed` starts from the full travel. A Dismiss mid-enter turns back. Show while open snaps and plays a new toast. None, dismissed mid-enter, is gone in the next frame.
- **Reduced motion.** Play keeps the travel (max y 16 / 16 / 8 / 8 / 16, `taken-over=false`). A gesture fades in place (max y 0 on Dismiss and on Show). Play after a gesture gets the travel back.
- **Keyboard.** The Dismiss ring is the accent in every sample (`transition-property: color`). Escape still does nothing, and "Escape" appears nowhere. Tab after the exit skips the closed Dismiss.
- **Card on `/`.** It has 0 buttons and the labels sit above the frame. The loop goes closing → closed in about 150ms, then open 450ms later. Under reduced motion the labels (y 327 to 342) clear Play (y 446 to 478). The glyph is active with 1 animation.
- **375px.** Overflow is 0 on the entry and the index, in light and dark.
- **Both themes and console.** No console errors in light, dark, at 375px, with reduced motion, or in the scratch pages. Screenshots refreshed: `review-enter-and-exit-{light,dark}.png`.

## Round 2: scoped re-review after the fix round (batch-6, ede855b)

What I read: round 1 (below), `.superpowers/batch-6-fixes.md` items 1 to 14, `git show ede855b` for the term and the e2e spec, and the current `src/terms/enter-and-exit.tsx`.

What I drove: the review build on :3200 in Playwright Chromium. I sampled the toast's computed `opacity`, `transform`, `visibility`, `transition-duration` and `data-state` every frame at all six combinations, at 1280px and 375px, in light, dark and reduced motion. I re-dumped all six prompts with `dump-prompt.ts`. I rebuilt both code tabs for all six combinations in a scratch page (esbuild, React and Motion from the worktree). The scratch page wires the tabs as their comments say, including the focus return and the `transitionend` filter. Times are ±17ms (60fps headless).

**Verdict: fail, on one line.** All three should-fixes from round 1 are fixed, and so are the nits except the optional E11. But the E4 fix made the first acceptance line false: it says `transition-duration` is `0.15s` "without" `data-state="open"`, and `closed` now computes `0s` (N1). A correct build fails that check. An agent that trusts the checklist would put the drift back. Nothing regressed.

### Items

| # | Item | Status | Evidence |
|---|---|---|---|
| E1 | Reduced-motion Play keeps the travel | Fixed | Under reduced motion, Play keeps `data-taken-over="false"` and runs with full travel. Quiet 16: exit 0.56 / 1.75 → 0 / 4, `closed` at 16, enter 0.34 / 10.58 → 1 / 0. Mirrored 16: exit to 16 (14.95 while visible). Quiet 8 ends at 8 and Mirrored 8 at 8. None 16: cut, then enter from 16. So the options still differ. A gesture fades in place: max y is 0 in every frame of a Dismiss and a Show. The computed value is `matrix(1, 0, 0, 1, 0, 0)` while closing or closed and `none` when open, the same visually as `none` (see the note below). A Play after a gesture gets the travel back (max y 16). The still frame is `open` with `transform: none` and 0 animations. The e2e covers both cases. |
| E2 | Keyboard Dismiss returns focus | Fixed | Tab to Dismiss, then Enter: `document.activeElement` is Show toast (`:focus-visible`), the state is `closed`, and the next Tab reaches Replay. With the page scrolled so the trigger sits at −48px, scrollY stayed at 248 before and after (`preventScroll` holds). A mouse Dismiss also moves focus to the trigger, with no `:focus-visible` ring. The fix is in the `a11y` note, the acceptance list, the CSS route (prompt) and a comment in both tabs. In the scratch page, both tabs' wiring sends focus to the trigger at every combination. |
| E3 | No Escape | Fixed | "Escape" does not appear in the six prompts, the acceptance lists, the `a11y` note, either tab (all six combinations), the term file, the live `main` text under both tabs, or the SSR HTML. The prompt reads "(Enter on the trigger or Dismiss)". Escape still does nothing, by design: the state stays `open`. |
| E4 | `closed` in no time | Fixed (see N1) | The demo computes `closed` at `0s` with the full travel (`matrix(…, 0, 16)` or `8`). The CSS tab has `.toast[data-state="closed"] { transition-duration: 0ms }` for Quiet and Mirrored, and `0ms` on the base rule for None. Re-showing 40ms after `closed`, the demo starts from 0 / 16 → 0.34 / 10.58 (Quiet 16), 0 / 8 (Quiet 8), and 0 / 16 or 0 / 8 for Mirrored. The CSS tab does the same: 0 / 16 → 0.34 / 10.61. |
| E5 | `transitionend` filter | Fixed | The prompt now says "its own `opacity` `transitionend` (`event.target` is the toast, `propertyName === 'opacity'`)". The demo filters on `e.target` and `propertyName` (`:203`), and so does the CSS tab comment. In the scratch page I gave Dismiss a 150ms colour transition, hovered it, clicked, then moved the mouse away during a Mirrored exit. The state stayed `closing` until the opacity ended (222ms), then went to `closed` at 254ms, so there was no early jump. |
| 6 | Acceptance scoping and settle wording | Fixed | Quiet: "While visible (`closing`) … 4px … `closed` sits at the enter origin, hidden." Enter: "settled at `opacity` 1 and `transform: none` by 200ms from the first animated frame". Measured: 1 / 0 by 183 to 209ms after the first animated frame. |
| E6 | Dismiss focus ring | Fixed | `transition-property: color`. The ring is the accent `lab(52.85 39.71 −66.04)` in all six samples over 150ms, the same as Show toast's ring. |
| E7 | Mirrored CSS comment | Fixed | Mirrored: "faded, slid the full travel back to the bottom edge". Quiet still says "nudged". |
| E8 | `none` interruption line | Fixed | "Dismissed while entering, it is gone in the next frame." Measured: 0.78 / 3.6, then 0 / 16 hidden in the next frame. |
| E9 | Why not `@starting-style` | Fixed | The CSS tab says "Kept mounted, not display + @starting-style: that also plays on first paint." |
| E10 | Live region wording | Fixed | The `a11y` note says "put it in a `role="status"` region that is always mounted, so the announcement comes with the click, not after the enter". |
| E11 | Dark hairline | Kept (optional) | Not applied. In dark the toast is `lab(5.7)` on a frame of `lab(13)`, as in round 1. The brief marked it optional. It is still a nicety, not a blocker. |
| E12 | `demo.label` | Fixed | "Beside the frame, the two sets of numbers". |
| 13 | Placement in the setup line | Fixed | "Give this toast an enter and an exit. Bottom edge of its container, inset 16px." That is the product's spot; the demo's 12px inset belongs to a scaled frame, so no change. |

**Prompt.** Word counts: Quiet 226 / 226, Mirrored 223 / 223, None 197 / 197 (8 / 16px). All are ≤230. There are no blocked words and no em dashes. Tags and code are backticked. It stays terse.

**Note on E1.** A reduced-motion gesture in the demo computes `matrix(1, 0, 0, 1, 0, 0)` (`translateY(0px)`), not the keyword `none`. The acceptance line ("computed `transform` is `none`") is aimed at the agent's build, and both tabs produce `none` in every frame (measured). The demo's own e2e accepts either. No change.

### New findings

| # | Severity | Where | Before | After |
|---|---|---|---|---|
| N1 | Should fix | Acceptance, first line (`:450`) | "the toast's computed `transition-duration` is `0.2s` with `data-state="open"` and `0.15s` without". Since E4, `closed` computes `0s`: I measured it in the demo and in the CSS tab, and the e2e asserts `closed` is 0. So the reference fails its own checklist at Quiet and Mirrored. An agent that checks the line on a closed toast would remove the `0ms`, and the 4 → 16px drift comes back. | "`0.2s` with `data-state="open"`, `0.15s` (Mirrored `0.2s`) while `closing`, and `0s` once `closed`". For None it is already `0s` everywhere, so leave it. The acceptance list does not count toward the 230 words. |
| N2 | Nit | Prompt, CSS route | "Focus inside: `trigger.focus({ preventScroll: true })` before closing." sits only in the CSS route bullet. The Motion route unmounts, which drops focus the same way, and the acceptance line applies to both routes. The Motion tab has the comment, but an agent reading only the Motion bullet does not. | Move the sentence into the shared keyboard bullet ("First paint: …"). It costs no words. |
| N3 | Nit | CSS tab, Mirrored `.toast[data-state="closed"]` | Mirrored has `transition-duration: 0ms` with "In no time, so a show right after the exit starts from the full travel". With Mirrored the exit already ends at the full travel, so `closing` → `closed` changes nothing and the rule has no effect. The comment gives a reason that does not apply. | Drop the Mirrored rule, or reword the comment: "Same values as the exit's end; 0ms only so it matches the Quiet route." Optional. |

### Regressions

None. Every combination was checked against round 1:

- **Enter.** 0 / t → 0.34 / 0.66t at 17ms → 1 / 0 by 183 to 209ms, `0.2s`, `cubic-bezier(0.23, 1, 0.32, 1)`.
- **Quiet exit.** 0.56 / 1.74 → 0.27 / 2.91 → 0 / 4 by about 133ms, `0.15s`.
- **Mirrored exit.** 0.66 / 0.34t → 0 / t by about 183ms, `0.2s`.
- **None.** 1 / 0, then 0 / t hidden in the next frame.

Both tabs in the scratch page still match the demo frame for frame, and Motion runs the same durations. The other checks:

- **First paint.** The SSR HTML has `data-state="open"`. With reduced motion, the still frame shows `transform: none` and 0 animations. Both tabs paint open with `getAnimations()` empty.
- **Interruption.** A re-show 40ms into the exit turns back from 0.27 / 2.91 (Quiet). A Dismiss 60ms into the enter turns back from 0.78 / 3.6. Show while open snaps and plays a new toast.
- **Tab order when closed.** Tab from the trigger skips the hidden Dismiss, both in the demo and in the CSS tab.
- **Card on `/`.** It has 0 buttons and the labels sit above the frame. The loop is closing → closed in 166ms, then open about 433ms later. Under reduced motion the labels (y 327 to 342) clear Play (y 446 to 478). The glyph is active with 1 animation.
- **375px.** Overflow is 0 on the entry and the index, in light and dark.
- **Console errors.** None in light, dark, at 375px, with reduced motion, or in the scratch page.

Screenshots were refreshed: `review-enter-and-exit-{light,dark}.png`.

## Round 1: layer-3 craft review (batch-6, 4d8e904)

What I read: `src/terms/enter-and-exit.tsx`, `docs/house-rules.md`, the spec (§4 to §8), the batch-6 brief and report, `src/terms/duration.tsx` and `reviews/duration.md` (the reference), and the emil-animations patterns (Toast, Exit Animations, Don't Animate on Page Load, AnimatePresence Grouping).

What I drove: the review build on :3200 in Playwright Chromium at 1280px and 375px, in light, dark and reduced motion. I sampled the toast's computed `opacity`, `transform` and `visibility` every frame at all six combinations, on the entry page and on the card.

I also built both code tabs for all six combinations in a scratch page (esbuild, with React and Motion from the worktree) and measured them the same way. Headless ran at 60fps, so every time below is ±17ms.

**Verdict: fail.** The pair is right, and so is the mechanism. The enter is 16 or 8px over 200ms on `--ease-out` with a fade. The quiet exit is 4px over 150ms. The three-state `data-state` is sound and interruptible, and the closed toast leaves the tab order. Both code tabs reproduce the demo at every combination.

Three should-fixes block sign-off:

- Under reduced motion, Play shows fades only, so the lesson disappears.
- A keyboard Dismiss drops focus to `<body>`.
- The prompt promises Escape, which nothing implements.

### Measurements

Every combination from the click. Values are opacity / translateY in px.

| Combination | Enter | Exit | Closed |
|---|---|---|---|
| Quiet, 16 | 0 / 16 → 0.60 / 6.4 at 33ms → 1 / 0 by 183ms; `0.2s`, `cubic-bezier(0.23, 1, 0.32, 1)` | 0.56 / 1.7 at 17ms, 0.27 / 2.9 at 33ms, 0 / 4.0 at 133ms; `0.15s` | `visibility: hidden` at the end, then `closed` at 16px |
| Quiet, 8 | 0 / 8 → 1 / 0 by 183ms | Identical to Quiet, 16: 4px over 150ms | 8px |
| Mirrored, 16 | As Quiet | 0.66 / 5.4, 0.40 / 9.6, 0.23 / 12.4, 0 / 16 at 183ms; `0.2s` | 16px |
| Mirrored, 8 | As Quiet | 0.40 / 4.8 at 33ms, 0 / 8 at 183ms | 8px |
| None, 16 / 8 | As Quiet | 1 / 0, then 0 / 16 (or 8) hidden in the next frame; `0s` | Rests at `closing`, which equals `closed` |

The state machine and keyboard:

- **First paint.** The SSR still is `data-state="open"`, `opacity: 1`, `transform: none`, with no entrance. With reduced motion there are 0 animations at rest.
- **Re-show mid-exit.** It turns back from 0.27 / 2.9 and rises. It never jumps.
- **Dismiss mid-enter.** It turns back from 0.78 / 3.6 to 4px.
- **Show while open.** It snaps to 0 / 16, then enters.
- **Enter and Space.** Both play the same transitions as a click.
- **Tab order.** After the exit, Tab from Show toast skips the hidden Dismiss and goes to Replay.
- **Hit areas.** Show toast is 86×28 with a 44px-tall `::after`. Dismiss is 24×24 with a 44×44 `::after`.

Contrast and layout:

- **Labels.** `text-ink-muted` reads 6.26:1 in light and 7.41:1 in dark. The card is 10px and the entry 11px.
- **Card labels.** They sit above the frame and clear the reduced-motion Play button (button y 446 to 478, labels y 327 to 342).
- **375px.** 0 overflow on the entry and the index.
- **Console errors.** None in light, dark, at 375px or with reduced motion.
- **Glyph.** Active with 1 animation on its own page and on the index card being read. Inactive with 0 animations on /terms/duration.

The tabs in a scratch page:

- **CSS tab.** It matches the demo frame for frame at all six combinations (for example, Quiet 16 exits 0.56 / 1.75, then 0 / 4 by 164ms). The closed Dismiss is out of the tab order. Under reduced motion `transform` is `none` in every frame and the fade is unchanged.
- **Motion tab.** It runs the same timings, 200ms in and 150 or 200ms out, and unmounts after the exit. `initial={false}` paints open with 0 animations. A re-show 40ms into the exit turns back (0.27 / 2.9 → 1 / 0). Under reduced motion, `y` is 0 throughout.

Prompts: 222 / 222 / 219 / 219 / 197 / 197 words, re-dumped. There are no blocked words and no em dashes, and tags are backticked. Every source resolves with a 200.

### Findings

| # | Severity | Where | Before | After |
|---|---|---|---|---|
| E1 | Should fix | `enter-and-exit.tsx:60` `TOAST` (`motion-reduce:[--c:0px] motion-reduce:[--t:0px]`) | Under reduced motion, Play once zeroes the travel as well. I measured `y` at 0 on every frame of Play, with opacity fading 150 then 200. Quiet, Mirrored, 8px and 16px all look the same apart from 50ms. The spec says reduced-motion playback "still teaches the term". Duration, after review round 3 (H2), scoped this to the visitor's gesture so that "Play keeps its full cycle". | Scope the zeroing to the gesture: `motion-reduce:group-data-[taken-over=true]/stage:[--c:0px] motion-reduce:group-data-[taken-over=true]/stage:[--t:0px]`. In the e2e, assert travel during reduced-motion Play and `transform: none` on a gesture. The prompt and tabs stay as they are, since that is the shipped component. |
| E2 | Should fix | `dismiss()` `:134`; prompt; `a11y`; both tabs | Enter on the focused Dismiss hides the focused button, and `document.activeElement` becomes `<body>`. The next Tab happens to reach Replay, but a screen reader loses its place. Neither the prompt nor the tabs say what happens to focus. | Demo: if the toast contains `document.activeElement`, call `trigger.focus({ preventScroll: true })` before `setState('closing')`. Prompt, in the CSS route: "If focus is inside, move it to the trigger before closing." Add one acceptance line ("dismissed from the keyboard, focus lands on the trigger, not `body`"), the same comment line in both tabs, and one line in the `a11y` note. |
| E3 | Should fix | Prompt `:404` | It says "(Enter on the trigger, Escape or Enter on Dismiss)". The demo ignores Escape (state stays `open`), and so do both tabs, so an agent gets a key that the reference does not show. | Drop "Escape or", which also frees 2 words for E2. Or implement Escape on the focused toast in the demo and both tabs. |
| E4 | Nit | `TOAST` `:60`; CSS tab `.toast[data-state="closed"]`; prompt CSS route | `closing` → `closed` animates the hidden toast 4 → 16px over 150ms (211 to 344ms after the click). A re-show in that window starts short of the travel: I measured a start at 15.36px, and it can be as low as about 9px. | Give `closed` a `0ms` duration: `data-[state=closed]:duration-0` in the demo, `transition-duration: 0ms` in the tab, and "`closed` … at once" in the prompt. |
| E5 | Nit | Prompt CSS route | The prompt says "on its `transitionend`", but not that it must be the toast's own `opacity` event. The Dismiss `×` has a 150ms `transition-colors`, and its hover-out `transitionend` bubbles. An agent that doesn't check would set `closed` mid-fade and jump 4 → 16px. The demo checks `e.target` and `propertyName` (`:199`). | "on its own `opacity` `transitionend` (`event.target` is the toast)". |
| E6 | Nit | Dismiss button `:93` | `transition-colors` includes `outline-color`, and the site's accent-start rule excludes `[data-demo] *` (`globals.css:146`). So the keyboard ring fades in from `ink-muted` to the accent over about 100ms (sampled: oklab 0.48 → 0.56 → 0.62 → accent). Show toast's ring is the accent at once. | Use `transition-[color]`. |
| E7 | Nit | CSS tab `:290` | With Mirrored, the shared comment still reads "faded, nudged toward the bottom edge" above `translateY(16px)`. | Branch the comment for Mirrored: "the full travel back". |
| E8 | Nit | Acceptance, the `none` interruption line `:421` | "Shown again while entering, it continues from where it is" contradicts the demo, where Show while open snaps and plays a new toast. It also tests nothing about the exit. | "Dismissed while entering, it is gone in the next frame." |
| E9 | Nit | CSS tab header comment | The keep-mounted choice is stated ("It stays mounted"), but not why `@starting-style` was not used. The report gives the reason, and it is the lesson: `@starting-style` plays on first paint too. | Add one comment line: "Not `display` + `@starting-style`: that also plays on first paint." |
| E10 | Nit | `a11y` | "announce it with `role="status"` on the click, not when the animation ends" reads as if the role were added on click. With the kept-mounted route the live region must already exist. | "Put the toast in a `role="status"` region that is always mounted, so the announcement comes with the click, not after the enter." |
| E11 | Nit | Toast surface, dark | The toast (`bg-surface`, L 5.7) is darker than its frame (`bg-demo`, L 13), at 1.16:1 (light is 1.23:1, helped by the shadow). In dark it reads as a recessed slot, and mid-exit it is faint (see the slowed strip). Duration's dropdown and sheet share this treatment and were accepted. | Optional: in dark, add a hairline (`dark:ring-1 dark:ring-demo-2`) so the subject separates by lightness. |
| E12 | Nit | `demo.label` | "Under the frame, the two sets of numbers": on the card they sit above. | "Beside the frame". |

### Deviations from the brief

1. **No compare twin: agree.** At 112px two page frames would not read, and the Exit control is the comparison.
2. **No blur: agree.** The pair stays opacity + transform, and the prompt fits.
3. **Three-state keep-mounted, not `@starting-style`: agree; the reasoning is correct.** `@starting-style` applies on first style too, and the enter origin differs from the exit target. Transitioning `visibility` keeps the toast visible through the exit and takes it out of the tab order afterwards, which I measured. State the reason in the tab (E9).
4. **A fixed 4px at both travels: agree.** It matches the pattern ("a fixed few pixels, never the element's own height"). Note that at 8px the Quiet/Mirrored contrast shrinks to about 3px of visible travel (3.2 against 6.4px while opacity is at least 0.2) plus 50ms, so the lesson reads at the 16px default. No change.
5. **Two real buttons: agree.** They are the toast's own gestures. Show while open playing a new toast is a good touch.
6. **Icon Swap: not reviewed here.** Applies to 6, 7, 8, 10 and 12.
9. **Card labels above the frame: agree.** Verified clear of the Play button.
11. **No unit tests: agree.**

### Feel

- **The default pair works.** The enter arrives as a clear 16px rise (60% opaque at 33ms, so it answers at once). The quiet exit is gone almost before you look: 73% faded by 33ms, after under 3px of movement. Side by side, Mirrored reads heavier: the toast sinks about 10px while still visible and is clipped by the frame's bottom edge. That reads as "it fell out", and it carries the lesson without a verdict word. None reads as a cut, as it should.
- **The labels do the teaching.** The symmetric `enter 200ms, 16px` / `exit 200ms, 16px` under Mirrored names the mistake.
- **The card.** It reads at 308px. The labels above, the frame and the toast at the bottom edge make one clear picture, and the loop (exit, a 450ms beat, enter, a 900ms hold) is calm. The "Show toast" chip on the card looks pressable but is inert. That is acceptable, since cards never take input. An optional nicety would be to press it (`scale: 0.97`) at the enter step so cause and effect read.
- **The entry play-once** starts with the exit right after load. That matches Duration's cycle shape.
