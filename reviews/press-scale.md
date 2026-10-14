---
verdict: pass
reviewedAt: 2026-10-13
approved: true
approvedBy: Lucas Lima
approvedAt: 2026-10-14
---

# Review: press-scale

## Round 3

Scoped re-review at `c87eb6a` (branch `batch-7`) against round 2 findings R2-1 and R2-2 and `batch-7-fixes-2.md` items 8 to 11. I did not write this entry.

What I checked: the fix commit's diff (`press-scale.tsx`, `batch-7.spec.ts`) and the current source, at all 6 combinations (0.97 / 0.95 / 0.90 × Glide / Snap), in four places. (1) The live demo on :3200: the on-page prompt equals the source's prompt, and all 8 acceptance items are on the page. (2) The CSS tab, verbatim with its markup comment and a `data-still` twin, with no stylesheet beyond `body { margin: 40px }`. (3) The Motion tab, verbatim, bundled with esbuild against React 19.3 and Motion 14.1.0, with a `still` twin. All 6 pass `tsc --strict`, and a deliberately broken one fails. (4) A CSS build I wrote from the 0.95 / Glide prompt alone, without reading the tab. Every surface was sampled with a plain rAF loop started from a window capture `pointerdown` listener, the way a tester would. That sampler runs before Motion's own frame callback, so it sees Motion's writes one frame late.

**Verdict: fail.** R2-1, R2-2 and item 10 are fixed, and the prompt is clean at all 6. Item 11 is not. It added an absolute 0.025 step bound that is false at 0.90 on the demo and on both tabs, where round 2's wording was true (R3-1). It also gave Motion a two-frame allowance under reduced motion but not on the Snap lines, which the Motion tab misses by the same one frame (R3-2). Both are acceptance edits, with no code or demo change needed. Three nits. Approval stays with the owner.

### Round 2 findings and fix items

| # | Status | Evidence |
|---|---|---|
| R2-1 / fix 8, Motion `still` at Snap | **fixed** | The tab ships `transition={{ duration: 0, backgroundColor: { duration: 0.15 } }}`, with a comment that says why. Built verbatim, the `still` button at Snap goes rgb(240) → rgb(224) with 7 in-between frames, at the end colour in 139 / 143 / 133ms (0.97 / 0.95 / 0.90). It comes back with 7 in-between frames in 135 / 137 / 142ms. `transform` stays `none` in every frame. The primary still snaps: 0 in-between frames, press and release. The prompt's Motion line and the Snap acceptance line both carry the new prop. |
| R2-2 / fix 9 | **fixed** | The description and the third useWhen both end "still over 44px while pressed at 0.97". On the live page that string appears twice, and the unscoped form appears 0 times. |
| fix 10, prompt test | **fixed** | The hit line now says: the button `position: relative`; its `::after` has `content: ""`, `position: absolute`, `inset: 50% auto auto 50%`, `translate: -50% -50%`, and `width` and `height` `max(100%, 46px)`. The `:active` bullet now opens "CSS route:". The opt-out says "over 150ms `ease`". The reduced-motion line says "repeated for `[data-still]`". That repeat is needed: `.button[data-still]` (0,2,0) would beat a bare `.button` reset. My build from the 0.95 / Glide prompt alone matches the tab rule for rule. One choice is inferred, not stated: the opt-out transition goes on the `[data-still]` base rule. The reduced-motion repeat implies it. Measured on my build: `::after` 46 × 46. Probes 20 and 21px above and below the centre return the button at rest and pressed (44.07 × 19.95 box). The opt-out goes rgb(240) → rgb(224) in 131ms with 6 in-between frames, and `scale: none` holds in every frame. Under reduced motion: press and release in the first frame, the colour instant, and `transition: none` on both buttons. The CSS tab also now uses `inset: 50% auto auto 50%`, and its `::after` measures 46 × 46. |
| fix 11, reduced motion | **fixed** | "within two frames of `pointerdown` (CSS: the first frame)". The plain rAF sampler sees CSS in frame 1 at all 6 combinations, press and release. It sees Motion in frame 2 at all 6, press (18 to 33ms) and release (18 to 32ms), with 0 in-between frames. The demo is in frame 1. |
| fix 11, step bound | **open**, see R3-1 | 0.025 holds at 0.97 and 0.95 and fails at 0.90. |

