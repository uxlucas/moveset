---
verdict: pass
reviewedAt: 2026-10-13
approved: true
approvedBy: Lucas Lima
approvedAt: 2026-10-14
---

# Review: swipe-to-dismiss

## Round 3 (batch-7, c87eb6a)

Scoped gate check of the second fix round (`.superpowers/batch-7-fixes-2.md` items 1 to 7).

What I read: Round 2 below (G4, N7), the fixes list (as data), `git show c87eb6a -- src/terms/swipe-to-dismiss.tsx tests/e2e/batch-7.spec.ts`, the current term, and Motion 14.1.0's `VisualElementDragControls.mjs` and `PanSession.mjs` (to check the tab's comment).

What I drove: I dumped the JS tab, Motion tab, prompt, full prompt and acceptance at all four combinations (`term.code(v)` / `term.prompt(v)`, plus `count-prompts.ts` and `dump-js-tabs.ts`). I built both tabs verbatim into scratch pages with esbuild (React 19.3, Motion 14.1.0, no stylesheet, a 400px stage so the toast is 376px) and drove them with CDP mouse at 800, CDP touch at 375 (`isMobile`), and synthetic `PointerEvent`s dispatched on the element. A rAF sampler logged `translateX` every frame, and a second read after each frame's rAF callbacks (a `setTimeout(0)` from the tick) logged what that frame painted, since Motion writes in its own rAF callback after the sampler's. I type-checked the four Motion tabs with `tsc --strict` (TypeScript 5.9.3, `@types/react` 19.3), ran `node --check` on the four JS tabs, then drove the review build on :3200 (all four combinations, touch at 375, reduced motion, the card on `/`, light and dark).

**Verdict: pass.** G4 is fixed by taking the Motion route off `drag`. The Motion tab is now the JS route's pointer events on a `motion.div`, and it measures the same as the JS tab at all four combinations, including the round 2 edge cases. Items 2 to 7 are in the prompt at every combination. No regressions. Two optional nits below.

### Item 1 (gate G4): the Motion route without `drag`

