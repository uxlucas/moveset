---
verdict: pass
reviewedAt: 2026-10-13
approved: true
approvedBy: Lucas Lima
approvedAt: 2026-10-13
---

# Review: icon-swap

## Round 3

Scoped gate check of the second fix round (`cdbe781`, items 1–7 of `batch-6-fixes-2.md`). I did not write the fixes.

What I checked:

- `git show cdbe781 -- src/terms/icon-swap.tsx`, then the current source.
- All 18 combinations re-dumped: prompt, acceptance and both tabs. The 18 Motion tabs were built verbatim (esbuild, React 19.3, Motion 14.1, lucide from the worktree) on a page with no stylesheet beyond `body { margin: 40px }`. They pass `tsc --strict` (TypeScript 5.9.3). A deliberately broken file failed first, so the type paths resolve. The 18 CSS tabs were built from the tab's stylesheet, with the markup and click behaviour from its comment.
- The unmount case on a development build of the copy tab (with and without `StrictMode`), with `setTimeout`/`clearTimeout` wrapped to track the 1.5s timer.
- The live review build on :3200 at all 18 combinations, plus interruption, first paint, reduced motion, the card on `/`, 375px in both themes, the site's copy button and console errors.
- `npx vitest run`: 14 files, 151 tests pass, content lint included.

**Verdict: pass.** The gate is closed. Pasted as given, with no stylesheet and no Tailwind, the Motion tab works at every combination: the button stays 44×44, the two icons are 0.00px apart, `popLayout` pops the leaving span, the scale shows, the status text is hidden, and the timer clears on unmount. Items 3–7 are in the prompt and acceptance at all 18 combinations, and nothing regressed.

### The gate, measured (Motion tab, verbatim, no stylesheet)

| Combination | Button | Icon centres | Leaving span | Incoming svg box at its smallest | Incoming settled (from first frame with `opacity` > 0) | Reduced motion |
|---|---|---|---|---|---|---|
| copy / 0.3 / blur | 44×44 constant | 0.00px | `position: absolute`, `data-motion-pop-id` set | 4.8px (scale 0.30) | 232ms, max scale 1.000 | `transform` and `filter` `none` on every frame, 10 in-between frames |
| play / 0.8 / no blur | 44×44 constant | 0.00px | popped | 12.8px (scale 0.80) | 234ms, max scale 1.000 | same |
| heart / fade / no blur | 44×44 constant | 0.00px | popped | 16px (opacity only) | 234ms | same |
| the other 15 | 44×44 constant | 0.00px | popped | 4.8 / 12.8 / 16px by depth | the exit span unmounts at 366–367ms everywhere | copy / fade / blur also checked: `none` / `none` |

- **Spans:** the `motion.span` computes `display: grid` at every combination. On load there are 0 animations and 1 span.
- **Copy status:** `<span role="status" style={hiddenText}>` computes `position: absolute`, 1×1, `overflow: hidden` and `clip-path: inset(50%)`. A screenshot taken while it reads `Copied` shows only the button, with no text, and the page does not scroll sideways.
- **Revert:** the status clears at 1.5s. A second click at 900ms moves the revert to 2433ms and changes nothing visible (one span throughout). `aria-label` stays `Copy`.
- **Unmount mid-revert:** I clicked, unmounted at 500ms, then waited 1.6s. The 1500ms timer is `cleared: true, fired: false`, with or without `StrictMode`, and the console is empty. As a control, the same timer with no unmount fires. React 19 does not warn about this either way, so the timer record is the evidence that matters.

**Pasted as given with no stylesheet, does it work? Yes.** The tab needs only React, Motion and lucide. The box and the hidden text are inline style objects (`inlineSize`/`blockSize` pass the lint), so neither Tailwind nor a hand-written `.icon-button` is assumed any more. Both round-2 nits are fixed along with it.

