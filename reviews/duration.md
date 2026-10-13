---
verdict: pass
reviewedAt: 2026-10-13
approved: true
approvedBy: Lucas Lima
approvedAt: 2026-10-13
---

# Review: duration

## Round 5: R4-1 fix (2151a68) and tooltip hover (359b772)

A scoped check before sign-off. I read `.superpowers/duration-hover.md`, `git show 2151a68`, `git show 359b772`, `src/terms/duration.tsx` and the spec. Then I drove the review build on :3200 in Playwright Chromium: a mouse at 1280px, CDP touch at 375px, both themes and reduced motion. For each hover I sampled the item's computed `opacity` and `transform` on every frame from the trigger's `pointerover`. Headless ran at 60fps, so the times are ±17ms. I also ran the Duration tests in `tests/e2e/batch-5.spec.ts` against :3200 with the scratch config (`.superpowers/playwright.3200.config.ts`, no server of its own): 25 passed, 7 skipped (the mouse-only or touch-only tests on the other project).

**Verdict: pass.** R4-1 is fixed. With a mouse the tooltip now plays the way a tooltip is used: the cursor lands, and it opens at that column's duration. 150 against 500 reads as a tooltip that answers at once against one that lags behind the cursor. Touch, dropdown and sheet behave as before, and nothing regressed. What's left is three nits and two notes. None blocks sign-off.

### R4-1 (fixed)

- **Reduced motion, hold, then switch Element.** I held the 500 dropdown and let go (`fff`, taken over), then picked Tooltip. 150ms later the stage read `ttt`, `aria-pressed` `t,t,t`, `data-taken-over=false`, and it still read the same at +1.6s.
- **The same after a hover.** I hovered the 500 tooltip, moved away, then picked Sheet: `ttt`, pressed `t,t,t`, `false`. Hovering again, moving away, and then toggling Exits with the mouse gave the same result. So did toggling Exits with the keyboard while the cursor was still on the trigger.
- The spec now asserts this in the reduced-motion test (`data-taken-over=false` and `aria-pressed=true` on all three after the switch).

### Hover: what the visitor gets (mouse, 1280px)

Opacity from the trigger's `pointerover`, in light mode. Dark mode reads the same within 0.002, and reduced motion gives the same opacity curve with `transform: none` on every frame.

| ms after the cursor lands | 150 | 300 | 500 |
|---|---|---|---|
| 16 | 0.44 | 0.23 | 0.14 |
| 33 | 0.73 | 0.44 | 0.28 |
| 50 | 0.88 | 0.60 | 0.40 |
| 83 | 0.98 | 0.82 | 0.60 |
| 133 | 1 | 0.95 | 0.80 |
| 200 | 1 | 0.99 | 0.93 |
| 50% / 90% / 99% / 100% | 17–33 / 67 / 100 / 133 | 50 / 116 / 199 / 250 | 67 / 184 / 317 / 400 |
| Close from `pointerout` to 0 (configured) | 100 (112.5) | 183 (225) | 299 (375) |

- **The handler adds no delay.** `begin` runs inside `pointerover`. On the first hover, the hovered item reads 0 about 2ms later (the snap), and every column has moved by the first frame (16ms). Whatever lag the visitor sees is the duration itself, measured from the cursor arriving.
- **Plain answer: yes.** Hover 150 and the tooltip is there as the cursor lands: 73% at 33ms and done by 133ms. Hover 500 and it visibly comes up after the cursor: half-toned at 67ms, still 80% at 133ms, landing at about 400ms. Moving between the two back to back reads as "this one answers, that one makes me wait", which is what the verdicts say. 300 sits between them: a bit soft, and an attentive visitor sees it.
- **The first hover takes over like a hold.** The hovered item snaps shut and opens in full, and the other two close at their exit durations (`tff`, `ftf` or `fft`). The cycle does not reopen them while the cursor stays.

### Hover: mechanics (all checked live)

- **Zone.** The `hit` `::after` is 56×44px on a 56×28 trigger. Scanning with `elementFromPoint` finds the trigger from y 314.6 to 358.6. The tooltip's bottom edge sits at 314.64, so the zone touches the body without overlapping it (0.02px). The three zones cover 168 of the stage's 608px width, on one 44px row.
- **Moving off.** Up onto the frame, down, sideways, or scrolling the page with the wheel without moving the mouse: each closes at the exit duration, and the hint returns to the resting line.
- **150 to 500 directly.**
  - A one-step jump: only 500 gets a `pointerover`. 150 closes, 500 opens (`fft`), and 300 stays at 0.
  - A 20-step glide along the row crosses the 300 zone. 300 flashes to 0.44 and closes, and 500 ends `fft`. A 60-step glide opens 300 fully on the way.
  - That is the cursor crossing 300's trigger, as it would on a real toolbar. Nothing was stuck in any run.
- **Quick in and out (500).**
  - I entered, left after 80ms, entered again after 60ms, and left after 100ms. Opacity went 0 → 0.60, then down to 0.10, then up to 0.81, then down to 0.
  - The change was never more than 0.3 in a frame. It reverses from where it is, with no snap. The other two stayed at 0.
  - The hint followed each move within a frame, and nothing stale was left at the end.
- **Quick in and out as the first gesture, during autoplay.** 300 snapped to 0 and peaked at 0.73, and 150 and 500 closed at their exits. 2.5s later the stage still rested `fff`, taken over.
- **Hover, then Replay.**
  - With the mouse: leaving the trigger closes 300, and the click hands the stage back (`false`, then `ttt`, `aria-pressed` `t,t,t`).
  - With the keyboard while still hovering: the gesture clears (resting hint), and the cycle opens all three. Moving off then does nothing. Coming back takes the stage over again.