| Check | Result (Motion tab, all four combinations unless noted) |
|---|---|
| No `drag` | `drag="x"`, `dragMomentum` and `onDragEnd` are gone. The only `drag="x"` left is in the comment. `onPointerDown` / `Move` / `Up` / `Cancel` / `LostPointerCapture`, `useMotionValue`, `style={{ ...box, x }}` with `touchAction: 'pan-y'`, `userSelect: 'none'` inline (computed `pan-y` / `none`, `transition-duration` 0s). `tsc --strict`: 0 errors on all four. |
| 1:1 from the first pixel | CDP mouse 1px steps: 1→1.0, 2→2.0 … 6→6.0, painted in the frame of the move (0.00px against the latest move; the early sampler reads one frame behind, which is Motion's rAF order, not lag). Synthetic events: 1→1.0 … 6→6.0, 40→40.0. CDP touch at 375: 1→1.0 … 60→60.0, `pointerup` and no `pointercancel`. No 3px dead zone. |
| Drag that starts on Dismiss | CDP mouse from the button, 45% right and 45% left, held 250ms: max \|x\| 0.00, not removed. The `click` goes to the common ancestor `DIV`, not the button. Synthetic drag on the button: x 0.00. A click, Enter or Space on Dismiss runs the exit to the right (to 392), the toast is removed, and focus goes to `.show-toast`. |
| Grab a returning toast, release without moving | Caught at 22 to 25px (spring) or 11 to 18px (ease). Held: two reads 150ms apart are equal. Released: goes back to 0.00 at 326 to 345ms (spring) or 112 to 126ms (ease). +1px does the same. |
| Grab a leaving toast | It stops where it is caught (274 to 338px), does not dismiss while held (`onComplete` does not fire on `x.stop()`), and on release with no move it resumes leaving from there with velocity 0: within 0.5px of 392 at 270 to 275ms (spring) or 149 to 163ms (ease), then removed. Dragged back under a third, it goes back (home at 389 to 429ms spring, 170 to 174ms ease). Nothing strands. |
| `pointercancel` before any move | Synthetic `pointercancel` straight after `pointerdown` at rest: x 0.00, and the next drag follows (30.0). On a returning toast (caught at 41 to 85px): back to 0.00. Same with `lostpointercapture` alone. On a leaving toast (caught at 284 to 323px): leaves and is removed. CDP touch: a vertical swipe on a returning toast gives `pointercancel`, the page scrolls 0 to 225, and the toast goes back to 0.00; on a leaving toast it is removed. |
| Reduced motion | The drag follows (150 and 94px held). The first frame painted after `pointerup` has the toast removed (40%, −40%) or at 0.0 (25%). Dismiss: removed in the first frame. No in-between frames. (`drag` decided in `postRender`, a frame late; the pointer handler now calls `x.jump` synchronously.) |
| Decision on `x.get()` and the window ending at `pointerup` | `release(leave(x.get(), v), v)` with `velocityOf(d.samples, e.timeStamp)` of the ending event. Re-grabbed at 22 to 26px, dragged +120 and held 250ms, released at 131.8 to 145.2 (offset 120 < 125.3): leaves at all four. Fast to 20% then held 150ms: back. Released at 125px: back; at 126px: leaves. |
| `onComplete` dismisses | `onDismiss` runs from `onComplete` (the harness unmounts the toast then): removed 368 to 433ms after `pointerup` (spring), 217 to 233ms (ease). |
| The comment | "the drag prop starts after 3px, decides in postRender, has no cancel path before the drag starts and drags from child buttons." Accurate against Motion 14.1.0: `PanSession` `distanceThreshold = 3`; `onDragEnd` is in `frame.postRender`; a `pointercancel` before the drag starts goes to `handlePointerUp`, which returns before any callback when there was no move (and `resumeAnimation` acts only with snap or constraints); the drag listener only skips text inputs ("Buttons and links don't block drag"). |

Threshold and timing on the Motion tab match the JS tab: slow 25% back (home 415 to 430ms spring, 159 to 167ms ease, never below 0); slow 126px leaves (within 0.5px at 296 to 311ms spring, 176 to 183ms ease); a timed 20% flick (~1px/ms) leaves with both (300 to 312ms) and comes back with distance only; the left flick mirrors it; a release moving toward rest goes back. On the spring the first frame after a ~1px/ms flick steps 75 → 109 to 116, so the velocity carries. No console errors.

### Items 2 to 7

| # | Status | Evidence |
|---|---|---|
| 2 | **fixed** | "a third of its width (125.3px; at or past it counts)" at all four. 125px goes back, 126px leaves (tabs and demo). |
| 3 | **fixed** | JS route: "`v` = Δx / Δt over the 100ms ending at `pointerup`"; acceptance lines 2 and 3 say the same. |
| 4 | **fixed** | Prompt "focus inside returns to the opener, or its container"; acceptance "focus lands on the opener, or its container, not on `body`". |
| 5 | **fixed** | Ease variants: "(the mistake; house: springs that carry it, `{ stiffness: 341, damping: 36.9 }` back)". No 947 / 61.6, and the Dismiss line has no `velocity: 0`. The spring variants keep both. |
| 6 | **fixed** (N7) | "Reference toast: 376px wide; … scale to yours; its container clips." |
| 7 | **fixed** | "every frame further than the one before, at 100ms within ±3% of the travel of the curve's value". Measured on both ease tabs, 24 releases (leave and back): monotonic, the frame nearest 100ms within 0.0 to 0.2% of the curve (curve(0.5) = 0.966), worst over 0 to 200ms 2.8%, within 0.5px of the target at 142 to 172ms. |

Prompt: 225 / 216 / 230 / 221 words (both-spring, both-ease, distance-spring, distance-ease). Distance only / Spring is exactly 230. No blocked words, no em or en dashes, tags and code backticked, terse.

### New findings (optional)

| # | Severity | Where | Before | After |
|---|---|---|---|---|
| R3-N1 | Nit | Ease acceptance line 4 | "at 100ms within ±3% of the travel of the curve's value" reads garbled. | "at 100ms, within 3% of the travel of the curve's value there (96.6%)". |
| R3-N2 | Nit | Acceptance line 6 | "(Motion route: `x.get()`, not the drag offset)" is left over from the `drag` route. There is no drag offset now. | Drop the parenthesis (pays for R3-N1). |

N1 (pills wrap at 375, 48px) and N3 (dark toast reads recessed) are still kept, as before.

### Regressions (none)

- **Demo, W 376, all four**: follow 0.00px after take-over. Slow 25% back (home 418 / 427ms spring, 157 / 166ms ease); slow 40% leaves (within 0.5px at 299 to 305ms, `closed` 372 to 382ms; ease 175 / 185ms). A timed 20% flick leaves with both and comes back with distance only ("0.96 px/ms, 75px: distance only, back"); the left flick mirrors it; against the direction: "38 of 125px, 0.59 px/ms toward rest: back". Bunched events (CDP burst, one-task synthetic burst): "0.00 px/ms: back". Re-grab at 11 to 21px: holds, +120 leaves, no move goes back. A drag that starts on Dismiss: x 0.00, state stays `open`, status empty (both directions).
- **Keyboard**: Enter and Space on Dismiss run the exit; focus goes to the frame (`data-swipe-frame`, solid accent outline); `role="status"` reads "Dismissed", then the toast re-enters and status and hint reset.
- **Touch at 375**: slow 60px follows to 60 with `pointerup`, back to 0; a vertical swipe gives `pointercancel` and scrolls 0 to 225 (demo, both tabs). Overflow 0, light and dark.
- **Reduced motion**: still frame `open`, `transform: none`, 0 animations; the drag follows (94); release lands at 0 or `closed` with no in-between frames; the re-enter keeps the wrapper at y 0.
- **Card on `/`**: 0 buttons, 0 focusables, "width/3 or 0.1px/ms | spring"; the loop runs drag to 49 → back, flick → 220 → `closed` → re-enter, in light and dark.
- **JS tab**: the same matrix as the Motion tab, same results (follow 0.00px with no frame offset). `node --check` passes on all four, 0 `as const`.
- **Unit tests**: `src/swipe-to-dismiss.test.ts` 11/11. **Console**: no errors in any run.

Screenshots (refreshed): `.superpowers/review-swipe-to-dismiss-light.png`, `.superpowers/review-swipe-to-dismiss-dark.png`.

## Round 2 (batch-7, 5f241c8)

Scoped re-review of the fix round (`.superpowers/batch-7-fixes.md` items 12 to 24).

What I read: round 1 below, the fixes list (as data), `git show 5f241c8` for the term, the unit test and the e2e spec, the current `src/terms/swipe-to-dismiss.tsx` and `src/swipe-to-dismiss.test.ts`, Motion 14.1.0's `PanSession.mjs`, `VisualElementDragControls.mjs` and `use-props.mjs`, and the prompt-test report for swipe (as data).

What I drove: I dumped the JS tab, Motion tab, prompt, full prompt and acceptance at all four combinations from `term.code(values)` / `term.prompt(values)`, and also ran `.superpowers/dump-js-tabs.ts`. I built both tabs verbatim (no edits) into scratch pages with esbuild, a 400px stage so the toast is 376px as in the demo, then drove them and the review build on :3200 in Playwright Chromium: CDP mouse at 800 and 1280, CDP touch at 375 (`isMobile`), reduced motion, light and dark. A rAF sampler logged `translateX` and the wrapper state every frame. I type-checked the four Motion tabs with `tsc --strict` and instrumented a copy of the Motion tab (logging only) to trace one new finding.

**Verdict: fail, on one new gate (G4).** Every round 1 gate and should-fix is fixed and measures right at all four combinations, with no regressions. But the copy-ready Motion tab, and the prompt's Motion route, let a drag start on the Dismiss button. The button moves with the toast, so the release always counts as a Dismiss click as well. That click starts an exit to the right one frame before `onDragEnd` decides, so the decision reads a corrupted `x`. The JS route says "(not on Dismiss)" and the JS tab and demo ignore those drags. Round 1 missed this. The prompt test flagged it (#13) but did not try it.

### Items 12 to 24

| # | Round 1 | Status | Evidence |
|---|---|---|---|
| 12 | G1 | **fixed** | 0 `as const` in the JS tab. `node --check` passes on all four tabs from both dumps (`dump-js-tabs.ts`, `term.code(v).js`). It is still in the Motion tab, and all four Motion tabs pass `tsc --strict`. |
| 13 | G2 | **fixed** | `toast.style.touchAction = 'pan-y'` and `userSelect = 'none'` (`:524`, `:525`), computed `pan-y` / `none` in the scratch page with no stylesheet. Touch at 375, slow 60px drag (10 moves of 6px, 30ms apart): x 60 while held, 10 `pointermove`, `pointerup`, no `pointercancel`, then back to 0 (all four JS tabs, the Motion tab and the demo). A vertical swipe on the toast scrolls 0 to 225 with `pointercancel` and x ends at 0. The prompt's Drag line says `touch-action: pan-y` for both routes. |
| 14 | G3 | **fixed** | The Motion tab decides on `x.get()` for both distance and sign (`decide`, `:650` to `:657`). The prompt says "decide on `x.get()` and `info.velocity.x` (px/s)" and no longer mentions `info.offset.x`. Re-grab at 26 to 31px while going back, drag +120, hold 250ms, release at 141 / 141 / 133 / 133 (third 125.3): leaves at all four on the Motion tab (within 0.5px at 305 / 316ms spring, 197 / 199ms ease) and on the JS tab. |
| 15 | prompt test #2 | **fixed** | Grab a returning toast and release without moving: held at 20.8 (both reads 120ms apart), then back to 0.00 (home at 320 to 334ms spring, 116 to 131ms ease). +2px (under Motion's threshold) does the same. A touch tap mid-flight also goes home. The acceptance states the 3px start ("Motion route: within 3px until the drag starts, then exactly"). The tab's comment is accurate against node_modules: `PanSession` `distanceThreshold = 3`, `onSessionStart` calls `stopAnimation()` at pointerdown, `stop()` returns before `onDragEnd` unless `isDragging`, `resumeAnimation` only acts with `dragSnapToOrigin` or constraints, `use-props` sets `touchAction: pan-y` for `drag="x"`, and "read by Motion over its last 100ms" matches `getVelocity(history, 0.1)`. Because `updatePoint` is keep-alive, a drag that stops reads 0: fast to 25%, then held 300ms or 1000ms, `info.velocity.x` = 0 and it goes back. On the inertia: `dragMomentum={false}` still starts an inertia with velocity 0, but `onDragEnd` (post-render) replaces it the same frame, so "one spring carries the velocity" holds in effect. |
| 16 | S1 | **fixed** | Prompt JS route: "`pointerdown` (not on Dismiss): `x.stop()`, `setPointerCapture`; `pointermove`: `x.set(start + dx)`". "(Enter, Space too)" is gone. |
| 17 | S2 | **fixed** | Samples are stamped with `e.timeStamp` in the demo (`:354`, `:364`, `:377`) and the JS tab (`:542`, `:581`). `MIN_SPAN_MS` 8 has a unit test (three events 1ms apart, 60px: 0, not 30px/ms) and passes, 11/11. Bunched events in the demo: a CDP burst at 20% gives "75 of 125px, 0.00 px/ms: back". Six synthetic `pointermove`s dispatched in one task give "75 of 125px · 0.00 px/ms" mid-burst and back on release. The e2e `flickOn` spaces three moves with 10ms timers. The hint never printed an absurd speed. The largest was 3.21 px/ms (30% in 2ms steps), and a 4ms-step flick read 1.06 to 1.99. Distance only / Spring: the fastest flick back peaks at x 156, inside the frame (round 1: 2177). |
| 18 | S3 | **fixed** | "Emil's ~0.1px/ms, here read over the last 100ms instead of the whole drag" in the demo comment (`:37` to `:40`) and the JS tab. The Motion tab says "read by Motion over its last 100ms". The acceptance names `event.timeStamp` and the 8ms spacing. |
| 19 | S4 | **fixed** | A release moving back toward rest: "38 of 125px, 1.22 px/ms toward rest: back" (both), "…0.59 px/ms toward rest: back" (distance only). The distance-only flick says "0.96 px/ms, 75px: distance only, back". |
| 20 | N2 | **fixed** | `{ type: 'spring', stiffness: 947, damping: 61.6, mass: 1 }` and `341 / 36.9`, flat in both tabs, including the ease variants' comments. |
| 21 | N4 | **fixed** | Acceptance line 1: "in the frame after every move". Measured: the JS tab and demo are 0.00px against the latest move. The Motion tab is 12px behind the latest move and 0.00px allowing one frame. |
| 22 | N5 | **fixed** | "a third of the width (the house number; Sonner uses 45px, Vaul a quarter)" in the description, demo comment and both tabs. Rauno stays, for the threshold and momentum idea the description keeps. |
| 23 | N6 | **fixed** | JS tab markup comment: `<div role="status"><div class="toast">…<button class="dismiss">Dismiss</button></div></div>`, shown by `<button class="show-toast">`. |
| 24 | prompt test | **fixed** | "Toast: 376px wide (a third: 125px)", "physics (mass 1)" / "springs, mass 1", focus "returns to the opener or its container", matching the demo (focus goes to the frame). One nit below (N7). |

Prompt: 222 / 223 / 226 / 227 words (both-spring, both-ease, distance-spring, distance-ease), all ≤230. No blocked words, no em dashes, tags and code backticked, terse.

### New findings

| # | Severity | Where | Before | After |
|---|---|---|---|---|
| G4 | Gate, **open** | Motion tab `motionCode` `:659` to `:693`; prompt Motion route `:485` | `drag="x"` listens on the whole `motion.div`, Dismiss included. A drag that starts on Dismiss drags the toast, and because the button moves with it, the release is also a click. Traced (logging copy of the tab): `click` → `release(1, 0)` starts the exit to the right, then `onDragEnd` (post-render) decides from an `x` already moved one frame. Both-spring, slow drags that start on Dismiss and hold 250ms: 20% right goes 75 → 172 and **leaves** (it should go back); 20% left goes −75 → +3.9 (a 79px lurch through 0), then back; 45% left lurches −170 → −158 → −239, then leaves left. Both-ease, 45% left: −170 → −41 → home, so it **goes back** although it is past a third. In every case focus jumps to the opener, even when the toast stays. The JS tab and demo ignore a `pointerdown` on Dismiss (measured: x stays 0, no click, focus stays on Dismiss). The prompt's Motion route has no "not on Dismiss", so a build that follows it does the same. | Tab: `const controls = useDragControls()`, `dragListener={false}`, `dragControls={controls}`, and `onPointerDown={(e) => { if (!(e.target as HTMLElement).closest('button')) controls.start(e) }}`. `controls.start` still runs `onSessionStart`, so the spring still stops on grab and the `onPointerUp` fallback still applies. Prompt Motion route: "`dragListener={false}`, `dragControls.start(e)` on `pointerdown` (not on Dismiss)". That is about 6 words, so pay for them, for example "Toast: 376px wide (a third: 125px), clipped by its container." → "Numbers for a 376px toast; container clips." Add an acceptance clause: "a drag that starts on Dismiss does not move the toast". |
| N7 | Nit, **open** | Prompt `:732` | "Toast: 376px wide (a third: 125px)" reads as an instruction to size the user's toast. The demo's own toast is narrower at 375. | Say it is the reference the numbers use, e.g. "Numbers for a 376px toast (a third: 125px)". |

### Kept from round 1

- N1 (threshold pills wrap at 375): **kept**, as the fixes list allows. "Distance or velocity" and "Distance only" are still 48px tall, two lines; overflow 0.
- N3 (dark toast reads as recessed): **kept**, optional as in Enter and Exit E11.
- Deviations 1 to 8: unchanged and still agreed.

### Regressions (none)

- **Follow**: demo after take-over, 0.00px worst (mouse), x 60 held on touch at 375. Transition-duration 0s, `touch-action: pan-y`, `user-select: none`.
- **Threshold, demo, W 376**: slow 25%, stopped: back, monotonic, never below 0, home at 418 / 421ms (spring), 169 / 171ms (ease). Slow 40%: gone, within 0.5px of 392 at 294 to 310ms, `closed` at 369 to 378ms; ease 175 to 187 / 220 to 233ms. A timed flick at 20% (~0.9 px/ms) leaves with both and comes back with distance only (home 445ms, peak 84). The left flick mirrors it. A flick against the direction goes back (min −2.69, passes 0 once, as acceptance line 5 allows). Same in both tabs (JS within 0.5px at 293 to 312ms, Motion at 305 to 333ms; removed at 372 to 433ms).
- **Velocity carry vs ease-out**: on the spring, the first frame after a ~1 px/ms release steps 75 → 109 (+34, at least v × frame). Ease-out kicks 75 → 161 regardless.
- **Re-grab mid-flight**: the demo holds at 23.6, and +120 leaves (within 0.5px at 295 to 308ms). With no move it goes back (home at 332 / 337ms).
- **Keyboard**: Enter and Space on Dismiss run the exit from 0. Focus goes to the frame (`data-swipe-frame`, solid accent outline), `role="status"` reads "Dismissed", the toast re-enters, and status and hint reset. In the tabs, focus goes to `.show-toast`.
- **Reduced motion**: still frame `open`, `transform: none`, 0 animations. The drag follows (94). On release the next frame is at 0, or `closed` with no in-between frames. The re-enter keeps the wrapper at y 0 throughout.
- **Card on `/`**: 0 buttons, 0 focusables, labels "width/3 or 0.1px/ms | spring". The loop runs drag 49 → back, flick → 220 → `closed` → re-enter, in light and dark.
- **375**: overflow 0, light and dark. **Console**: no errors in any run (demo, tabs, card, reduced motion). **Unit tests**: `src/swipe-to-dismiss.test.ts` 11/11.

Screenshots (refreshed): `.superpowers/review-swipe-to-dismiss-light.png`, `.superpowers/review-swipe-to-dismiss-dark.png`.

## Round 1 (batch-7, e371acd)

What I read: `docs/house-rules.md`, spec §4 to §8, the `emil-animations` skill (SKILL.md springs; patterns.md Drawer velocity rule, Toast, Exit Animations; techniques.md Springs, interruptibility), `emil-ui-review`, the brief and report (as data), `src/terms/swipe-to-dismiss.tsx`, `src/swipe-to-dismiss.test.ts`, `src/terms/spring.tsx`, Motion 14.1.0's `spring.mjs`, the four sources.

What I drove: the review build on :3200 in Playwright Chromium, 1280 and 375, light and dark, reduced motion, mouse and CDP touch, all four combinations. A rAF sampler logged the toast's computed `translateX`, the wrapper's state, opacity and `translateY`, and every pointer event. I dumped the four prompts with `dump-prompt.ts`. I built the JS and Motion tabs for all four combinations in a scratch page (esbuild, React and Motion from the worktree, no stylesheet on the toast) and drove them the same way. Times are ±17ms (60fps headless).

**Verdict: fail, on three gates in the copy-ready code.** The demo itself is right: the follow is exact, the threshold rule, both springs, the velocity hand-off, the re-grab, the keyboard Dismiss, touch scrolling and reduced motion all measure as claimed. The JS tab does not parse as JavaScript and does not work on a phone. The Motion route (prompt and tab) decides on the drag offset instead of the position, which breaks the re-grab acceptance line.

### Findings

| # | Severity | Where | Before | After |
|---|---|---|---|---|
| G1 | Gate | JS tab, `jsCode` `:489`, `:490`, `:496` | The JS tab (labelled JS, `lang: 'js'`) has `as const` on `exit`, `back` and `tween` at all four combinations. `node --check` on each dumped tab: SyntaxError. Pasted into a `.js` file it does not run. | Drop `as const` from `jsCode` (keep it in `motionCode`). With it stripped, the tab runs and measures right (below). |
| G2 | Gate | JS tab, `:500` to `:505` (and the markup comment `:476`) | The tab never sets `touch-action` or `user-select`, and "no stylesheet assumed" means nothing else does. On touch (CDP, 420px, `isMobile`), a slow 60px horizontal drag gets `pointercancel` after 6 moves: the toast stops at 18px and the release runs from there (the Motion tab follows to 60px and gets `pointerup`). Swipe to dismiss is mostly a phone gesture. | After `const toast = …`: `toast.style.touchAction = 'pan-y'` and `toast.style.userSelect = 'none'` (one comment line: a vertical swipe still scrolls). |
| G3 | Gate | Prompt Motion route `:467`; Motion tab `:620` to `:625` | "decide on `info.offset.x`". Offset is from the drag start, not the position. Re-grabbed while going back and released at x = 140 (a third is 125), the Motion tab goes back (offset 54) at all four combinations; the JS tab and the demo leave. Acceptance line 6 says "released again, the rule applies from the new `x`", so a build that follows the prompt fails its own checklist. The side also comes from the offset, so the Motion and JS routes disagree on sign for a re-grab across 0. | Decide on the position: `const px = x.get()`, `side = Math.sign(px)`, `Math.abs(px) >= width * DISTANCE`. Prompt: "decide on `x.get()` and `info.velocity.x` (px/s)", same word count. |
| S1 | Should fix | Prompt JS route `:466` | "`pointerdown` (not on Dismiss): `setPointerCapture`; `pointermove`: `x.set(dx)`". It does not say to stop the running spring or add the base. Followed literally, a grab mid-flight jumps to `dx` from 0, and `x.set` fights the spring, which keeps writing. The tab gets it right (`x.stop()`, `base + dx`); the prompt is the self-contained artifact. | "`pointerdown` (not on Dismiss): `x.stop()`, `setPointerCapture`; `pointermove`: `x.set(start + dx)`". That's +3 words, so Distance only / Spring goes to 231. Pay for it by dropping "(Enter, Space too)" from the Dismiss bullet: a native button does it, and the acceptance line checks it. |
| S2 | Should fix | Demo `:347`, `:357`, `:370`; JS tab `:511`, `:518`, `:557`; e2e `flickOn` | Samples are stamped with `performance.now()` when the handler runs, so pointer events that arrive bunched (a busy main thread, or one CDP burst) give a tiny Δt. A burst flick reads 94 to 107 px/ms (the hint prints "107.43 px/ms"). With Distance only / Spring, the "back" spring takes 107,000 px/s: the toast flies to x = 2177, out of the frame, and comes back in from the right, home at 661ms. With Distance or velocity the exit overshoots to x = 1288 off-frame and is removed at 470ms. The e2e flick tests send exactly this burst, so they pass on that artifact instead of on a real flick. | Stamp samples with `e.timeStamp`. Read the velocity over at least ~8ms of samples (or clamp, e.g. ±4 px/ms). Send the e2e flick on timers (I used moves 8ms apart: 1.0 px/ms reads 1.02). |
| S3 | Should fix | `:37`, JS tab `:481`, Motion tab `:578` | "Emil: swipeAmount / timeTaken over 0.10". Emil's toast article divides the swipe by the time since the drag started (whole-gesture average), cutoff `0.11`. The term reads the last 100ms. The window is the better choice here: by Emil's average, the demo's slow drag to 25% (94px over 600ms = 0.157) would leave. But the comment credits Emil with something he does not compute. | "Emil's ~0.1px/ms, read over the last 100ms instead of the whole drag, so a drag that stops does not count." |
| S4 | Should fix | Hint `:376` | A release moving back toward rest reads "45 of 125px, 0.61 px/ms: back". The visitor sees 0.61 ≥ 0.1 and "back", with no reason given. The sign rule is half the lesson. | When `|v| ≥ 0.1` and the signs disagree: "…0.61 px/ms toward rest: back". |
| N1 | Nit | Controls `:16`, 375px | Deviation 3 shortened the labels so they would not wrap, but at 375 "Distance or velocity" and "Distance only" each still wrap to two lines inside the pill (`m375.png`). | Shorter labels ("Either" / "Distance only"), or let the group drop under its label at narrow widths. |
| N2 | Nit | Both tabs, `:489`, `:495`, `:585`, `:591` | `{ type: 'spring', ...{ stiffness: 947, damping: 61.6, mass: 1 } }`: a template seam (spreading a literal). | `{ type: 'spring', stiffness: 947, damping: 61.6, mass: 1 }`. |
| N3 | Nit | Frame `:127`, dark | The toast is `lab(5.7)` on a frame of `lab(13)`, and its shadow computes transparent, so the toast reads as a recessed slot, not a raised surface. This is the same as Enter and Exit E11, which was kept as optional. | A hairline or `--demo-2`-ish surface in dark, if the toast family changes. |
| N4 | Nit | Acceptance line 1 `:692` | "equals the pointer's `clientX` minus its value at `pointerdown`, ±0.5px, on every move". Motion writes drag values in its frame loop, so a check inside the `pointermove` handler reads the previous value. My rAF sampler saw the Motion tab one step behind (12px at 12px steps); the demo and JS tab read 0.00px. | "…in the frame after every move". |
| N5 | Nit | Sources `:719` to `:724` | Rauno's article has no swipe numbers. It supports the idea qualitatively: gestures with "an explicit trigger threshold", and a thrown app that "retains the momentum and angle". Sonner's page only says swipe direction follows position. Motion's drag page does not give velocity units (px/s is right, from Motion's source: `millisecondsToSeconds(velocity)`). "A third of the width" is in no source: Sonner uses 45px, Vaul 25%. | Keep the links. Where a third appears, call it the house number. |
| N6 | Nit | JS tab markup comment `:476` | The prompt requires an always-mounted `role="status"` region, but the tab's markup does not show it. | `<div role="status"><div class="toast">…</div></div>` in the comment. |

