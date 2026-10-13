---
verdict: pass
reviewedAt: 2026-10-13
approved: true
approvedBy: Lucas Lima
approvedAt: 2026-10-13
---

# Review: overshoot

## Re-review after the fix round (`e95e7cb`)

Scoped to fix items 15 to 19 in `.superpowers/batch-5-fixes.md`, plus a regression pass. Same method as the first round: the source, the live :3200 build, and the code tabs built verbatim in a scratch page.

**Verdict: pass.** Items 15 to 19 are fixed in the file, on the live page and in both code tabs. Nothing regressed in motion. Two new small items are left (5, 6), and neither blocks.

| Item | Status | Evidence |
|---|---|---|
| 15. 8% caveat, "8% (strong)" | fixed | `:180` adds "(above the 2 to 5% product range)" to the 8% curve line only; 3% has none, 15% keeps its cartoon caveat. The control reads `0 / 3% / 8% (strong) / 15% (cartoon)` on the live page. The label is used nowhere else: the demo's compare caption uses the value (`8% overshoot`), the card shows no controls, and `/compare/overshoot-vs-spring` renders with no controls and no errors. The e2e spec was updated to the new name. See item 6 for 375px. |
| 16. Spring acceptance | fixed | `:357-359`. Spring at 3/8/15: "`x`'s highest point is … (±1%); any later swing stays under 1px past the target". Curve keeps "peaks once … then settles". Amount 0 (both sources) keeps "never passes it: at most 240.5px", which reads correctly for a bounce-0 spring too. Motion's generator: the only later pass is at 15% (0.77px at 268ms); 3% and 8% never pass again. |
| 17. Settle zero point | fixed | Prompt "settled on the target by 300ms from the first animated frame" (`:342`) and acceptance "By 300ms from the first animated frame" (`:360`); the old "(±1 frame)" is gone. Scratch measurement from the first moved frame: CSS 267ms, Motion 283 to 299ms (15% spring). |
| 18. Keyboard and instant plumbing | fixed | `:347` names `data-instant` from `event.detail === 0`, `[data-instant] { transition-property: none }`, `@media (prefers-reduced-motion: reduce)`, and `useReducedMotion()` with `duration: 0` "chosen in the same render as `x`". `initial={false}` is in both route lines (`:330-331`) and in the Motion tab (`:286`). The 16 Motion tabs pass `tsc --strict`. Rendered, the button carries only `type, class, aria-pressed, style` (no stray `initial`) and starts no animation on mount. The CSS tab (`.chip[data-instant]`, the media query, the handler comment) matches the prompt. Enter in both tabs: 0 in-between frames, at 240 on the next frame. Reduced motion in both tabs: 0 in-between frames. |
| 19. Start state | fixed | Setup line: "between its start (`translateX(0)`) and its target (`translateX(240px)`, the travel)" (`:341`). |

Prompt at all 16 combinations, read from the live page and checked against the source: 174 to 211 words (longest 15/spring/plain, 211). No blocked words, no em dashes, no tags outside backticks, in the prompt, the acceptance list or the code tabs. Register stays terse and route-labelled. The live prompt, acceptance list, CSS tab and Motion tab match the source at all 16.

Regression pass (no change from round 1):

| Check | Result |
|---|---|
| Live peak, 3% curve | 2.99% of 279.09px, settled by 282ms |
| Live peak, 15% spring | 14.18% on a rAF sample (14.8% stated, within 1%), settled by 283ms |
| Live peak, 8% curve | 7.94% |
| Tabs, scratch page | Motion 2.93 / 7.99 / 14.77%; CSS 2.99 / 7.94 / 14.16% (3% curve / 8% curve / 15% spring, ~30fps sampling); returns never below 0, home by ~150ms |
| Entry page | plays once (`a` at 0, `b` at 634ms) and rests for 6s, 0 running animations |
| Reduced motion | still frame, chip in the slot (dx 0), 0 running animations, "Play Overshoot demo" present |
| Overflow at 375 | 0 on `/terms/overshoot`, `/`, `/compare/overshoot-vs-spring` |
| Console | no errors on any page visited |