### New in round 3

| # | Severity | Before | After |
|---|---|---|---|
| R3-1 | should fix | Glide acceptance: "Released 50ms into the press … no frame step larger than 0.025 in `scale`". At 0.90 the turn-back's largest step is 0.041 to 0.043 on the CSS tab, 0.033 to 0.036 on the Motion tab and 0.041 on the demo (3 runs each, released at 52 to 66ms). The press's own first step is 0.044 on CSS and on the demo. A correct 0.90 build fails the line, and round 2's relative wording passed there. At 0.97 the largest step is 0.013, and at 0.95 it is 0.021 on CSS and 0.020 on Motion, so those pass. | Scale the bound to the travel: "no frame step larger than (1 − s) / 2", or print the number per amount: 0.015 / 0.025 / 0.05. Every surface clears it at all 3 amounts: 0.0138, 0.0219 and 0.0437 at most. |
| R3-2 | should fix | The Snap lines say the scale is the target "in the first frame after `pointerdown`" and 1 "in the first frame after `pointerup`", on both routes. On the plain rAF sampler, the Motion tab is at the target in frame 2 at all 3 Snap combinations (frame 1 still reads 1), and back at 1 in frame 2. This is the callback order that fix 11 allowed for under reduced motion. The CSS tab and the demo are in frame 1. | Use the reduced-motion wording on both Snap lines: "within two frames of `pointerdown` (CSS: the first frame)", and the same for `pointerup`. |
| R3-3 | nit | The opt-out line says "over 150ms `ease`" for `data-still` (CSS) and the `still` prop (Motion). The Motion tab sets no colour easing. At Glide the colour inherits the house `[0.23, 1, 0.32, 1]`: visibly done in about 88ms with 4 in-between frames, half the change by about 20ms. At Snap it gets Motion's default tween. Neither is CSS `ease`, and `ease` is not a Motion easing name. The acceptance only says "over 150ms", so it passes. | Scope it: "over 150ms (`ease` in CSS)". Or give Motion's colour `ease: [0.25, 0.1, 0.25, 1]` in the prompt and the tab. |
| R3-4 | nit | Snap, reduced motion: the CSS tab's media block drops the opt-out fade, so the colour is instant. The Motion tab has no `useReducedMotion` at Snap, so its new 150ms colour fade keeps running (7 in-between frames). The Snap prompt says "as shipped, the pressed scale with no transition". The demo's opt-out row also fades for 150ms under reduced motion (9 in-between frames) on every combination, while the prompt's Glide line says to drop "the colour one too". The demo's fade predates this round. | Say which one is meant. Either the Motion tab also drops the colour fade under reduced motion at Snap, or the Snap reduced-motion line names the colour fade. Optionally, drop the demo row's colour transition under reduced motion too. |
| R3-5 | nit | e2e: `not.toContainText(/\bso\b/)` is sound. A string gets trimmed to "so", which matches "absolute" (now in the hit line), so the regex is needed. But it is case-sensitive and only runs at the default combination. My check with `/\bso\b/i` finds no match at all 6. | `/\bso\b/i`, run at all 6 combinations (or in the term lint). |

### Regressions (none in code or demo)

| Combination | Live demo: press / release (in-between frames) | Early release: lowest value; largest step on the way back | CSS tab press / release | Motion tab press / release |
|---|---|---|---|---|
| 0.97 Glide | `scale 0.15s cubic-bezier(0.23, 1, 0.32, 1)`; 98 / 96ms (4 / 4); never past | demo 0.9782, 0.0123; CSS 0.9737 to 0.9782, 0.0127; Motion 0.9730 to 0.9749, 0.0105 | 95 / 92ms | 103 / 101ms |
| 0.97 Snap | `scale 0s`; frame 1 / frame 1, 0 in-between | jumps | frame 1 / frame 1 | frame 2 / frame 2 (R3-2) |
| 0.95 Glide | 116 / 102ms (5 / 5) | demo 0.9561 to 0.9637, 0.0213; CSS 0.9637, 0.0206; Motion 0.9548 to 0.9572, 0.0195 | 117 / 110ms | 115 / 110ms |
| 0.95 Snap | frame 1 / frame 1 | jumps | frame 1 / frame 1 | frame 2 / frame 2 |
| 0.90 Glide | 116 / 103ms (5 / 5) | demo 0.9273, **0.0411**; CSS 0.9123 to 0.9273, **0.043**; Motion 0.9106 to 0.9142, **0.0355** (R3-1) | 103 / 114ms | 126 / 121ms |
| 0.90 Snap | frame 1 / frame 1 | jumps | frame 1 / frame 1 | frame 2 / frame 2 |