### Items

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Motion tab box (gate) | fixed | `const box = { position: 'relative', display: 'grid', placeItems: 'center', inlineSize: 44, blockSize: 44 }` on the button and `style={{ display: 'grid' }}` on the `motion.span`. Measured above. The prompt's Motion route says "one `motion.span`, `display: grid`". |
| 2 | Copy status and timer | fixed | Inline `hiddenText`, and `useEffect(() => () => clearTimeout(timer.current), [])`. Measured above. |
| 3 | In-flow icon, layered size, `data-on` off | fixed | All 18 say "the first state's in flow, the other `position: absolute; inset: 0; margin: auto; width: 16px; height: 16px`" and "`data-on="true"` on the button (`"false"` off)". This matches the demo, which writes `"false"`. |
| 4 | Fade-only variants | fixed | `transition-property` in the prompt and the CSS tab names only what changes: `opacity, transform, filter`, `opacity, transform`, `opacity, filter` or `opacity`. No no-blur acceptance mentions `blur(0px)`. For fade / no blur, both the prompt and acceptance say "no `transform` or `filter` transition is declared", and acceptance item 1 adds "transition `opacity` alone". Reduced motion drops only what the variant animates: for fade / blur, `filter: none`, and `useReducedMotion()` drops `filter`. |
| 5 | Copy acceptance split | fixed | "Clicked again while `Copied` is showing, the timer restarts and nothing visible changes; clicked while swapping back, it turns around from where it is with no jump (no frame steps more than the swap's own largest step)." Play and heart keep "mid-swap". The revert is "1.5s (±100ms)". |
| 6 | Settle floor, first animated frame | fixed | "settled (within 0.01) by 300ms (Motion: 350ms) and not before 200ms from the first animated frame (the first frame where the incoming icon's `opacity` is above 0)". It is defined once, and the reduced-motion line reuses it. Measured: the CSS tabs and the demo settle in 248–251ms and Motion in 232–234ms, all inside the window. |
| 7 | Reduced-motion specificity | fixed | Prompt: "CSS: `transform: none; filter: none`, repeating the state selectors (or `!important`), or `[data-on="true"]` wins". The CSS tab's comment says the same, and the tab repeats the selectors. Built, its reduced-motion frames show `transform: none` and a `filter` of `none` or `blur(0px)`. |

### Prompt

The prompt is 206–227 words across the 18 combinations: copy 212–227, play 206–221 and heart 209–224. The longest is copy / 0.8 / blur at 227, under the 230 limit. It is terse and labelled by route. No blocked words appear in the prompt, the acceptance list or either tab (checked with a `\b` regex). There are no em dashes, and `<button type="button">` and `<AnimatePresence …>` are in backticks. The live prompt equals the source at all 18 combinations.

### Regressions

None.

- **Swap timing:** the live demo settles in 248–251ms at all 18 combinations, with `opacity, transform, filter` over `0.3s cubic-bezier(0.25, 0.1, 0, 1)`. The button stays 44×44, the centres are 0.00px apart, the max scale is 1.000, and the captions match the controls.
- **CSS tabs, built verbatim (all 18):** settled in 249–251ms at 44×44, 0.00px apart. Copy reverts 1.5s after the last press. A click during the revert dips to 0.20 and recovers, with a largest step of 0.20. With reduced motion, `transform` is `none` and `filter` is `none` or `blur(0px)`.
- **Interruption:** a live play press at 60, 120 or 200ms peaks at 0.55, 0.85 or 0.96, then only falls, with a largest step of 0.21. A copy press during the revert goes 0.34 → 1.00, with a largest step of 0.19.
- **First paint:** in the first frame `a` has opacity 1, `b` has 0, and there are 0 animations. The first change is the cycle swap at 674ms.
- **Reduced motion:** the still frame shows `playing=false`, 0 animations and a Play button. A press on copy or play gives `transform` `none` or identity, `filter` `blur(0px)`, and 10 in-between frames.
- **a11y:** copy keeps the name `Copy`, and its status reads `Copied`. After a second press at 908ms, it reverts at 2418ms. Play goes `Play`→`Pause`→`Play`. Heart goes `Like/false`→`Like/true`→`Like/false`. Enter and Space both swap it.
- **Card on `/`:** 0 tabbable elements and no status region inside the demo. A click navigates to the entry. It loops, swapping at about 160, 1250, 3960 and 5060ms, and the caption fits on one line.
- **375px:** no horizontal overflow on `/` or the entry, in light or dark.
- **Console:** no errors on any page, in either theme.
- **Site copy button:** the check shows at 12ms and settles 250ms later. The copy icon is back at 1513ms.

## Round 2

Scoped re-review of the fix round (`ede855b`, items 15–25 of `batch-6-fixes.md`, findings 1–11 below). I did not write the fixes.

What I checked:

- `git show ede855b` for `icon-swap.tsx`, `copy-button.tsx`, `house-rules.md` and `batch-6.spec.ts`, then the current source.
- All 18 combinations re-dumped: prompt, acceptance and both tabs. The 18 Motion tabs were built verbatim (esbuild, React 19.3, Motion 14.1, lucide from the worktree) and pass `tsc --strict`. I checked that the type paths resolve by compiling a deliberately broken file first, which failed as it should. The 18 CSS tabs were built from the tab's stylesheet, with the markup and click behaviour taken from its comment.
- The live review build on :3200, sampled every rAF at all 18 combinations. I also checked copy, play and heart semantics, mid-swap presses, keyboard, reduced motion, the card on `/`, 375px, both themes, the glyph at 8×, `/about` sources, the site's copy button, and console errors.
- `npx vitest run`: 14 files, 151 tests pass, content lint included.

**Verdict: fail.** Ten of the eleven findings are fixed or kept as agreed, and nothing regressed. The gate (finding 1) is still open for the Motion tab pasted as given. The prompt now states the box clearly, but the tab only describes it in a comment. Built verbatim, the tab measures exactly as in round 1. The fix is two style props. I built them and they measure clean, and they pass the content lint.

### The gate, measured

| Motion tab build | Button | Icon centres | `popLayout` pops the leaving span | Scale visible (incoming svg box at 0.3 / 0.8) |
|---|---|---|---|---|
| Verbatim (copy/0.3/blur, play/0.8/no-blur, and all 18) | **32×25 → 48×25 → 32×25** | **16.00px apart** | **no**: `position: static`, no `data-motion-pop-id` | **no**: the span is `inline`, and the svg box stays 16px |
| Plus the comment's rule (`.icon-button { position: relative; display: grid; place-items: center }` at 44px) | 44×44 constant | **0.80–1.55px apart**: the icon rests 1.5px above centre | yes | yes: 4.8px / 12.8px |
| Plus `style={{ position: 'relative', display: 'grid', placeItems: 'center', inlineSize: 44, blockSize: 44 }}` on the button and `style={{ display: 'grid' }}` on the `motion.span` | 44×44 constant | **0.00px** | yes | yes: 4.8px / 12.8px |