New items from this round:

| # | Sev | Area | Before | After (suggested) |
|---|---|---|---|---|
| 5 | minor | Prompt, CSS route specificity | `[data-instant] { transition-property: none }` and the reduced-motion media query are each one attribute or class deep. If an agent writes the arrival as a shorthand on the placed state (`[data-placed] { transition: transform 300ms … }`, a natural reading of "`[data-placed]` holds the arrival"), that rule is more specific and puts `transition-property` back, so the keyboard and reduced-motion arrivals animate. The CSS tab avoids this with longhands (`.chip[data-placed]` sets only duration and timing), but the prompt does not say so. The acceptance item for Enter and reduced motion would catch it in testing. | Add a few words, such as "the placed rule sets only duration and timing", or name the selector as `[data-instant], [data-instant][data-placed]`. |
| 6 | nit | Control at 375 | With "8% (strong)", the Amount segments wrap to two lines at 375px (group 52px tall, the selected `3%` becomes a 48px circle). It fits on one line from 390px. `ease-in-out`'s Compare control already wraps the same way at 375, so this is not new to the site. | Keep it, or shorten to "8% strong" / "15% cartoon" if the segmented control should stay one line at 375. |

Status of the round-1 findings: 1 fixed, 2 fixed, 3 kept (intentional alias), 4 kept (deferred to a Spring and Overshoot sweep).

The fresh-agent prompt test reported in the fix list (items 17 to 19) was not re-run here; the wording it asked for is in place.

## Round 1 (`f6c78d8`)

Layer 3 craft review of `src/terms/overshoot.tsx` (`f6c78d8`, branch `batch-5`), done independently of the implementer.

What I checked:

- The source file, `src/overshoot.test.ts`, the `g-over` glyph CSS, and `spring.tsx` for the bar and the difference line.
- The live review build on :3200 at all 16 combinations (amount × source × compare), with the chip transform sampled every rAF. The CSS transitions were also paused and seeked in 0.5–1ms steps to find each exact peak.
- The CSS and Motion tabs for all 8 amount × source pairs, built verbatim in a scratch page (esbuild, React and Motion from the worktree). I measured the peak, settle, return, keyboard click (`detail 0`) and reduced motion.
- `/` card loop, entry play-once, Replay, reduced motion (still frame, play-on-request), and the glyph active and inactive.
- Light and dark at 1280. Overflow at 375 on `/terms/overshoot`, `/` and `/compare/overshoot-vs-spring`. There were no console errors.

**Verdict: pass.** Every number the entry promises shows up on screen and in both code tabs. Four minor items are left, and none of them blocks.

### Measurements

The demo travel is 279.09px (detail, 1280). The peak is the share of travel past the slot.

| Amount | Curve: demo rAF / seeked | Spring: demo rAF / seeked | Tabs (CSS seeked / Motion rAF), 240px |
|---|---|---|---|
| 0 | 0.00 / 0.00 | 0.00 / 0.00 | curve 0 / 0; spring 0 / 0 |
| 3% | 2.99 / 2.99 (at 202ms) | 2.80 / 2.80 (at 145ms) | curve 2.99 / 2.95; spring 2.80 / 2.76 |
| 8% | 7.94 / 8.00 (at 177ms) | 7.77 / 7.80 (at 115ms) | curve 8.00 / 8.00; spring 7.80 / 7.80 |
| 15% | 14.87 / 14.95 (at 161ms) | 14.17 / 14.79 (at 90ms) | curve 14.95 / 14.95; spring 14.80 / 14.29 |

The peak lands within 1% of the travel of the chosen amount in every cell. The 15% spring is the closest call: on a 60fps rAF sample it shows 14.17% (and Motion 14.29%), because its turn is sharp at about 89ms. The seeked peak, 14.79%, matches the stated 14.8%.