"Lowest value" is how far the press got before it turned back. None reaches the target, and none passes 1 on the way back.

- **Size and origin.** `offsetWidth`/`offsetHeight` stay the same in every frame: 128 × 40 live, and 46 × 21 (CSS) or 46 × 46 (Motion) on the tabs. `transform-origin` is the centre.
- **Hit area.** Live `::after` 128 × 46. The 21px and 20px probes return the button at rest at all 6, on all three surfaces. Pressed, they also return it at 0.97 and 0.95. At 0.90 pressed, 21px below misses on both tabs and 20px returns it, as the line allows. On the demo, 21px still lands.
- **Keyboard.** CSS tab: Space held → target, Enter held → 1. Motion tab: Enter held → target, Space held → 1. That holds at all 6. Each key fires exactly 1 click. The demo presses on both keys (unchanged, and not a route).
- **Opt-out.** Live: `lab(100)` → `lab(84.92)` and back, with `scale` and `transform` `none` in every frame, at all 6. CSS tabs: rgb(240) → rgb(224) in 118 to 130ms with 6 in-between frames, at all 6.
- **Reduced motion, live.** At rest: `scale: none`, 0 animations, Play button present. A visitor's press at 0.97 Glide and at 0.90 Snap reaches the target in frame 1, with 0 in-between frames.
- **Cycle and card.** The entry cycle presses at about 690ms, releases at about 1225ms, then rests (`taken-over` false), in light and dark. The card button is 120 × 36. It presses at about 550ms, about 3720ms and about 6875ms, a period of about 3.17s, in light and dark.
- **Visual.** At 375, `scrollWidth` is 375 in light and dark. The 1280 light and 375 dark screenshots look right. No console errors or warnings on the entry, `/`, 375, or any of the 13 scratch pages.
- **Prompt.** 199 / 192 (0.97 Glide / Snap), 202 / 195 (0.95), 201 / 194 (0.90) words, all ≤230. No blocked words, no em or en dashes, no "so" (case-insensitive) and no "which". Every selector, property, prop and value is backticked. It is still terse: the 10 to 18 extra words over round 2 go to the `::after` spec, the "CSS route:" scope, `ease` and the `[data-still]` repeat.
- **Not re-run.** The e2e, since it starts a server on 3100. The spec's new strings match the source at the default and Snap combinations.

## Round 2

Scoped re-review at `5f241c8` (branch `batch-7`) against round 1 findings 1 to 10 and `batch-7-fixes.md` items 1 to 11. I did not write this entry.

What I checked: the source, the fix commit's diff (`press-scale.tsx`, `globals.css`, `batch-7.spec.ts`), and all 6 combinations (0.97 / 0.95 / 0.90 × Glide / Snap) in three places. (1) The live demo on :3200, which serves this commit: the on-page prompt equals the source's prompt at all 6. (2) The CSS tab, pasted verbatim with its markup comment and a `data-still` twin, with no stylesheet beyond `body { margin: 40px }`. (3) The Motion tab, verbatim, bundled with esbuild against React 19 and Motion 14.1.0, with a `still` twin. Scale was sampled every frame. I also probed the hit area with an `elementFromPoint` scan in 0.05px steps, at rest and pressed, and checked keyboard Space and Enter held with a click counter, the opt-out colour, reduced motion, the card on `/` in both themes, 375 in both themes, and CDP touch.

**Verdict: pass.** Both gates are fixed. Every claim about the keyboard and the hit area is now true, on the demo and on both tabs, at all 6 combinations. One new should-fix is open: in the 3 Snap combinations, the Motion opt-out jumps instead of taking 150ms (R2-1). The fix is one line. Approval stays with the owner.