### Deviations from the brief, judged

1. `animate(motionValue)` instead of WAAPI `linear()`: **agree.** It takes `velocity`, retargets when grabbed (measured: it holds at 34.3px from 43.8px, no jump), and it is what Spring's JS tab ships. A `linear()` curve would have to be regenerated per release and could not be interrupted.
2. No `dragConstraints` / `dragElastic`: **agree.** Without constraints the drag is 1:1. With `dragMomentum={false}`, Motion still starts a zero-velocity inertia on release, but it ends at once, and the `animate` in `onDragEnd` (post-render) takes over. Measured: no fight.
3. Shorter labels: fine, but they still wrap at 375 (N1).
4. No direction or compare control: agree.
6. `onComplete` about 450ms after release: **agree, invisible.** The demo is within 0.5px of `width + 16` at 296 to 314ms and `closed` at 380 to 470ms. The tabs are removed at 368 to 433ms. Motion's rest check (`restSpeed` 2, `restDelta` 0.5) accounts for the tail, and the toast is off-frame the whole time. The acceptance gives no time bound on removal, which is right.
7. `velocity` in px/s: **correct.** Motion's spring takes units per second (`-millisecondsToSeconds(velocity)` inside the generator). A 1000 px/s release adds ~10px to the first frame (46.88 vs 36.91 at 16.7ms). The prompt gives each unit where it applies.
8. Slogan dropped from the threshold line: fine. It lives in the definition and description.