In every combination:

- **Final position:** 279.09px, the slot.
- **Settle:** within 0.5px by 300ms. The CSS tab reaches 240.00 at 300ms. Motion with `duration: 0.3` is done at 300ms (the generator reports `done` at t = 300).
- **Return:** never below 0, with `0.225s cubic-bezier(0.23, 1, 0.32, 1)` computed. Home within 0.5px by about 180ms.
- **Twin:** never passes the target (0.00%) and flips at the same instant.
- **Properties:** `transition-property: transform` only. Opacity stays 1 and `offsetLeft` stays 6 throughout.

**Spring bounce mapping.** ζ = 1 − bounce; the peak is exp(−ζπ/√(1−ζ²)). I recomputed it from Motion's generator: 0.25 → 2.84%, 0.37 → 7.82%, 0.48 → 14.77%. The house cap, 0.3, works out to 4.6%. The mapping is accurate. The brief's 0.15 / 0.3 would have given 0.6 / 4.6%, which fails the ±1% rule.

**Back curves.** The y1 values 1.3 / 1.5 / 1.72 peak at 2.99 / 8.00 / 14.95%. The CSS comment says easeOutBack (1.56) goes "about 10%" past; it actually peaks at 9.78%, so the comment holds.

### Findings

| # | Sev | Area | Before | After (suggested) |
|---|---|---|---|---|
| 1 | minor, fixed | Prompt / control consistency | `avoidWhen` (`:313`) says "More than about 5% in product UI". The spring prompt at 8% flags "(over the house 0.3 bounce cap)" (`:177`). The **curve** prompt at 8% says only "Give this element a clear overshoot … `cubic-bezier(0.34, 1.5, 0.64, 1)`: 8% of the travel past the target", with no caveat (`:180` caveats 15 only). The 8% chip label carries no marker. | Add a short caveat to the 8% curve line, such as "(above the 2 to 5% product range)". This matches the spring flag, so both sources say the same thing at the same amount. Optionally label the option "8% (strong)". |
| 2 | minor, fixed | Acceptance wording, spring source | "`x` peaks once at 240 × 1.148 …, then settles" (`:353`). With bounce 0.48, the spring dips to −2.18% at 179ms and passes again by +0.32% at 268ms (0.8px). With 0.37 it dips to −0.61%. A strict checker could read "peaks once" as "passes the target once". | For the spring source: "its highest point is … (±1%); any later swing stays under 1px past the target". Or say "the largest peak". |
| 3 | nit, kept | Alias | `elastic` (`:301`). In easing libraries, elastic (easeOutElastic) is a multi-swing wobble, closer to a high-bounce spring than to a single back-curve pass. It is unique across terms, so it causes no lint issue. | Keep it if the intent is "people who say elastic mean this". Otherwise drop it, since Spring owns "bouncy". |
| 4 | nit, kept | Motion tab | `<motion.button … />` (`:279-288`) renders an empty button with no accessible name. This is the same pattern as published `spring.tsx:503-511`, so it is not a regression. | Optionally add `aria-label` or a child placeholder in both terms later. |

The following items were checked and need no change:

| Area | Evidence |
|---|---|
| The lesson | The slot is a dashed outline at `translateX(300%)` (`:104-108`). The chip arrives on `--e` with `--d` = 300ms (`:115`) and passes the slot by the amount, then settles. Peak frames at 3% (8.4px past) and 15% (41.7px past) show the slot's left edge appearing behind the chip in both themes. |
| Slide, not scale | This is the right call. From `scale(0.95)`, 3% is 0.15% of scale, which is invisible and not measurable. A slide makes "target × (1 + amount)" literal. The prompt still allows scale ("`transform` (translate or scale)"), so "pop in" users are covered. |
| Exits never overshoot | The base rule is `duration-(--x) ease-out` (225ms house curve). The return minimum is 0.00 in all 16 combinations, in the demo and in both tabs. |
| Reduced motion | Prompt, CSS (`transition-property: none`) and Motion (`useReducedMotion` → `duration: 0`): in the tabs, the chip is at 240 in the first frame and no animation is created. Demo: the still frame has the chip in the slot, 0 running animations, a "Play Overshoot demo" button, and the glyph `animation-name: none`. On request it plays once (3% peak) and rests, per house rules. |
| Keyboard | In the CSS tab, Enter gives `detail 0`, then `data-instant`, then 0 animations, and the chip is at 240 at once. The Motion tab gates `instant` the same way. |
| Motion checklist | Transform only. Durations are 300 / 225ms (≤300ms, exit 25% faster). No `ease-in`, no `transition: all`. CSS transitions and Motion `animate` both retarget, so the toggle is interruptible. The `linear()` has 61 points every 5ms, and the seeked peak matches the stated amount within 0.01–0.15%. |
| Prompt | 148–185 words at all 16 combinations (≤230). Route-labelled; exact bezier or bounce; `transform` only; "never `opacity` (it clamps at 1)"; reduced motion and keyboard covered. No blocked words, no em dashes, no tags outside backticks. |
| Content | The definition is kept. The description makes the bounce vs overshoot distinction ("bounce is the setting, overshoot is what you see, and a bounce of 0 never overshoots") and the 2–5% life vs cartoon line. Use and avoid follow emil: playful arrivals and success are in; dialogs, menus, icon swaps, frequent or precise controls, exits, text, opacity and keyboard are out. |
| Aliases, related, confusedWith, sources | Aliases are unique across all terms. Spring keeps "bouncy" and "it bounces a bit". `confusedWith` is declared only at `spring.tsx:584-587`, and the compare page renders. Sources are index.how, easings.co and Motion spring. "Pop in" is an alias only. |
| 0.48 bounce on 15% | Honest. It is labelled "15% (cartoon)", the prompt says "(over the house 0.3 bounce cap)" and "strong, cartoon", and the description says "more reads as a cartoon". Spring already offers an over-cap 0.4 (9.5%) as a teaching option. |
| Page behaviour | The entry page plays once and rests: one flip, then none for 6s. Replay restarts it (`a` at 24ms, `b` at 641ms). The card loops at about 2.6s per cycle. There is no overflow at 375, and the 15% peak fits inside the track at mobile width (272 of 287px). |
| Glyph | It animates only when active (`g-over` on `/terms/overshoot`, `none` on `/terms/spring`) and is off under reduced motion. The dot passes the line by 1.3px of 4px of travel, then settles on it. That is exaggerated, but at 12px a true 3% would be 0.1px. |

### Feel notes

- **3% curve (default):** reads as a small arrival "tick" rather than a wobble. On the 1280 detail stage it is 8.4px past, and the dashed slot edge peeking out behind the chip carries it. With the plain twin the difference is clear.
- **Card on `/`:** 3% is 4.5px on a 50px chip. You can see it but it is subtle, and that is the lesson: product overshoot should barely register.
- **8%:** clearly springy, and already too much for product UI, which finding 1 is about.
- **15%:** reads as cartoon, especially from the spring. The spring turns at about 90ms, so it feels like a snap-back rather than a drift, and it is the most toy-like of the eight.
- **Spring vs curve at the same amount:** the spring arrives earlier and turns harder, while the back curve swells and eases home. Switching source shows the difference.
- **Exits:** the plain, quicker return makes the arrival read as the event. The direction asymmetry works.

### Prompt-test notes

The fresh-agent sandbox test (spec §8, layer 3) was not run in this review. The CSS and Motion tabs were built verbatim and measured instead (table above). Run the prompt test before approval, ideally on the 3% curve and the 15% spring. The spring is the case most likely to trip an agent on the `linear()` sampling instruction.