### Round 1 findings

| # | Status | Evidence |
|---|---|---|
| 1 (gate) keyboard | **fixed** | Prompt: CSS route "the pointer, and Space held (Enter clicks with no press)", Motion route "the pointer, and Enter held (not Space)". The acceptance is scoped per route, and the a11y note and both tab comments say the same. Verbatim tabs, all 6: **CSS** Space held → `scale` at the target (0.97/0.95/0.9), Enter held → `none`. **Motion** Enter held → matrix at the target, Space held → `none`. On both routes the other key still clicks (1 click: Enter on keydown, Space on keyup), and `keyup` releases. Same result under reduced motion. Neither tab has a key handler. The demo still presses on both keys, and its comment says it is not a route. |
| 2 (gate) hit area | **fixed** | `hit` is now `max(100%, var(--hit, 44px))`. The primary button sets `[--hit:46px]`, and its computed `::after` is 128 × 46. The scan reads about 0.9px over the true size, the same offset at rest. Measured height, live and on both tabs: rest 46.9 (46); pressed 45.55 (44.6) at 0.97, 44.65 (43.7) at 0.95, 42.35 (41.4) at 0.90. The prompt states 44.6 / 43.7 "about 44" / 41.4 "under 44". The acceptance probe at 21px above and below (edges exclusive) passes at rest at all 6, and pressed at 0.97 and 0.95 on the demo, CSS and Motion. At 0.90 pressed, 20px returns the button and 21px misses below on both tabs, as the line allows ("21px need not"). On the demo 21px still lands from pixel snapping. The description, useWhen and a11y no longer say it never shrinks. The e2e adds a 0.90 test (21px at rest, 20px pressed). The default 44px is unchanged for the other terms. |
| 3 Motion `still` | **fixed (Glide) / open at Snap**, see R2-1 | `whileTap={still ? { backgroundColor: pressed } : { scale }}` with an inline `#f0f0f0`. Glide: rgb(240) → rgb(224) in about 90ms of visible change (3 to 4 in-between frames), back in about 80ms, and `transform` stays `none` in every frame. Snap: the colour jumps (0 in-between frames), because `transition={{ duration: 0 }}` applies to every value. |
| 4 `--button-pressed` | **fixed** | Defined in the tab's `:root` as `#e0e0e0`, and named in the prompt's opt-out line. With no stylesheet the `data-still` twin goes rgb(240) → rgb(224) over about 120ms (6 in-between frames) at all 6, not to transparent. The "No CSS transition" clause is now scoped to `scale`. |
| 5 `whileTap` end | **fixed** | "ends on pointerup anywhere or pointercancel". This matches `motion-dom` `press/index.mjs` (window capture listeners). |
| 6 card size | **fixed** | The card button measures 120 × 36 (`offsetWidth`/`offsetHeight`), 116.4 × 34.9 pressed: 1.8px per side against the entry's 1.9. At 2x, the rest and pressed frames show a visible inset in both themes. It now reads as a small press, not a flicker. The loop runs about every 3.17s in light and dark, with no console errors. |
| 7 "why" clauses (fix item 8) | **fixed** | The prompt has no " so " and no "which" at any of the 6. "(cartoon)" and "(both directions)" are left as values. The e2e asserts `not.toContainText(' so ')`. The tab comments keep their reasons, which is right for code. |
| 8 `style` merge (fix item 9) | **fixed** | `style={{ ...box, backgroundColor: still ? surface : undefined, ...style }}`, so the caller's style wins key by key. `tsc --strict` passes on all 6 tabs, and a deliberately broken caller (`still="no"`) fails, so the types resolve. |
| 9 double "so" (fix item 10) | **fixed** | "declared on the base rule, so it runs both ways: a quick tap …". |
| 10 dark controls (fix item 11) | **kept, agreed** | Dark: wells are `lab(5.7)` on a `lab(13)` frame and press to `lab(21.1)`, unchanged. Lifting them is not cheap. The next token up, `demo-2`, is both the dot and the pressed colour, so a lift needs a new token or a new pressed colour. The press is still a clear step. Enter and Exit (E11) and Swipe (N3) keep the same recessed surface. Keeping it is consistent with both. |
| fix item 7, reduced motion | **fixed** | The acceptance now says "within one frame of `pointerdown` (CSS: the first frame)". Read after each frame's rAF callbacks, both tabs reach the target, and 1 on release, in the first frame (4 of 4 runs, CSS and Motion, Snap and reduced-motion Glide). A plain rAF sampler sees Motion one frame late because of callback order, and the wording covers that. The Snap lines' "first frame" holds on the same read. |