The 1.5px comes from the span. With the comment's rule, the `motion.span` is a block grid item holding an inline svg, so it is 16×19 (the line box), not 16×16. The svg sits at its top, the scale origin is the span's centre, and the two icons drift apart as their scales diverge. With `display: grid` on the span, or `svg { display: block }` (Tailwind's preflight does this), the span is 16×16 and the gap is 0.00px. Reduced motion is clean on every build: `transform` and `filter` are `none` on every frame, with 10 in-between frames.

**Is a comment enough? No.** Someone who pastes the tab gets a button with `className="icon-button"` and no stylesheet. That is the round-1 failure, frame for frame, and it fails acceptance item 3 ("`offsetWidth` … never change", "boxes coincide"). The lint does not force a comment. It only rejects `width:`/`height:` keys, and `inlineSize`/`blockSize` pass it (checked against `LAYOUT_KEY`). A Tailwind `className="relative grid size-11 place-items-center"` also passes. The tab already assumes Tailwind for `sr-only`, so either way would make it self-contained.

**Does the prompt make the box unambiguous? Yes, for the button.** "The button: `<button type="button">`, `position: relative; display: grid; place-items: center`, 44px square; icons 16px" is shared by both routes, and the Motion route says "in the button". An agent that follows it gets the second row: 44×44, a real pop, a visible scale. The only gap is the span. Outside Tailwind, the icons sit 1.5px high and drift up to 1.55px apart at 0.3. Add "the `motion.span` `display: grid`" to the Motion route: 4 words, which puts the longest prompt at 228.

### Items

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Motion tab layout (gate) | **open** | The tab has the box only as a comment. Verbatim: 32×25→48×25, 16px apart, no pop, scale invisible (table above). The prompt is fixed. Fix: put the two style props in the tab (lint-safe, measured 44×44 / 0.00px / pop / scale) and add "the `motion.span` `display: grid`" to the Motion route. |
| 2 | Copy is not a toggle | fixed | Live: the name stays `Copy`, `aria-pressed` is absent, and the `role="status"` region (always mounted, `sr-only`) reads `Copied` on the press. A second press at 906ms moved the revert to 2414ms (≈ press + 1.5s), and the status then clears. Play goes `Play`→`Pause`→`Play`. Heart goes `Like/false`→`Like/true`→`Like/false`. A press during the revert turns back with no jump: the check goes 0.26 → 1.00, with a largest frame step of 0.18. Prompt per pair: copy "a second click restarts it", play "a second click swaps back", heart "a second click unsets it". Acceptance matches per pair. The CSS tab built from its comment reverts at 1.5s and restarts on a repeat click. |
| 3 | Reduced-motion acceptance | fixed | "`filter` is `none` or `blur(0px)`", "over the route's own duration (300ms CSS, 0.35s Motion), from the first animated frame". The CSS tabs measure `none\|blur(0px)` with blur and `none` without. The demo measures `blur(0px)`. |
| 4 | `[data-on="true"]` | fixed | The demo uses `group-data-[on=true]`. The CSS tab and the prompt say `data-on="true"`. With `data-on="false"` the check's opacity is 0, so a React `data-on={on}` no longer leaves the check showing. |
| 5 | Sources | fixed | `curl -L`: jakub.kr … details-that-make-interfaces-feel-better is 200 and contains "Animate icons contextually". emilkowal.ski/ui/7-practical-animation-tips is 200 and contains "Use blur when nothing else works". motion.dev/docs/react-animate-presence is 200 and contains popLayout. All three are listed on `/about`, and Great Animations is no longer in this term. |
| 6 | Site copy button 0.35 | fixed | `copy-button.tsx:42` uses `duration: 0.35, bounce: 0` and keeps reduced motion at `duration: 0`. On `/terms/duration`, "Copy as prompt" shows the check at 13ms, it settles 250ms later, and the copy icon is back at 1512ms. No errors. |
| 7 | House rules | fixed | Under Properties, `house-rules.md:33`: "Icon swaps start at `scale(0.3)`: a deep scale reads as a swap, 0.8–0.9 reads as a glitch (Icon Swap)." |
| 8 | Glyph diamond | fixed | The rect sits in `<g transform="rotate(45 6 6)">`. Paused at 20%, the rect's transform is `matrix(0.3 …)`. At 70% and 85% it is `none`. The on-screen angle stays 45° throughout. An 8× screenshot shows a diamond. |
| 9 | avoidWhen wording | fixed | "A timid scale (0.8 to 0.9) or none, which read as a glitch or a flicker. Without blur, the two shapes show at once." |
| 10 | Controls at 375 | kept | The segments are still 48px, two-line, the same as Overshoot. Agreed in round 1. |
| 11 | Alias "icon morph" | fixed | It is gone from the aliases and the page. The aliases are unique, and the lint passes. |

### New, from this round

| Sev | Area | Note |
|---|---|---|
| nit | Motion tab, copy | `<span role="status" className="sr-only">` assumes Tailwind, while the button's box assumes a hand-written `.icon-button`. Without Tailwind, "Copied" appears as visible text beside the button. Pick one assumption: Tailwind utilities throughout, or inline styles plus a visually-hidden note. |
| nit | Motion tab, copy | The revert timer is not cleared on unmount. `copy-button.tsx` does this with a `useEffect` cleanup. It is harmless in React 19, so this is optional. |

### Prompt

The prompt is 201–224 words across the 18 combinations: copy 207–224, play 201–218, heart 204–221. It is terse and labelled by route. No blocked words appear anywhere: I checked prompt, acceptance and both tabs with a corrected `\b` regex. There are no em dashes, and `<button type="button">` and `<AnimatePresence …>` are in backticks. The live prompt equals the source at all 18 combinations.

### Regressions

None.

- **Swap timing:** the live demo at all 18 combinations settles in 249–251ms, with `opacity, transform, filter` over `0.3s cubic-bezier(0.25, 0.1, 0, 1)`. The button stays 44×44, the centres are 0.00px apart, max scale is 1.000, and the captions are unchanged. The CSS tabs also settle in 249–251ms at 44×44 and 0.00px. The incoming Motion icon settles in about 250ms (the exit span unmounts at 367ms).
- **Interruption:** a play press at 60, 120 or 200ms peaks at 0.66, 0.85 or 0.96, then only falls, with a largest step of 0.21. The CSS tab is the same.
- **First paint:** in the first frame `a` has opacity 1, `b` has 0, and there are 0 animations. The first change is the cycle swap at 641ms.
- **Reduced motion:** the still frame shows `playing=false` with 0 animations and Play present. A press on copy or play gives `transform` `none` or identity, `filter` `blur(0px)`, and 10 in-between frames.
- **Card on `/`:** 0 tabbable elements and no status region inside the demo. A click navigates to the entry. It loops (swaps at 169, 1237, 3985 and 5053ms), and the caption is on one line.
- **375px:** no horizontal overflow on `/` or the entry, in either theme.
- **Themes and console:** both themes at 1280 and 375 show no console errors on any page.
- **Site copy button:** swaps and reverts as above.

## Round 1

Layer 3 craft review of `src/terms/icon-swap.tsx` (`4d8e904`, branch `batch-6`). The implementer did not do this review.

What I checked:

- The source, the `g-swap-a/b` glyph CSS (`globals.css:240-249, 343-352`), `copy-button.tsx`, the brief and the report. The `emil-animations` recipe (`patterns.md` Contextual Icon Swaps, Don't Animate on Page Load) and the house rules.
- The live review build on :3200 at all 18 combinations (pair × depth × blur). For each one I sampled every rAF from the press: both icons' `opacity`, `transform` and `filter`, the button's `offsetWidth`/`offsetHeight`, and both icons' centres.
- Both code tabs for all 18 combinations, built verbatim in a scratch page (esbuild with React 19.3, Motion 14.1 and lucide from the worktree). The CSS markup came from the tab's own comment. The 18 Motion tabs pass `tsc --strict`.
- Entry play-once, Replay, the card loop on `/`, a press mid-swap at 60/120/200ms, Enter and Space, the focus ring, the hit area, and reduced motion (the demo and both tabs).
- Light and dark at 1280, 375px on `/terms/icon-swap` and `/`, the compare route, and console errors.

**Verdict: fail.** The demo, the CSS route and the prompt values are right, and the lesson reads. The fail is one item: the Motion tab, pasted as given, shifts the layout and does not visibly scale (finding 1). It fails two items on the entry's own acceptance list. The fix is small.

### Measurements

#### Demo, all 18 combinations (1280, detail)

The frames below are for the incoming icon `b`. The outgoing icon `a` is the mirror image.

| Depth / blur | b at 50ms | b at 100ms | b at 150ms | Settled ±0.01 | Max scale | Max blur |
|---|---|---|---|---|---|---|
| 0.3 / blur | o .38 s .56 b 1.87 | o .74 s .82 b .78 | o .89 s .92 b .34 | 249ms | 1.000 | 3px |
| 0.3 / none | o .38 s .56 | o .74 s .82 | o .89 s .92 | 249ms | 1.000 | 0 |
| 0.8 / blur | o .38 s .88 b 1.18 | o .74 s .95 b .42 | o .89 s .98 b .14 | 249ms | 1.000 | 3px |
| 0.8 / none | o .38 s .88 | o .74 s .95 | o .89 s .98 | 250ms | 1.000 | 0 |
| fade / blur | o .38 s 1 b 1.18 | o .74 s 1 b .42 | o .89 s 1 b .14 | 250ms | 1 | 3px |
| fade / none | o .38 s 1 | o .74 s 1 | o .89 s 1 | 250ms | 1 | 0 |

The three pairs give the same numbers. These held at every combination:

- **Properties:** `transition-property: opacity, transform, filter`, `0.3s cubic-bezier(0.25, 0.1, 0, 1)` on both icons.
- **Button size:** 44 × 44 throughout.
- **Centres:** the two icons' centres are 0.00px apart.
- **Caption:** matches the controls exactly (`scale 0.3 · blur 3px · 300ms` … `no scale · no blur · 300ms`).
- **Prompt:** the live prompt equals the source.
- **Accessible name and state:** `aria-label` goes Copy→Copied and Play→Pause on the press itself. For the heart, `aria-label` stays `Like` and `aria-pressed` goes false→true.

The no-blur rows show b at up to 0.45px blur in the first frame. That comes from my own control change less than 300ms earlier, while the icon was still at opacity 0. It is not visible and is not a defect.

#### Other demo behaviour

| Check | Result |
|---|---|
| First paint | First frame: `a` opacity 1, `b` 0, 0 animations. Nothing moves until the cycle swaps at 541ms. That is the entry's one autoplay cycle: it swaps back at 1641ms, then rests for 7s with 0 animations. |
| Replay | Restarts the cycle: swap at 535ms, back at 1621ms. |
| Press mid-swap at 60 / 120 / 200ms | b peaks at 0.74 / 0.89 / 0.98, then only falls back to 0. The largest step between frames is 0.21, the same as a normal swap frame. There is no jump. |
| Enter / Space | Each gives 10 in-between frames and the same animation. The label toggles. |
| Focus ring | Tab lands on the button (`:focus-visible`). The ring is a 2px solid accent outline, offset 2px, and follows the 8px radius. |
| Hit area | 44 × 44 `<button type="button">`. Both svgs are `aria-hidden="true"`. |
| Reduced motion | Still frame at rest, `playing=false`, 0 animations, "Play Icon Swap demo" present. A press gives 10 in-between frames over about 300ms. `transform` is `none` or identity on every frame, `filter` is `blur(0px)`. Play once: swap at 510ms, back at 1622ms, then rests. The glyph's `animation-name` is `none`. |
| Card on `/` | 308px wide. The demo is a `div` with 0 tabbable elements; a click navigates to the entry. It loops: swap 3103ms, back 4199ms, swap 6904ms. The caption sits above the frame on one line (200px wide). |
| Glyph | Animates only when active. On `/terms/duration` it is inactive with 0 animations. Each swap takes 288ms of the 2.4s loop. |
| Contrast | Caption and hint: light `lab(39.7)` on `lab(98.3)` is about 6.3:1; dark `lab(65.2)` on `lab(2.8)` is about 7.5:1. Icon: `ink` on `bg-demo`. |
| 375px | No overflow on the entry or `/`, in either theme. The caption fits on one line (280px). With the pair name added it would need 292px, so dropping the name was right. |
| Console | No errors on any page, in either theme or with reduced motion. |
| Compare | `/compare/crossfade-vs-icon-swap` (the `compareSlug` order) returns 404. That is expected: Crossfade is a draft, so `visibleConfusedPairs` leaves the pair out. The entry shows Crossfade under "Often confused with" with a Soon pill and the difference sentence. The page will appear once Crossfade is visible. |

#### Code tabs, built verbatim (all 18 combinations)

| Route | Settled ±0.01 | Button size | Centres | Reduced motion |
|---|---|---|---|---|
| CSS | 249–251ms | 44 × 44 constant | 0.0px | Fade over about 250ms. `transform: none`. Shown icon's `filter` is `blur(0px)`; see finding 3. |
| Motion, as given | 249–250ms | **32×25 → 48×25 → 32×25** | **16px apart** | Fade. `transform` and `filter` are `none`. |
| Motion, plus the CSS tab's `.icon-button` rule | ≈250ms | 44 × 44 constant | about 0.1px | Not separately measured. |

On both routes a press mid-swap at 60 and 150ms turns back from where it is (Motion reuses the exiting span). Enter and Space each give 10 in-between frames. Nothing animates on load (`initial={false}` works).

The CSS curve and the spring are almost the same. At 100ms the curve is at o .74 / s .82 and the spring at o .78 / s .80. At 200ms they are at .96/.97 and .97/.97. Both settle at about 250ms.

### Findings

| # | Sev | Area | Before | After (suggested) |
|---|---|---|---|---|
| 1 | gate | Motion tab layout | `motionCode` (`:366-382`) gives the button `className="icon-button"` and the span `className="icon"` with no styles anywhere in the tab. Built verbatim, the `motion.span` is `display: inline`, so its `transform` has no visual effect: the box stays 16px wide at a computed scale of 0.5. `popLayout` never pops the leaving span: it stays `position: static` and gets no `data-motion-pop-id`. The two icons sit side by side and the button grows from 32 to 48px and back on every swap. That fails the entry's own acceptance list ("`offsetWidth` … never change", "boxes coincide") and teaches a layout shift. Give the button the CSS tab's rule (`position: relative; display: inline-grid; place-items: center; 44px`) and it all works: 44 × 44 constant, pop applied, centres together, scale visible. | Make the Motion tab self-contained, the way `copy-button.tsx:34-38` does it: give the button its box (`style={{ position: 'relative', display: 'inline-grid', placeItems: 'center', width: 44, height: 44 }}`, or a 3-line CSS comment). In the Motion route bullet, add something like "the button a grid or flex box, so the span is a box and the leaving icon pops over the new one". The longest prompt is 219 words (heart / 0.8 / blur), so there are about 11 words of room. |
| 2 | should fix | Copy pair behaviour and a11y | The copy pair is built as a toggle. The Motion tab has `onClick={() => setCopied(!copied)}` (`:373`), the CSS tab says "On click, toggle data-on" (`:293`), and acceptance says "Clicked again mid-swap, it turns back". A copy button does not un-copy. It copies, shows the check, and reverts on a timer: the site's own button reverts after 1500ms (`copy-button.tsx:23-28`). `Copied` is also a status, not an action, so as an accessible name it reads oddly and is announced unreliably. The site's own button keeps its name and announces through `role="status"` (`copy-button.tsx:50-52`). The split is right for the other two pairs: Play/Pause is a label swap (the name is the action), and Like is `aria-pressed` with a fixed name. | For `copy`: set on click and revert after about 1.5s (restart the timer on a repeat click). Keep `aria-label="Copy"` and announce "Copied" in a polite live region. In the copy acceptance, replace "Clicked again mid-swap, it turns back" with "a click during the revert turns back from where it is". Keep the play and heart wording as it is. The demo's press-to-toggle can stay as a teaching convenience. |
| 3 | should fix | Acceptance, reduced motion | "computed `transform` and `filter` are `none` in every frame" (`:453`). In the CSS tab the shown icon keeps `filter: blur(0px)`, because `.icon-button[data-on] .icon-b` (specificity 0,3,0) outranks the reduced-motion `.icon-b` (0,1,0). Measured filters were `none` and `blur(0px)` at every blur combination. The live demo reports `blur(0px)` on every frame, and its own e2e expects that. A strict checker fails the house tab. | "computed `transform` is `none` and `filter` is `none` or `blur(0px)` in every frame". This mirrors the "(or `blur(0px)`)" already in the first acceptance item. |
| 4 | should fix | CSS route selector | The tab uses `.icon-button[data-on]`, a presence selector (`:322, :325`). The prompt says "`data-on` on the button picks the shown one" (`:425`). The demo writes `data-on="true"`/`"false"` (`:125, :217`). In React, `data-on={on}` renders `data-on="false"`, which still matches, so the check never leaves. | Use `[data-on="true"]` in the tab and the prompt. Or say "present only when on (`data-on={on \|\| undefined}`)". |
| 5 | should fix | Sources | "Emil Kowalski: Great Animations" (`:467`) has no icon swap and no blur. I fetched it: it covers natural motion and a spring visualiser. Emil's public skills repo (`emilkowalski/skills`) does not carry the recipe either. Its "blur bridges" lines use 2px and are about crossfades. The pattern (opacity, scale and blur on contextual icons; both icons layered without Motion; a bounce-free spring) comes from Jakub Krehel's "Details that make interfaces feel better", section "Animate icons contextually". His public skill uses 0.25 / 4px / spring 0.3 / `cubic-bezier(0.2, 0, 0, 1)`. The exact 0.3 / 3px / 0.35 / `cubic-bezier(0.25, 0.1, 0, 1)` values come only from the local `emil-animations` skill, which is not public. | `{ label: 'Jakub Krehel: Details that make interfaces feel better', url: 'https://jakub.kr/writing/details-that-make-interfaces-feel-better' }`, `{ label: 'Emil Kowalski: 7 Practical Animation Tips', url: 'https://emilkowal.ski/ui/7-practical-animation-tips' }` (section "Use blur when nothing else works"), and the Motion AnimatePresence link. Drop Great Animations. |
| 6 | should fix | Site agreement | `copy-button.tsx:42` uses `{ type: 'spring', duration: 0.25, bounce: 0 }`; the term ships 0.35. The site's copy → check is the term's showcase (spec §5). The reduced-motion difference (chrome switches off, `duration: 0`) is correct under house rules, so it stays. | Set `copy-button.tsx:42` to `duration: 0.35`, or record in the term why chrome runs faster. Measured, 0.35 with bounce 0 is settled by about 250ms, so the change is safe. |
| 7 | should fix | House rules | `house-rules.md:32`: "Never enter from `scale(0)`. Start at `scale(0.95)`–`0.97`". The term starts at 0.3 on purpose, and the rules record no decision for it, although the rules say every source conflict is noted. | Add one line under Properties: "Icon swaps are the exception: 0.3 with `opacity` and `blur(3px)`, both icons in one spot (a deep scale reads as a swap, 0.95 as a glitch)." |
| 8 | nit | Glyph | `<rect … transform="rotate(45 6 6)">` (`:249`). The keyframes' CSS `transform` (`globals.css:348-352`) overrides the attribute, so the diamond renders as a square: computed `none` at 70% of the loop, and confirmed in an 8× screenshot. Circle to square still reads as a swap. | Wrap the rect in `<g transform="rotate(45 6 6)">`, or drop the rotate. |
| 9 | nit | avoidWhen wording | "A timid scale (0.8 to 0.9) or no blur, which read as a glitch or a flicker" (`:408`). The description (`:397`) and the prompt say *no scale* reads as a flicker, and blur bridges. | "A timid scale (0.8 to 0.9) or none, which read as a glitch or a flicker." Put no blur in its own clause: "without blur, the two shapes show at once". |
| 10 | nit | Controls at 375 | The Pair and Depth segments wrap to two lines (52px groups: "Copy → / check", "None (fade / only)"). This is the same as overshoot item 6 and not new to the site. | Keep, or shorten to "Copy / Play / Heart" and "0.3 / 0.8 / None". |
| 11 | nit | Alias | "icon morph" (`:395`) usually means interpolating SVG paths, which is a different technique. | Keep it if people say it for this. Otherwise drop it. |

### Deviations in the report, judged

| Deviation | Verdict |
|---|---|
| 6. Depth with 3 options plus a Blur toggle | Accept. The fade + no-blur combination shows the raw double exposure, and the 18 combinations stay legible. |
| 7. Button in a row | Accept. It gives the icon something to be the state of, and the button is still the subject. |
| 8. Demo on the CSS stand-in curve | Accept. Measured, it matches the spring within about 0.04 at every sample and settles at the same 250ms. It keeps the demo interruptible and measurable. The caption's "300ms" is the CSS route's number. |
| 9. Card caption above the frame | Accept. It stays clear of the reduced-motion Play button and fits on one line at 200px. |
| 10. Caption without the pair name | Accept. It would need 292px in a 280px frame, and the icon itself shows the pair. |
| 11. No unit tests | Accept. |
| 12. Sources | Resolved in finding 5. |

### Feel notes

These are from rAF samples and frames frozen at 75 / 150 / 225ms.

- **0.3 + blur (house):** at 75ms there is one small soft blob in the middle of the button, neither copy nor check. By 150ms it is a check sharpening in place. It reads as one icon becoming another. It is quick: settled by about 250ms, with nothing left to notice afterwards.
- **0.3, no blur:** at 75ms there are two small sharp shapes stacked on each other, a tiny double exposure. It still reads as a swap, but you see two things for a beat. This is the blur's whole job, and the toggle shows it well.
- **0.8:** with blur it softens into a full-size smudge, which reads more as a focus pull than a swap. Without blur it is the clearest failure: copy and check overlap at full size for about 100ms, which is the glitch.
- **Fade only:** without blur, a full-size crisp double exposure: the flicker. With blur, much the same as 0.8 with blur. The blur hides most of the depth difference, so the depth lesson is easiest to see with blur off. A caption or hint could say "turn blur off to see the depth", but this is optional.
- **Mid-swap press:** turns back smoothly from wherever it is, with no snap.
- **Card:** a 14px icon in a 32px button. The swap is small but legible in both themes. The 2.7s rest between swaps keeps the loop calm.
- **Glyph:** a dot shrinks away and a square grows in. It reads as a swap at 12px.

### Content notes

- **Definition:** keep (98 characters, one sentence).
- **Description:** good. The depth ladder (0.3 swap, 0.8 glitch, none flicker), "the blur bridges", no bounce and no load swap are all there.
- **Use when / avoid when:** these match the recipe: state toggles, loading to success, hover-revealed actions and contextual toolbars in; permanent nav, decorative marks, text labels, bounce and first paint out. See finding 9 for one wording fix.
- **Prompt:** terse and route-labelled, 199–219 words at all 18 combinations. No blocked words, no em dashes, tags in backticks. Both routes are exact, including `mode="popLayout" initial={false}`, the key, `initial`/`animate`/`exit` and the spring. Gaps are findings 1 (Motion button box), 2 (copy model) and 4 (`data-on` value).
- **Acceptance:** observable throughout: computed values, a settle time from the first animated frame, `offsetWidth`, `getAnimations()`, aria. Finding 3 is the one wording fix.
- **a11y note:** right for play and like. For copy, see finding 2.
- **Aliases:** unique across all terms.
- **Related:** overshoot, duration and ease-out link, and overshoot links back (`overshoot.tsx:371`). Press Scale and Crossfade show as Soon. Enter and Exit is next door through prev/next.
- **confusedWith:** Crossfade, declared only on this side, with the brief's one-sentence difference.

### Prompt-test notes

The fresh-agent sandbox test was not run in this review. Both code tabs were built verbatim and measured instead (tables above). Run it after the fix round on copy / 0.3 / blur (Motion route) and on heart / fade / no blur (CSS route). Watch whether the agent gives the Motion button a box, and how it writes `data-on`.