- **Hover, then a control change.** Toggling Exits with the keyboard while hovering hands the stage back (`ttt`, `false`). Picking Dropdown hands it back too, and so does switching back to Tooltip.
- **Mouse press on the tooltip frame.** A 300ms press on a corner and a click on the opposite corner leave the stage `ttt` and untaken. Pressing on the trigger while hovering leaves `ftf` unchanged on down and on up.
- **Keyboard on the frame.** With the cursor away, Enter opens 300 (`ftf`, taken over) and Space closes it.
- **Cursor.** The tooltip frames and triggers read `default`. Dropdown and sheet frames read `pointer`.
- **Hint.** At 1280px (pointer fine) it reads "Hover a trigger to play it" at rest and "Move away to close it" while hovering. Dropdown and sheet read "Hold a frame to play it".

### Items 3–5

- **3. Touch: pass.** At 375px Chromium reports `pointer: coarse` and `hover: none`, and the tooltip hint reads "Hold a frame to play it". The only visible span is that one (`inline`), and the hover line is `none`.
  - A still hold on the 300 trigger gives `ftf`, and the hint reads "Let go to close it" (that span alone is `inline`, so the coarse rule does not beat the gesture rule). It opens on the hold curve (0.44 at 35ms, 1 at 302ms) and scrolls the page 0px.
  - A hold on the corner of the 500 frame gives `fft`. Release gives `fff`.
  - A 240px swipe from the frame scrolls 225px. Dropdown and sheet hold as before, with `cursor: pointer` and `touch-action: pan-y`. Light and dark match.
- **4. Regressions: none.** See below.
- **5. Craft.** I agree there should be no intent delay. A real tooltip waits about 500–700ms before showing, and here that would make 150 read as slow and teach delay in place of duration. The same goes for the "skip delay, no animation on the next tooltip" convention, because the demo exists to show that animation. Accidental triggers are rare and cheap. The zones are 3.4% of the stage's area. The routes a cursor takes between the rail, the text and the controls under the stage do not cross that row. A diagonal from the theme toggle to the Element control passes about 1px left of the 500 zone. When one is crossed, the first autoplay ends and the stage rests closed, with a hint that names the gesture. Replay restores it.

### Findings