### New in round 2

| # | Severity | Before | After |
|---|---|---|---|
| R2-1 | should fix | At Snap (0.97/0.95/0.90), the Motion tab's `still` button jumps to `#e0e0e0` and back (0 in-between frames, 18 to 31ms) because `transition={{ duration: 0 }}` covers `backgroundColor`. The prompt's opt-out line ("over 150ms") and the acceptance ("changes only its colour, to `#e0e0e0`, over 150ms") say otherwise. The CSS tab does take 150ms at Snap. | Give the colour its own transition at Snap: `transition={{ duration: 0, backgroundColor: { duration: 0.15 } }}`, and say it in the Motion line. Or scope the acceptance: "Motion at Snap: it jumps". |
| R2-2 | nit | The description and the third useWhen say the hit area "is still over 44px while pressed", unscoped. At 0.95 it is 43.7. The a11y note and the prompt scope it correctly ("at 0.97", "about 44"). | Add "at 0.97" to both. |

Not counted against the entry: in Motion 14.1.0, an Enter press on one `whileTap` element leaves a blur listener behind. It fires a bubbling `pointercancel`, so the next pointer press on another `whileTap` element that takes focus ends at once. I saw it on the Motion tab when the `still` twin was pressed after an Enter press on the primary. This is library behaviour (`press/utils/keyboard.mjs`), not the tab's.

### Regressions (none)

| Combination | Live: pressed / within 0.001 / release within 0.001 | Early release (about 55ms) | CSS tab | Motion tab |
|---|---|---|---|---|
| 0.97 Glide | `transition: scale 0.15s cubic-bezier(0.23, 1, 0.32, 1)` at rest and pressed; 4 in-between; 96ms; 86ms; never past | turns back at 0.9782, max step 0.0131, at 1 in 54ms | 90 / 93ms, turns back at 0.9782 | 95 / 98ms, turns back at 0.975 |
| 0.97 Snap | 0s; first frame; 0 in-between | jumps | 14 / 11ms | first frame (post-rAF read) |
| 0.95 Glide | 5 in-between; 113ms; 112ms | 0.9637, at 1 in 59ms | 112 / 105ms | 108 / 104ms |
| 0.95 Snap | first frame | jumps | first frame | first frame |
| 0.90 Glide | 5 in-between; 115ms; 106ms | 0.9123, at 1 in 79ms | 114 / 103ms | 128 / 122ms |
| 0.90 Snap | first frame | jumps | first frame | first frame |

- `offsetWidth`/`offsetHeight` stay 128 × 40 in every frame, and `transform-origin` is `64px 20px`. The labels match the controls.
- **Opt-out row.** `scale: none` and `transform: none` in every frame at all 6, with the colour step `lab(100)` → `lab(84.9)` in light and `lab(5.7)` → `lab(21.1)` in dark.
- **Gesture.** A CDP touch press goes to 0.97 and back. A vertical touch swipe scrolls 185px and releases. Tab while holding Space releases. The demo's gesture code is unchanged since round 1 (only a comment changed).
- **Reduced motion.** At rest nothing runs (0 animations). A visitor's press computes `transition-property: none`, 0.97 in the first frame and 1 in the first frame after release, with 0 in-between. "Play Press Scale demo" plays once with the glide (12 in-between frames).
- **Cycle and card.** The entry cycle runs once and rests. The card presses at +500ms, releases 400ms later and loops about every 3.17s, in light and dark.
- **Visual.** At 375, `scrollWidth` is 375 in light and dark. Contrast: label, hint and controls 5.75 to 6.31:1 in light, 7.14 to 7.39:1 in dark. No console errors on the entry, `/`, touch or the 24 tab pages (the only warning is my own canvas probe).
- **Tabs.** All 6 Motion tabs pass `tsc --strict`. All 6 CSS tabs run with no stylesheet. Their timing matches round 1.
- **Prompt.** 172 / 181 (0.97 Snap / Glide), 175 / 184 (0.95), 174 / 183 (0.90) words. No blocked words, no em dashes, and every selector, property and prop in the prompt and acceptance is backticked.
- **Not re-run.** I did not run the e2e, since it starts a server on 3100. The spec's new assertions match the strings and values above.