### Measurements

- **Springs against Motion's generator.** The brief to me had the pairs swapped; the code is right. The exit `{ duration: 0.3, bounce: 0 }` is 947 / 61.6 (best fit 950.5 / 61.66). Back `{ duration: 0.5, bounce: 0 }` is 341 / 36.9 (best fit 342 / 36.99). Worst deviation from the duration curve: 0.00102 and 0.00098 of travel. Damping ratio 1.0009 and 0.9991. Peak 1.000000, so no overshoot. Confirmed in Motion 14.1.0: `isTimeDefined ? 0 :` drops velocity on duration/bounce springs. A timed spring with `velocity: 1000` steps the same as with none (36.92 vs 36.91). `src/swipe-to-dismiss.test.ts` holds both to the curves at 0.005 of travel (passes, 10/10). Spring's tab says the same about Motion 14, and both tabs here say it in a comment.
- **Follow.** Demo, mouse and touch: worst |`translateX` − (clientX − downX)| over 110 frames is 0.00px. `transition-duration` 0s, `touch-action: pan-y`, `user-select: none`, the transform only (the wrapper's enter is a separate element). Pointer capture: dragged 300px above the frame, it still followed (x 60 at release) with no selection.
- **Releases, demo, W = 376** (Distance or velocity / Spring): slow to 40%, stopped, then released: leaves, past width at 163ms, within 0.5px at 297ms, `closed` at 382ms. Flick 20% at ~1 px/ms: leaves, within 0.5px at 305 to 314ms. Left flick: mirror image, −392. Moving back toward rest at 0.61 px/ms from 12%: back, home at 319ms. Slow 25%, stopped: back, monotonic, never below 0, home at 417ms. With Distance only, the same flick goes back (home at 418 to 432ms), and the hint says "distance only, back". With Ease-out the exit and return are done by 175 to 186ms and 153 to 160ms, whatever the speed.
- **Velocity carry.** Spring: a ~1 px/ms release leaves at 1.07 to 1.48 px/ms in its first frame, so the hand-off is continuous. Ease-out: 5.3 to 5.7 px/ms from the same release, a kick. A faster flick (0.48 → 1.70 px/ms) reaches half the width 8ms sooner (62 → 54ms) and the width 8ms sooner (179 → 171ms) on the spring, and makes no difference on Ease-out (48 / 115ms each time).
- **Re-grab.** Grabbed mid-spring at 43.8px: it holds at 34.3 (Motion's last write), then follows +6px per move. Released again with no movement: back to 0.00.
- **Keyboard.** Enter and Space on Dismiss (`:focus-visible` accent ring, 24px box, 44px `::after`) run the same exit with `velocity: 0`: first step 38px, within 0.5px at 300ms, `closed` at 400ms, `role="status"` reads "Dismissed". Focus moves to the frame with an accent ring, not `body`. The toast re-enters at 800ms with the plain enter: opacity 0 → 0.34 → 1 and y 16 → 10.6 → 0 by 150ms, x 0. Status and hint reset. Tab while closed skips the hidden Dismiss. Escape does nothing and nothing promises it.
- **Touch, 375.** Slow 25%: back. Past a third: gone. Flick 20% at 0.53 px/ms: gone. A vertical swipe starting on the toast: `pointercancel`, page scrolled 0 → 225, x stays 0. Overflow 0.
- **Reduced motion.** Still frame `open`, `transform: none`, 0 animations, `data-playing=false`. The drag follows. On release, the next frame is at 0 or `closed` with no in-between. The return fades in place (y 0 throughout). Play once runs the springs with 38 in-between frames and the 16px enter. This is the right reading of the house rules: drag is direct manipulation, release is the animation, and Play is the visitor asking. Acceptance line 9 tests it. Both tabs jump under `prefers-reduced-motion` (scratch page: no in-between frames after release).
- **Tabs in a scratch page** (JS with `as const` stripped). JS: follow 0.00px; back at 416 to 434ms; leaves within 0.5px at 295 to 314ms, removed at 368 to 432ms; Distance only sends the flick back; Ease-out done by 182ms; re-grab past a third leaves; Enter and Space remove it and focus "Show toast". Motion: the same, except the re-grab (G3) and a one-frame sampling offset (N4). Neither tab logged a console error.
- **Prompt.** 221 / 220 / 228 / 227 words (both-spring, both-ease, distance-spring, distance-ease). No blocked words, no em dashes, tags and code backticked, route-labelled, values only. Self-contained except S1.
- **Content.** Definition, 87 characters: keep. The description covers distance or velocity, the flick, the velocity carry, the full slide and the non-gesture route. Use and avoid are concrete. Aliases are unique (lint). Related slugs exist. `confusedWith: drag-with-momentum` is declared here only, with the brief's line.
- **Legibility.** Hint and labels `text-ink-muted`: 6.26:1 light, 7.41:1 dark, entry and card. The Dismiss icon is 6.54 / 6.98.
- **Card.** 0 buttons and 0 focusables. Labels sit above the frame. Loop: drag and spring back, flick, `closed`, re-enter in about 380ms. Under reduced motion the labels (y 327 to 342) clear Play (446 to 478). The sidebar glyph (`g-swipe`, clipped) runs only when active and stops under reduced motion. It reads as a nudge back, then a flick out of the clip, then a fade back.
- **Console.** No errors in any run: light, dark, 375, reduced motion, scratch pages.

### Feel notes

- The follow is exact and the drag feels held: no lag, no resistance, and the cursor goes from grab to grabbing.
- The spring back (0.5, bounce 0) settles in about 420ms with no wobble. The exit (0.3) clears the width in about 170ms. For a swipe this is the right weight, quicker than the return, and the full slide reads as "thrown away".
- The velocity hand-off is felt as continuity, not speed. At real flick speeds the stiff exit spring dominates, so a harder flick leaves only ~8ms sooner. The Ease-out option is actually the faster exit (past the width at ~115ms) and kicks from the hand's 1 px/ms to 5.5 px/ms, which is the visible "disconnected" moment. On the card the threshold contrast reads (flick leaves vs flick springs back), and the release contrast is subtle at card size. Both are fine, because the labels name it.
- 0.1 px/ms over a 100ms window is permissive: 10px of movement in the last 100ms dismisses. A drag that is still drifting at release leaves, and only one that stops comes back. That is Emil's number, and the demo's cycle stops its slow drag (easeInOut ends at about 0.04 px/ms), so the lesson holds. Lucas may want to feel it on a phone before publishing.
- The keyboard Dismiss looks the same as the gesture's exit, and the focus ring on the frame is clear without being loud.

Screenshots: `.superpowers/review-swipe-to-dismiss-light.png`, `.superpowers/review-swipe-to-dismiss-dark.png` (1280 × 1000, at rest after the entry cycle).