| # | Severity | Where | Issue | Fix |
|---|---|---|---|---|
| R5-1 | Nit | `demo.label` | "…and on hold on touch" stacks two "on"s, and the parenthesis "(onto its trigger to open, away to close)" breaks the register. Spring's and the rest of this label are plain declarative sentences with no parentheses. | End the gesture sentence after "exit duration.", then add: "With a mouse, the tooltip opens when the pointer moves onto its trigger and closes when it moves away; on touch it is held like the others." |
| R5-2 | Nit | `onPointerOut`, tooltip item | Moving the cursor up from the trigger onto the tooltip closes it, because the zone ends at the tooltip's edge. Real tooltips stay open while the pointer is over them (WCAG 1.4.13 "hoverable", Radix's default). A visitor who reaches for the tooltip they are watching will see it close at the exit duration. That is still honest, but it is not how a tooltip behaves. | Optional: when `pointerout` leaves the trigger for its own item (`e.relatedTarget` inside the same frame's `[data-duration-item]`), keep the gesture, and end it on the item's `pointerout`. |
| R5-3 | Nit | hint | Gliding along the trigger row flips the hint between "Move away to close it" (21 characters) and "Hover a trigger to play it" (26) at each gap, and the centred line reflows each time. It is correct, but a little busy. | Leave it, or give the hint a fixed width (`min-w-[26ch]`), so only the words change. |
| R5-4 | Note | `onClick` | While the cursor rests on a trigger, Enter or Space on another frame does nothing (`gesture.current` is set). This needs a mouse and a keyboard at once. | None needed. |
| R5-5 | Note | R4-2 (carried) | A swipe at 375 still takes the stage over and leaves it closed. That was accepted in round 4. | None needed. |

### Regressions (none)

- **Computed durations**, open / closed at all 6 combinations. Tooltip, Dropdown and Sheet with exits on: `0.15/0.1125`, `0.3/0.225`, `0.5/0.375`. With exits off, open and closed are equal. Curves: `cubic-bezier(0.23, …)` on tooltip and dropdown, `cubic-bezier(0.32, …)` on sheet.
- **Verdicts.** Tooltip and dropdown: right / slow / too slow. Sheet: abrupt / right / too slow. Labels read "150ms tooltip", and so on.
- **Prompt, acceptance and code tabs.** `git diff bfce9b7 359b772 -- src/terms/duration.tsx` has hunks only at line 1 (imports), lines 54–363 (the demo) and line 560 (`demo.label`). Nothing changed from line 364 on, where `cssCode`, `motionCode`, `prompt`, `acceptance` and `code` live, so those tabs are byte-identical.
- **Card on `/`.** It has 0 buttons, 3 `DIV` frames, no hint and no `hit`, and it loops `ttt` ↔ `fff` in both themes.
- **Hint.** It sits 24px under the verdicts (Spring: 24px), in 11px mono. There are 0 `div`s inside the buttons.
- **375px.** scrollWidth 375 = clientWidth 375 on Tooltip, Dropdown and Sheet, in both themes.
- **Console errors.** None in light, dark, at 375px or with reduced motion.

## Round 4: round-3 fixes (2fdacf6)

A scoped re-check of the seven fixes in `.superpowers/duration-interactive-fixes.md`. I read `git show 2fdacf6`, `src/terms/duration.tsx` and the spec, then drove the review build on :3200 in Playwright Chromium: a mouse at 1280px, CDP touch at 375px, both themes and reduced motion. For each hold I sampled the item's computed `opacity` and `transform` on every frame from `pointerdown`. This time headless ran at 60fps, so the times are ±17ms. I did not run the e2e suite, because it starts its own server.

**Verdict: fail.** The gate passes. The tooltip's whole body now fades, and a visitor holding 150 and then 500 will see the difference. Fixes 2 to 7 are all in and correct. One should-fix is left, and it was already there in ea69312: under reduced motion, a hold followed by an Element switch leaves the stage stuck, with `aria-pressed` reporting the wrong state (R4-1). The fix is about three lines. The prompt, acceptance list and code tabs do not change.

### The tooltip now

Measured contrast of the body on its frame, with colours resolved through a canvas:

| Theme | Body | Frame | Body on frame | Bar on body | Round 3 |
|---|---|---|---|---|---|
| Light | #717171 | #e8e8e8 | **3.98:1** | 4.88:1 (#fff) | 1.23:1 |
| Dark | #a4a4a4 | #222222 | **6.38:1** | 7.45:1 (#131313) | 1.17:1 |

The tooltip is 70×31px on the entry page (it was 68×28). The card on `/` always shows the dropdown, so this change never reaches the index.

Holding the tooltip with a mouse at 1280px in light mode. The cells show opacity, with the body's contrast on the frame at that moment in brackets. Touch at 375px and dark mode run the same curve within a frame.

| ms after press | 150 | 300 | 500 |
|---|---|---|---|
| 48 | 0.73 (2.56) | 0.44 (1.69) | 0.28 (1.38) |
| 82 | 0.95 (3.64) | 0.73 (2.56) | 0.51 (1.86) |
| 133 | 1.00 (3.98) | 0.92 (3.47) | 0.75 (2.64) |
| 199 | 1 | 0.99 | 0.90 (3.39) |
| 90% / 99% / 100% | 81 / 114 / 148 | 133 / 215 / 282 | 199 / 332 / 449 |
| Close to 0 (configured) | 101 (112.5) | 191 (225) | 300 (375) |

- **The timing is unchanged.** The curves match round 3, so only the visible amplitude has changed. The body now swings across 119 grey levels in light (#e8e8e8 to #717171) and 130 in dark. Before, it swung across 23 in light, so the same opacity gap now shows about 5× the difference in light and about 10× in dark.
- **150 against 500.** Yes, a visitor will feel this now. At 82ms the 150 is almost at its final grey (#777) while the 500 is still half-toned (#acacac). At 133ms the 500 is still visibly lighter than it ends up (2.64:1 against 3.98:1). The 500 visibly develops over about 200ms, and the 150 lands at once.
- **150 against 300.** Held back to back, an attentive visitor sees 300 as a bit softer: 73% against 44% at 48ms, and 90% at 81ms against 133ms. A casual visitor may not notice. That is honest to the numbers: the verdict calls 300 "slow", not "too slow". With autoplay, the three open side by side, and the order is now plain to see on the tooltip too.
- **Is 3.98:1 acceptable?** Yes. WCAG 1.4.11 asks 3:1 for non-text graphics that carry meaning, and a decorative wireframe shape is not strictly in scope. 3.98 clears that bar with room to spare. The fix list asked for at least 4:1, and missing it by 0.02 makes no visible difference.
- **Taste.** In light mode the body is a mid grey, not a dark one, and it reads as a tooltip. It is the one filled shape on the stage, it sits over the white trigger, and it carries a white label bar. In dark mode it is inverted: a light grey body with a near-black bar. That is the usual dark-mode tooltip, and it is the brightest thing on the stage, which suits the subject. It does not break the palette. The premise that nothing else uses a filled body this large does not hold. Parallax fills two 256×120 blocks with `bg-demo-subject`, and Scroll-linked fills its h-80 figure. Both are far larger than this 70×31 tooltip, and both read the same way in dark. The tooltip is the only overlay here filled with the subject tone, while the dropdown and sheet stay `bg-surface`. That is the right distinction, because tooltips are the overlay that is conventionally inverted. No change needed.

### Items 2–7

- **2. Reduced motion: pass.** A held tooltip, dropdown or sheet reads `transform: none` on every frame of the open and the close, at 1280 and at 375. Opacity fades over the duration: the 500 sheet is at 0.53 at 87ms and reaches 1 at 488ms, then closes to 0 by 370ms. Play still runs the full cycle with the slide: 55 distinct `translateY` values on the 500 sheet, and `data-taken-over` stays unset.
- **3. Touch: pass.** `touch-action: pan-y`. A 240px upward swipe from the 300 frame scrolled the page 225px. `pointercancel` fired 32ms after `pointerdown`, and the element closed. A still hold opens only that column (`f,f,t`), scrolls 0px and closes on release. See R4-2 for a side effect.
- **4. Hint spacing: pass.** The hint sits 24px under the verdict row, the same as Spring's 24px.
- **5. Hint copy: pass.** It reads "Hold a frame to play it", and "Let go to close it" while held.
- **6. Labels: pass.** The buttons read "150ms dropdown, toggle button, pressed". The name follows the Element control, and the group label carries the gesture.
- **7. Markup: pass.** There are 0 `div`s inside the buttons, and every descendant of a frame is a `span`.

### Findings

| # | Severity | Where | Issue | Fix |
|---|---|---|---|---|
| R4-1 | Should fix (present since ea69312, missed in round 3) | `duration.tsx:235` `still()` | With reduced motion on, the visitor holds a frame and then switches Element. The cycle never runs, and `still()` returns early because `taken` is true. So `data-taken-over` stays `true`, and React renders the new items open (`t,t,t`). The buttons keep the `aria-pressed="false"` that was set by hand, so a screen reader hears "not pressed" on three open elements. A hold on 150 then shows nothing, because it is already open. Releasing closes 150, and 300 and 500 stay open for good. Without reduced motion, the step at 0 in the new cycle resets all of this. | In `still()`, mirror the guard from step 0: `if (taken.current && takenIn.current === cycleKey) return; setTaken(false); snap(root, () => setAll(true))`. Pausing keeps the same key, so the visitor stays in charge. Test: with reduced motion, hold, switch Element, then expect `aria-pressed` `true` ×3 and `data-taken-over=false`. |
| R4-2 | Nit | `onPointerDown` and `pointercancel` | A scroll that starts on a frame at 375 now works, but it also takes over the stage. The autoplay ends, the swiped element snaps shut, and the other two close. Someone scrolling past with their thumb on the stage leaves it empty. At `pointerdown` you cannot tell a hold from a scroll, and delaying the open would distort the timing being taught. | Leave it, or, when the hold that took the stage over ends in `pointercancel`, hand the stage back (`setTaken(false)` and snap all three open). |

### Regressions (none)

- **Computed durations**, open / closed at all 6 combinations. Tooltip, Dropdown and Sheet with exits 0.75: `0.15/0.1125`, `0.3/0.225`, `0.5/0.375`. With exits off, open and closed are equal.
- **Curves**: `cubic-bezier(0.23, …)` on tooltip and dropdown, and `cubic-bezier(0.32, …)` on sheet.
- **Verdicts**: tooltip and dropdown right / slow / too slow; sheet abrupt / right / too slow.
- **Prompt, acceptance and code tabs**: `git diff bfce9b7 2fdacf6 -- src/terms/duration.tsx` has hunks only at the imports (line 1), the demo (lines 51–313) and `demo.label`. No changed line touches the prompt, acceptance or code text, so those tabs are byte-identical.
- **Card on `/`**: 0 buttons, 3 `DIV` frames and no hint. It loops `ttt` ↔ `fff` in both themes.
- **375px**: scrollWidth 375 = clientWidth 375 on Tooltip, Dropdown and Sheet.
- **Console errors**: none in light, dark, at 375px or with reduced motion.

## Round 3: hold gesture (ea69312)

A scoped review of one change: on the entry page, each column's frame is now a hold target. I read `.superpowers/duration-interactive.md`, the `git show ea69312` diff, `src/terms/spring.tsx` (the pattern it copies) and `docs/house-rules.md`. I then drove the live review build on :3200 in Playwright Chromium: a mouse at 1280px, CDP touch at 375px, both themes and reduced motion. For each press I sampled the item's computed `opacity` and `transform` on every frame from `pointerdown`. Headless runs at about 30fps, so the times below are ±33ms.

**Verdict: fail.** The gesture works and has no regressions. It answers Lucas only for the dropdown and the sheet. On the tooltip, which is what he asked about, the difference is still too faint to feel. Two more issues need fixing: under reduced motion a hold still moves the element, and the frames block page scrolling on touch. All three fixes are small. The prompt, acceptance list and code tabs do not change.

### Does it answer Lucas's point

Tooltip, hold and release with a mouse (touch at 375px reads the same within 10ms). Each value is the time from `pointerdown` until opacity reached that level:

| Column | 50% | 90% | 99% | 100% | Scale settles | Close to 0 (configured) |
|---|---|---|---|---|---|---|
| 150ms | 50 | 83 | 117 | 167 | 100 | 134 (112.5) |
| 300ms | 65 | 132 | 215 | 299 | 182 | 233 (225) |
| 500ms | 83 | 199 | 349 | 482 | 282 | 367 (375) |

- **The timing is right.** Each item runs at its own `--d`. The first hold snaps the pressed item shut and opens it from 0, so it is seen in full. The other two close at `--x`. The release at 0.75× is honest: the close times above match the configured ones within one frame.
- **There is no lag behind the press.** All three start moving on the first frame: at about 33ms the 500ms tooltip is at 14% opacity and the 150ms one at 43%. `--ease-out` front-loads the move, so 500ms never reads as late. It reads as a longer tail: 90% opacity at 83ms for 150 against 199ms for 500.
- **The tail is nearly invisible on the tooltip.** The scale change is 0.97 × 68×28px, which is 2.0×0.8px of movement, so opacity is the only cue the eye gets. The tooltip body against its frame is **1.23:1 in light** (#fff on #e8e8e8) and **1.17:1 in dark**. The only thing that visibly fades in is the 48×6px `bg-demo-subject` bar inside it.
- **Plain answer.** On the dropdown (a 0.95 scale on a large panel) and the sheet (166px of travel), a visitor now feels the difference. On the tooltip, 500 reads as a bit softer than 150. 150 and 300 still look the same (90% at 83ms against 132ms). Lucas would most likely still say the tooltip looks the same.
- **What to change.** Don't add travel. Four pixels on this curve would leave about 1.6px still to cover at 100ms on the 500ms column, and almost nothing on the 150ms one. It would also show a motion that the prompt and code tabs don't ship (scale 0.97 + opacity, from the trigger). Raise the contrast of what fades instead. Make the demo tooltip inverted, as real tooltips usually are: body `bg-demo-subject` (about 4:1 on `bg-demo` in light, about 6:1 in dark), with a `bg-demo` or `bg-surface` bar inside. Optionally make it a size bigger on detail (`h-8 px-3`). The house recipe stays as it is. The whole body then carries the fade, with at least 3× the visible difference from its final state at every point of the tail (far more in dark).

### Findings

| # | Severity | Where | Issue | Fix |
|---|---|---|---|---|
| H1 | Gate (the brief's purpose) | `duration.tsx:72` (tooltip item) | The tooltip still reads alike at 150, 300 and 500 when held: the body is 1.23:1 (light) and 1.17:1 (dark) on the frame, and the scale moves it 2×0.8px. See above. | Make the tooltip inverted: `bg-demo-subject` body, `bg-demo` or `bg-surface` bar, optionally `h-8 px-3` on detail. Re-measure, and have Lucas hold 150 then 500. |
| H2 | Should fix | `duration.tsx:243` (comment), `:60` `ITEM`; spec "with reduced motion…" | Under reduced motion a hold does not fade. With Sheet held at 500ms, `transform` went `translateY(166px)` → 121 → 57 → 25 → 0 over 500ms with opacity at 1 the whole time. Tooltip and dropdown keep their scale. This contradicts the brief, the code comment, the test title, and the term's own a11y text and prompt ("no slide, `opacity` only"). Spring's hold jumps under reduced motion (`spring.tsx:293`). The test only checks the dropdown's opacity, so it passes. | Limit it to the visitor's gesture so that Play keeps the full cycle. In `ITEM`, add `motion-reduce:group-data-[taken-over=true]/stage:[transform:none]`. On the sheet, add `motion-reduce:group-data-[taken-over=true]/stage:opacity-0 motion-reduce:group-data-[taken-over=true]/stage:data-[open=true]:opacity-100`. In the reduced-motion test, assert `transform: none` on a held sheet. |
| H3 | Should fix | `duration.tsx:149` `touch-none` | At 375px the three frames are 88×160px each and cover 45% of the stage. A vertical swipe that starts on a frame scrolled the page **0px**. The same swipe from the stage gutter scrolled **235px**. Spring's `touch-none` is on a 72×48 card, not most of a stage. | Use `touch-pan-y` in place of `touch-none`. A still hold opens as before. A vertical swipe scrolls and fires `pointercancel`, which `onRelease` already handles by closing the element. Keep `select-none`, the callout rule and the `contextmenu` guard. Add a mobile test: a swipe from a frame scrolls. |
| H4 | Nit | `duration.tsx:301` hint | The hint sits 12px under the verdict row, in the same 11px mono `ink-muted`, so it reads as a fourth verdict line. Spring's hint is 24px under its track (`gap-6`). Font, size and colour already match Spring: Geist Mono 11px, lab(39.68) light and lab(65.2) dark. | Add `mt-3` to the hint (24px total). |
| H5 | Nit | `duration.tsx:54` `HINT` | Before the first gesture, all three elements rest open, and the hint asks the visitor to open one. It works, because the press snaps it shut first, and after the first gesture the stage rests closed. | Leave it, or use "Hold a frame to play it". |
| H6 | Nit | `duration.tsx:143` `aria-label` | "Open the 150ms tooltip" on a toggle that rests pressed is read as "Open the 150ms tooltip, toggle button, pressed". The verb disagrees with the state. | Name the thing: "150ms tooltip". `aria-pressed` carries open or closed, and the group label (`demo.label`) carries the gesture. Update the spec selectors to match. |
| H7 | Nit | `Element` inside `<button>` | The frames are buttons that contain `<div>`s. Buttons only allow phrasing content. There is no console warning and it renders fine. | Optional: render the inner wrappers as `<span class="block …">` on detail. |
| H8 | Note | `takeOver` / step 0 race | A hold that lands within about one frame of a Replay click is lost. At 15ms the new cycle's step 0 saw the older `takenIn` key, took the stage back and opened all three, and the release did nothing. At 31ms or more it is fine. A person cannot reach this, and Spring has the same pattern. | None needed. |
| H9 | Note | Control change mid-hold | This is only reachable with the keyboard or a second pointer. The cycle takes the stage back while the pointer is still down: the held element closes, the hint flips back, all three open, and the release does nothing. This matches the documented hand-back. | None needed. |

### Gesture and a11y (all checked live)

- **Hold one column.**
  - Held during the first autoplay's closed beat: `ftf`, `data-taken-over=true`, and the hint reads "Let go to close it".
  - At +1500ms, past `openAt`, it was still `ftf`: the cycle did not open the other two.
  - On release, `fff`, and the stage rests as the visitor left it.
- **Pointer, keyboard and Replay.**
  - Moving the pointer 400px outside the frame and releasing there closes the element (capture).
  - `touchcancel` closes it and resets the hint.
  - Two quick taps, then a tap on 150 followed by a hold on 500, retargeted with nothing stuck.
  - A right-click does nothing.
  - Replay after a hold sets `taken-over=false` within 50ms and opens all three again.
- **Selection and context menu.** No text selection after a 1.2s touch hold or a mouse drag. `contextmenu` is prevented while held.
- **Keyboard.**
  - Tab order: rail → 150 → 300 → 500 → Replay → Element.
  - Enter opens only that column (`false,true,false`) and animates. Space closes it.
  - `aria-pressed` follows autoplay: `false,false,false` in the closed beat and `true,true,true` after.
- **Focus ring.** `2px solid` accent with a 2px offset in both themes, and it follows the 8px radius.
- **Pointer feel.**
  - Cursor `pointer`.
  - Hit areas are 171×208 at 1280px and 88×160 at 375px.
  - The frames have no pressed look, which is right: the opening element is the feedback, and a press scale on the frame would muddy the timing read.
- **Reduced motion.**
  - Still frame and Play button unchanged.
  - Play still runs one full cycle, then rests with `aria-pressed` `true,true,true`.
  - A hold animates over its duration, but with movement (H2).

### Regressions (none)

- **Computed durations**, open / closed with exits 0.75 on, at all 3 elements: `0.15s/0.1125s`, `0.3s/0.225s`, `0.5s/0.375s`. With exits off, open and closed are equal.
- **Curves**: `cubic-bezier(0.23, 1, 0.32, 1)` on tooltip and dropdown, `cubic-bezier(0.32, 0.72, 0, 1)` on sheet.
- **Verdicts**: tooltip and dropdown right / slow / too slow; sheet abrupt / right / too slow.
- **Prompt, acceptance and code tabs**: the diff touches only `demo.label` past line 300, so they are byte-identical.
- **Card on `/`**: 0 buttons, 3 `div` frames, no hint. It still loops (`ttt` ↔ `fff`) in both themes.
- **375px**: scrollWidth 375 = clientWidth 375 on Tooltip, Dropdown and Sheet.
- **Console errors**: none (light, dark, 375px, reduced motion).
- **`demo.label`**: the new sentence copies Spring's register ("On the entry page, holding … and letting go …"). It is plain and has no blocked words.

## Round 2 (e95e7cb)

A scoped re-review of the fix round. I checked items 1 to 14 of `.superpowers/batch-5-fixes.md` against the `git show e95e7cb` diff, `src/terms/duration.tsx`, `docs/house-rules.md` and the live review build on :3200 (Playwright Chromium).

What I checked live:

- Contrast in light and dark. I read computed colours, composited them on the nearest opaque ancestor and computed WCAG ratios. I also pixel-sampled 2× element screenshots of each verdict label, on the entry demo (11px) and the `/` card (10px).
- All 6 combinations (Tooltip / Dropdown / Sheet × exits on/off):
  - computed `transition-duration`, `-timing-function` and `-property` per column, open and closed;
  - `data-verdict`;
  - the prompt, acceptance list, CSS tab and Motion tab as rendered. I checked word counts, em dashes, blocked words, bare tags and "because/why/so that".
- Entry timeline frame by frame, the card loop, reduced motion, 375px overflow and console errors (light, dark, 375 and reduced motion).

**Verdict: pass.** The gate is fixed. Off-range verdicts now measure 6.31:1 in light and 7.39:1 in dark at 10 to 11px, by both computed colour and pixels. Items 2 to 14 all landed and nothing regressed. The new findings below are three wording nits; none blocks.

### Findings

| # | Severity | Finding (round 1 / fix list) | Status | Evidence |
|---|---|---|---|---|
| 1 | Gate | Off-range verdicts on `text-ink-faint` (2.98:1) | **Fixed** | `:136` is now `text-ink-muted`. Light: `slow`, `too slow` and `abrupt` are rgb(93,93,93) on rgb(250,250,250), **6.31:1** (computed and pixel-sampled, detail 11px and card 10px). Dark: rgb(158,158,158) on rgb(10,10,10), **7.39:1**. `right` is 17.18 (light) and 17.06 (dark). |
| 2 | Should fix | Press timed on `ease` | **Fixed** | Prompt: "hover and color 100 to 150ms (`--duration-1`, `ease`); press `--duration-1` on `--ease-out`". CSS tab `.button`: `transition-property: background-color, scale` lines up with `transition-timing-function: ease, var(--ease-out)`. `--ease-out` is declared in `:root` at all 6 combinations, plus `--ease-drawer` on sheet. |
| 3 | Should fix | No backdrop timing on sheet | **Fixed** | "Backdrop, if any: `opacity` on the same open and close durations and curve." Acceptance: "...300ms open, 225ms close" (on) or "300ms open, 300ms close" (off). Both appear on sheet only, not on tooltip or dropdown. |
| 4 | Prompt test | `--ease-out` undefined in Tokens | **Fixed** | The Tokens line ends `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`. The tooltip and dropdown element lines say `var(--ease-out)` with no repeated bezier. The sheet line keeps `var(--ease-drawer)` (`cubic-bezier(0.32, 0.72, 0, 1)`). |
| 5 | Prompt test | Opener presumed an existing UI | **Fixed** | "Time this {tooltip, dropdown, sheet}." The by-kind table is introduced as "By kind, for reference across the UI:". |
| 6 | Prompt test | Exit ratio read as covering hover and press | **Fixed** | "Exits of overlays (menus, tooltips, dialogs, sheets, toasts): enter × 0.75 ..." (or "same as the enter" when off). Both end "Hover and press are symmetric." |
| 7 | Prompt test | Acceptance measured frames | **Fixed** | "CSS route: ... computed `transition-duration` is `0.2s` with `[data-open]` and `0.15s` without. Motion route: the `transition` durations are 0.2 in and 0.15 out." The ±1 frame wording is gone. "The close is configured at no more than 75%...". |
| 8 | Prompt test | Motion `exit` lacked its own transition | **Fixed** | `exit={{ …, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }}` and "`useReducedMotion()` drops the scale/slide". The Motion tab matches (`exit={{ ...hidden, transition: {...} }}`). |
| 9 | Prompt test / Nit | Keyboard rule caught an Enter-opened dropdown; arrow-key acceptance on tooltip and sheet | **Fixed** | "Changes driven by the keyboard inside a component (arrow-key highlight, shortcut toggles): no animation." "Arrow-key highlight inside the menu: instant." appears on dropdown only. Acceptance: arrow-key wording on dropdown, "Changes made from the keyboard inside the component..." on tooltip and sheet. |
| 10 | Nit | Timing-function check unlabelled | **Fixed** | "...`cubic-bezier(...)` (CSS route)." |
| 11 | Nit | Card gutter `px-1` | **Fixed** | Card stage is `px-3`. Measured: 12px left and right, 10px between columns, stage 284px. |
| 12 | Nit | "more than the curve does"; frequency only in `avoidWhen` | **Fixed** | Both done. See N2 and N3 for two wording leftovers. |
| 13 | Nit | `enter-and-exit` missing from related | **Fixed** | `related: ['ease-out', 'ease-in-out', 'enter-and-exit', 'spring', 'stagger']`. It resolves to `src/terms/enter-and-exit.tsx` (draft) and renders as "Enter and Exit Soon" with its definition and no link, the same as the other draft references. |
| 14 | Doc | House rules lacked a page-level row and a drawer exit exception | **Fixed** | Added "Page-level transitions 300–400ms: the only place UI goes past 300ms." and "Product UI stays at or under 300ms." Enter and exit now says "Exception: drawers and sheets slide fully off on `--ease-drawer`, matching their enter." These match useWhen, the prompt ("Only page-level transitions pass 300ms, 400ms at most") and the sheet's 0.75× full slide. |
| r1 | Nit (optional) | Dark: `bg-surface` element on `bg-demo` frame reads recessed | Open, not blocking | Not in the fix list. Leave it for the site-wide pass, as noted in round 1. |
| N1 | Nit (new) | `avoidWhen[4]` still says "Actions used 100+ times a day, or triggered from the keyboard." The house-rules row (Should it animate?) still says "Used 100+ times a day, or triggered from the keyboard: no animation." Both now disagree with the scoped prompt and a11y text (item 9): a dropdown opened with Enter does animate. | Open | avoidWhen: "Actions used 100+ times a day, or changes driven by the keyboard inside a component (arrow-key highlight). Give them no animation at all, not a shorter one." Scope the house-rules row the same way so the next term inherits it. |
| N2 | Nit (new) | Description: "Product UI stays under 300ms." The house rule now says "at or under 300ms", and the sheet ships at exactly 300ms. | Open | "Product UI stays at or under 300ms." |
| N3 | Nit (new) | Description: the frequency clause hangs off the "so" chain ("...wrong for the next, and something used 100+ times a day gets none"). It reads as a consequence of size, and "none" is ambiguous. | Open | End that sentence at "wrong for the next." Then add: "Something used 100+ times a day gets no animation at all." |

### Regression check (all clean)

- **Computed durations**, per column, 150 / 300 / 500:
  - Open: `0.15s / 0.3s / 0.5s` at all 6 combinations.
  - Closed, exits on: `0.1125s / 0.225s / 0.375s`.
  - Closed, exits off: equal to open.
  - Curve: `cubic-bezier(0.23, 1, 0.32, 1)` on tooltip and dropdown, `cubic-bezier(0.32, 0.72, 0, 1)` on sheet.
- **Verdicts**: tooltip right / slow / too slow; dropdown right / slow / too slow; sheet abrupt / right / too slow.
- **Entry page**: one cycle, then it rests.
  - At 0ms all three close; animations reach 0 at 377ms (the 375ms exit).
  - At 777ms all three open (375 + 400 beat); animations reach 0 at 1294ms.
  - It rests open with 0 animations through 6s. Replay is present.
- **Card on `/`**: loops (open, close, open), with labels at 10px measured as above.
- **Reduced motion**: still frame, all open, 0 animations, a "Play Duration demo" button. One cycle plays on request, then it returns to rest with 0 animations.
- **375px**: scrollWidth 375 = clientWidth 375, before and after switching to Tooltip and Sheet.
- **Console errors**: none (light, dark, 375, reduced motion).
- **Prompt**:
  - Words: tooltip 207 / 210, dropdown 214 / 217, sheet 221 / 224 (on / off). All ≤230.
  - No em dashes in the prompt, acceptance, CSS or Motion at any combination.
  - No blocked words, no bare tags, no "because/why/so that" in the prompt.

### Feel notes

There are no visual changes beyond the label colour and the card gutter. The verdict row still reads calm: `right` in ink, the rest muted, with the emphasis carried by ink against muted, the same as the ms row. On the card, the 12px gutter now matches the inter-column rhythm, and the outer frames no longer crowd the edge.


## Round 1 (2c938e6)

This is the layer 3 craft review of `src/terms/duration.tsx` at 2c938e6. I did not write the entry.

What I checked:

- The live review build on :3200 in Playwright Chromium, at all 6 combinations (Tooltip / Dropdown / Sheet × exits 0.75 on/off):
  - computed `transition-duration`, `-property` and `-timing-function` per column, open and closed;
  - per-frame last-change times for the open and the close;
  - a reversal 120ms into the open;
  - the `getAnimations()` types.
- Also on the live build:
  - light and dark at 1280, plus 375 (no horizontal overflow);
  - reduced motion;
  - the `/` card loop, plus a 3× zoom of the card labels;
  - glyph active and inactive;
  - label contrast measured from computed colors.
- The generator swept at all 6 combinations: prompt, acceptance and both code tabs. I checked word counts, em dashes, blocked words, untagged HTML, `ease-in` and `transition: all`, and checked aliases against all 47 terms.
- Both sources fetched.

**Verdict: fail.** One gate: the verdict words that carry the lesson are under AA contrast. The fix is one class. The lesson, the timing, the exits and the code are right. Two should-fix items are one line each.

### Findings

| Severity | Where | Before | After |
|---|---|---|---|
| Gate | `:136` verdict label | Off-range verdicts (`abrupt`, `slow`, `too slow`) use `text-ink-faint`. That is rgb(146,146,146) on canvas rgb(250,250,250), **2.98:1** in light and 3.61:1 in dark, at 10–11px. These words are the lesson. No other demo uses `ink-faint` for labels; ease-out, ease-in-out, spring, stagger and overshoot all use `text-ink-muted`. | `text-ink-muted` for the off-range verdicts (6.31:1 light, 7.39:1 dark, as the ms labels at `:132` measure already) and `text-ink` for `right`. The emphasis still reads through ink against muted, the same as the ms row. |
| Should fix | prompt `:387`, CSS tab `:265–268` | Press is timed on `ease`: "hover, press and color … (`--duration-1`, `ease`)", and `.button` puts `ease` on both `background-color` and `scale`. House rules (Press and hover) and emil-animations: press is `scale: 0.97` over 150ms on `--ease-out`. | Prompt: "hover and color 100 to 150ms (`--duration-1`, `ease`); press `--duration-1` on `--ease-out`". CSS: `transition-timing-function: ease, var(--ease-out);` (and declare `--ease-out` in `:root` for the sheet variant too). |
| Should fix | prompt / acceptance, sheet | Nothing says how long the backdrop takes. patterns.md Drawer: "Backdrop fades with the same timing". SKILL.md: paired elements share duration and easing. On a duration term, a scrim left on a library default is exactly the inherited-duration mistake that `avoidWhen` names. | Sheet only, one bullet: "- Backdrop, if any: `opacity` 0 to 1 on the same open and close durations and curve." Add a matching acceptance line. |
| Nit | acceptance `:411` | "Changes made from the keyboard, like moving a highlight with the arrow keys…" appears for tooltip and sheet, where the prompt asks for no such highlight. | Keep the arrow-key wording for dropdown only. For the others: "Changes made from the keyboard show in the next frame with no transition." |
| Nit | acceptance `:408` | The computed `transition-timing-function` check is CSS-only but unlabelled. `:404` labels its route. | Append "(CSS route)". |
| Nit | card `:173` | On the card the stage has `px-1` (4px gutter) against `gap-2.5` (10px) between columns, so the outer frames almost touch the stage edge (measured left 4.0px). | `px-3` on the card, or match the gutter to the gap. |
| Nit | demo, dark | The `bg-surface` element (rgb 19) sits on a `bg-demo` frame (rgb 34), so in dark it reads recessed rather than raised (1.17:1, edged only by the card ring). Spring's chip on its track does the same and was approved, so this is not blocking. | Optional: frames on `bg-canvas` with a hairline in dark, or leave it for a site-wide pass. |
| Nit | description `:360` | "shapes how an interface feels more than the curve does" is an unsourced comparative. The ease-out entry argues the opposite emphasis (the curve makes 200ms feel quick). | "and it shapes how an interface feels: a 180ms dropdown…" |
| Nit | description | Frequency → no animation sits only in `avoidWhen` and the prompt. | Optional half-sentence at the end: "and something used 100+ times a day gets none." |
| Nit | `related` `:417` | `['ease-out','ease-in-out','spring','stagger']` | Add `enter-and-exit` (the 0.75× exit is its rule). Ease-out already links that draft. |
| Doc | `docs/house-rules.md` | The house has no page-level row (the entry ships 300–400ms, from Emil's table). "no full-height slides" (Enter and exit) has no drawer exception. | Add both to house-rules so the next term inherits them: page-level 300–400ms, and drawers and sheets exit with a full slide on `--ease-drawer` (patterns.md: "a closing drawer"). |

### Checked and correct

- **Ranges and verdicts** (`:33–49`): tooltip 125–200, dropdown 150–250, sheet 200–300, which are the house ranges. Live `data-verdict`:
  - Tooltip: right / slow / too slow.
  - Dropdown: right / slow / too slow.
  - Sheet: abrupt / right / too slow.

  150ms is "right" for a tooltip and "abrupt" for a sheet. 300ms is "slow" for a dropdown and "right" for a sheet. The detail caption reads e.g. `sheet range 200–300ms`.
- **Computed durations, all 6 combinations:**
  - Open: 0.15 / 0.3 / 0.5s.
  - Closed with exits on: 0.1125 / 0.225 / 0.375s.
  - Closed with exits off: equal to open.

  Measured last-change, open: 149 / 315 / 499ms (tooltip), 149 / 299 / 499 (dropdown), 166 / 317 / 517 (sheet, frame granularity). Close at 0.75×: 130 / 246 / 396 (tooltip), 123 / 239 / 389 (dropdown), 118 / 235 / 385 (sheet), each one frame of latency over spec. Close at 1×: 183 / 332 / 516, 173 / 323 / 507, 153 / 303 / 503.
- **Easing**: `cubic-bezier(0.23, 1, 0.32, 1)` on tooltip and dropdown, `cubic-bezier(0.32, 0.72, 0, 1)` on sheet, open and close. No `ease-in` and no `transition: all` anywhere (generator sweep).
- **Sheet exit**: a full slide back on `--ease-drawer` at 0.75×. That is correct against patterns.md, whose Drawer recipe uses one transition both ways and which reserves full off-screen slides for "a closing drawer". The house-rules wording should catch up (see Doc).
- **Properties and interruptibility**: only `CSSTransition:opacity` and `CSSTransition:transform` run (the sheet runs `transform` only); no keyframes. Reversing 120ms into the open continues from the current value with no snap back to fully open. For example, the 500ms tooltip column goes from opacity 0.80 to 0.61 on the next frame. Snap (`group-data-[snap=true]`) kills the transitions for still frames.
- **Over 300ms**: only the deliberate 500ms column (open 500ms, close 375ms).
- **Entry page**: plays one cycle (close, 400ms beat, open) and rests open, with 0 animations from about 1.7s on. Replay restarts it.
- **Card on `/`**: loops (open hold, close, open), and runs in both themes.
- **Reduced motion**: still frame with all three open, 0 animations and a Play button. One cycle plays on request, then it returns to the still frame. The glyph has 0 animations.
- **Glyph**: `g-dur` 2.4s on the house ease-out, only while active (0 animations on `/` and `/terms/ease-out`). The way out is 32% of the cycle and the way back 24%, so the return takes 0.75× as long.
- **Prompt**:
  - 177–193 words across the 6 combinations (≤230).
  - Route-labelled; values only.
  - No em dashes, no blocked words, tags backticked.
  - Element line exact at every combination (e.g. tooltip: open 150ms, close 112.5ms, `calc(var(--duration-1) * 0.75)`).
- **CSS tab**: `--duration-1..4` = 150 / 200 / 250 / 300 and used correctly. The base rule holds the close and `[data-open]` the open. The exits-off variant comments the house ratio. The dropdown's `[role="menuitem"]` has no transition. The reduced-motion block is correct per kind; the sheet's fades in place with opacity only.
- **Motion tab**: per kind, with `useReducedMotion()` called unconditionally, the origin set for tooltip and dropdown, and the exit at 0.75× with the same curve.
- **Acceptance**: observable. It covers computed durations per kind, exit ≤0.75×, nothing over 0.3s except page-level (≤0.4s), hover and press within 150ms, and reduced motion.
- **Definition**: 84 characters, one sentence.
- **Aliases**: unique across all terms.
- **Sources**: both resolve. "You Don't Need Animations" covers under 300ms, the 180ms-vs-400ms dropdown and keyboard-driven actions getting none. "7 Practical Animation Tips" covers under about 300ms and frequent actions shortened or removed.
- **Console errors**: none, and no overflow at 375.

### Feel notes

- The three columns land in visible order, and the 500ms column visibly drags after the other two have settled. The sheet row teaches best: 150ms slams in, 300ms glides, 500ms crawls.
- On the card, the 10px labels are legible and the columns read as a set at 308px. At rest, the three frames are identical and only the labels differ. That is fine, since the card loops.
- The labels are calm: mono, small, and only `right` in ink. They just need to clear contrast (Gate).
- Tooltip is the weakest of the three to watch. Scale 0.97 over a few px means 150 and 300 differ mostly in fade. That is honest (small travel, small difference) and it supports the "size picks the spot" point, so no change.

### Prompt-test note

The prompt opens "Set the animation durations in this UI…", which presumes an existing UI. In an empty sandbox the agent has to invent a trigger and the element. Every value it needs is present, so I expect it to build, but run the prompt test on the sheet combination too (backdrop).