## Round 1

Layer-3 craft review of `src/terms/press-scale.tsx` at `e371acd` (branch `batch-7`). I did not write this entry.

What I checked:

- The source and the builder's report, against `docs/house-rules.md`, spec §4–§8 and emil-animations (patterns.md Press Feedback, techniques.md 44px hit area).
- The live review build on :3200 (Chromium 156 through Playwright 1.64). I covered all 6 combinations (amount 0.97/0.95/0.90 × Glide/Snap), each one sampled every frame from `pointerdown`/`pointerup`. I also covered an early release at about 50ms, mouse, CDP touch (press, plus a vertical swipe), keyboard Space and Enter held, Tab while holding, Replay, reduced motion (rest, visitor press, Play), the card on `/` (7s of the loop), 1280 and 375px in light and dark, contrast and console errors.
- The CSS and Motion tabs at all 6 combinations, pasted verbatim into scratch pages with no stylesheet beyond `body { margin: 40px }`. CSS uses the tab's markup comment, with a `data-still` twin. Motion was built with esbuild against React 19.3 and Motion 14.1, with a `still` twin. The Motion tabs pass `tsc --strict`, and a deliberately broken file fails, so the types resolve. I measured them the same way, with and without reduced motion.

**Verdict: fail.** The motion is right: computed values, the glide both ways, the turn-back, Snap, reduced motion, the opt-out row and the cycle all pass. Two claims the lesson rests on are false, though, and the copy-ready tabs fail their own checklist on them: what the keyboard does, and that the hit area does not scale.

## Findings

| # | Severity | Before | After |
|---|---|---|---|
| 1 | **gate** | Prompt (l.435), CSS tab (l.332) and a11y say `:not(:disabled):active` "fires for the pointer and for keyboard Enter and Space". Acceptance (l.462): "Held with Space or Enter … it is pressed the same way" on both routes. Measured on the verbatim tabs: **CSS, Enter held → `scale` stays `none`** (Chromium does not apply `:active` for Enter; it clicks on keydown). **Motion, Space held → `transform` stays `none`** (`motion-dom` `press/utils/keyboard.mjs` filters on `key === "Enter"` only). Each tab fails the keyboard line on a different key. The demo presses on both keys through JS (l.216–225), so it shows something neither tab does. | Make the claim true per route. Either (a) say it as it is: CSS `:active` covers the pointer and Space held, and Enter activates on keydown with no press; Motion `whileTap` covers the pointer and Enter, not Space. Then scope the acceptance line per route. Or (b) make both keys press on both routes (CSS: set `data-pressed` on Enter keydown and clear it on keyup or blur; Motion: the same for Space) and ship that code in the tabs. Fix the a11y sentence to match. |
| 2 | **gate** | Description (l.410) "Only the visual scales; the hit area stays where it was and at least 44px". useWhen (l.414) "the visual scales, the hit area does not". a11y (l.471) "never scale it … scale only the visual". Prompt and tabs: "the scale is on the button, so only the visual moves". The `::after` (and in the Motion tab the button's own 44px box) is **inside the scaled element, so it scales with it**. Pressed, the hit area measures 42.7px at 0.97, 41.8px at 0.95 and 39.6px at 0.90. Acceptance (l.461) "`elementFromPoint` 22px from its centre in any direction still returns the button" **fails on the demo and on both tabs even at rest** (bottom and right edges are exclusive: demo probes up/down/left/right at 22px read `1011` at rest, and `0011` pressed). At 0.90 pressed, 21px fails too (`0011`). The builder's e2e probes 21px above the centre at 0.97 only (batch-7.spec.ts:236), which hides this. | Pick one and say it everywhere. (a) Keep Emil's recipe (scale on the button) and state the truth: the hit area is ≥44px at rest and scales with the press (42.7px at 0.97). If 44px must hold while pressed, size the `::after` to `max(100%, 46px)` (covers 0.97 and 0.96). (b) Scale an inner face (`.button:active > .face { scale }`, Motion `whileTap="pressed"` with `variants` on a `motion.span`), so the button and its `::after` never move. Then make the acceptance probe "21px from its centre" (or "inside a 44 × 44 box, edges exclusive") and say whether it holds at rest or while pressed. Extend the e2e to 0.90. |
| 3 | should fix | Motion tab: `whileTap={still ? undefined : …}`. A `still` button gets **no feedback at all** (measured: 1 background value across the press). Prompt l.437 says the opt-out gets `background-color` over 150ms on both routes, and acceptance l.463 says it "changes only its colour". | Give `still` a colour press, e.g. `whileTap={still ? { backgroundColor: pressed } : { scale }}` with an inline resting `backgroundColor`, or say the Motion opt-out has no feedback and scope the acceptance line. |
| 4 | should fix | CSS tab l.346 `background-color: var(--button-pressed)`, and `--button-pressed` is never defined. With no stylesheet, the pressed `data-still` button fades from `rgb(240,240,240)` to **transparent**. The prompt names no pressed colour either. | Define it in the tab's `:root` (one grey step darker than the resting surface) and name the value, or the rule, in the prompt's opt-out line. |
| 5 | should fix | Motion tab comment (l.392): "`whileTap` … ends when the pointer leaves or is cancelled". Motion ends the press on `pointerup` anywhere (window, capture phase) or `pointercancel`, not on leave (`motion-dom` `press/index.mjs`). | "ends on pointerup (anywhere) or pointercancel". |
| 6 | should fix | Card: the button is 84 × 28px, so the house 0.97 press is **1.26px per side and 0.84px vertically**. At card size it reads as a twitch, not a press. The entry button (128 × 40, 1.9px per side) reads. | Make the card button about 120 × 36 (the 220px frame has room). It stays the house value and gets about the entry page's travel. |
| 7 | nit | Prompt register carries "why" clauses the published prompts don't: "so press and release both glide and a release mid-press turns back from where it is" (Glide and Snap), "which starts to read as cartoon", "so the layout box never changes" (false, see 2). | Cut to values: "on the base rule (both directions)". |
| 8 | nit | Motion tab: `style={box}` comes before `{...rest}`, so a caller's `style` replaces the whole box (hit size, origin). | Merge: `style={{ ...box, ...rest.style }}`, or destructure `style`. |
| 9 | nit | Description: "declared on the base rule so it runs both ways, so a quick tap …" (two "so"s in a row). | "declared on the base rule, so it runs both ways: a quick tap …". |
| 10 | nit | Dark theme: the dense-row controls are `lab(5.7)` wells on a `lab(13)` frame, and the dot is `lab(~21)`, so the row is dim. The press lightens a control to `lab(21)`, which is visible. In light the controls are raised white keys. | Optional: give the dark controls a surface one step above the frame, so the row reads as keys in both themes. |

## Measured

**Live demo (entry, 1280, light).** Computed `transform-origin: 64px 20px` (centre); `offsetWidth`/`offsetHeight` stay 128 × 40 throughout.

| amount / release | rest `transition` | pressed | within 0.001 of target | release, within 0.001 of 1 | early release (≈50ms) |
|---|---|---|---|---|---|
| 0.97 / Glide | `scale 0.15s cubic-bezier(0.23, 1, 0.32, 1)` (same pressed) | 0.97, 4 in-between frames, never past | 88ms | 97ms, never past | turns back at 0.9782, max step 0.0131 (= the press's own first step), at 1 in 57ms |
| 0.97 / Snap | `scale 0s` | 0.97 in the first frame | 11ms | 15ms, 0 in-between frames | jumps |
| 0.95 / Glide | 0.15s | 0.95, 5 in-between | 114ms | 100ms | turns back at 0.9636, at 1 in 61ms |
| 0.95 / Snap | 0s | first frame | 7ms | 6ms | jumps |
| 0.90 / Glide | 0.15s | 0.90, 5 in-between | 116ms | 111ms | turns back at 0.9273, at 1 in 59ms |
| 0.90 / Snap | 0s | first frame | 14ms | 4ms | jumps |

- **Gesture.** Mouse, CDP touch, and Space/Enter held all press and release. A vertical touch swipe scrolls 185px and ends the press. Tab while holding Space releases. Dragging off and releasing outside releases (capture). Right-click doesn't press. Focus ring: 2px solid accent, 2px offset. No text selection during the touch press.
- **Opt-out row.** `scale: none` and `transform: none` in every frame. `background-color` 150ms `ease`: light `lab(100)` → `lab(84.9)`, dark `lab(5.7)` → `lab(21.1)`. It reacts to Space too.
- **Cycle.** On the entry page it presses at +505ms, releases at +407ms after the press, and plays once, then rests. The card loops every ~3.17s (500 / 400 / 150 / 900 + runtime hold) in both themes. Replay hands the stage back (`taken-over` false, cycle presses again).
- **Reduced motion.** At rest, nothing runs and the button is at rest. A visitor's press computes `transition-property: none` (duration stays 0.15s), 0.97 in the first frame, 1 in the first frame after release, 0 in-between frames. "Play Press Scale demo" plays once with the glide (12 in-between frames). This is the right reading of house rules: Play is "plays once when asked", and the visitor's press shows what the recipe ships under reduced motion. That is the same pattern Duration and Swipe use. The brief allowed "keep the scale, drop the transition: pick and say", and the acceptance line tests exactly that observable. The verbatim tabs pass it too (CSS 13ms, Motion 30ms to the pressed value, 0 in-between).
- **Verbatim tabs, non-keyboard lines.** The CSS tab matches the demo's curve (0.97: 85ms in, 93ms out, early release turns back at 0.9782). The Motion tab is 95ms in and 96ms out, and an early release turns back at 0.9729, at 1 in 95ms. Snap is a first-frame jump on both. `tsc --strict` passes at all 6.
- **Visual.** Labels `text-ink-muted`: 6.31:1 light, 7.39:1 dark (caption, hint, control labels 5.75–7.39). 375px: `scrollWidth` 375 in both themes. No console errors in any run. The glyph (`g-press`, scale 0.82 from centre, `transform-box: fill-box`) runs only when `data-active="true"` and is off under reduced motion.

## Content

- **Definition.** "A button shrinks slightly while pressed, so the click feels physical." 69 characters, one sentence. Good.
- **Description.** Correct on amount, floor, curve and both directions. The hit-area sentence is false (2), and there's the double "so" (9).
- **Use / avoid.** Matches emil (not every button, dense and high-frequency UI opts out, never below 0.95, no transition only on `:active`). The third use-when bullet repeats the false hit-area claim.
- **Prompt.** 183–195 words, no blocked words, no em dashes, code backticked at all 6. It names the pressed selector and the `:active` vs `data-pressed` choice. It covers the opt-out and reduced motion per route. The register is a little chatty (7).
- **Acceptance.** Observable with tolerances and zero points (`pointerdown`, `pointerup`, ±1 frame, ±0.002). The hit-area and keyboard lines are false as written (1, 2).
- **Aliases.** Unique.
- **Related.** All resolve. Overshoot (l.371) and Icon Swap (l.565) link back.
- **Sources.** All three return 200. "7 Practical Animation Tips" has the press section ("A scale of `0.97` on the `:active` pseudo-class should do the job"). "You Don't Need Animations" names the "subtle scale down effect when pressing a button" as purposeful animation. Motion's gestures page covers `whileTap`. All three are on topic.

## Feel notes

On the entry page, 0.97 with Glide feels right. The press is quick (front-loaded `--ease-out`, visually done by about 60ms), and letting go early turns back with no hitch. Snap clicks hard next to it, and 0.90 is plainly a toy, so the controls teach the difference. The dense row's colour-only press makes the opt-out legible. On the card, 0.97 is a 1px flicker (6). The 400ms hold is long enough at entry size; at card size the travel is too small for any hold to help.
