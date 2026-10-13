---
verdict: pass
reviewedAt: 2026-10-13
approved: true
approvedBy: Lucas Lima
approvedAt: 2026-10-13
---

# Review: spring

## Round 2 (6234380)

This was a scoped re-review against round 1.

What I checked:

- `git diff 58184d2 6234380`.
- The live :3200 build at all 18 combinations: prompt, every tab, page copy, and the card sampled per frame.
- Mid-flight clicks (3 rounds, light and dark), `aria-pressed`, hint, reduced motion, Replay. Screenshots retaken.
- The current CSS, JS and Motion tabs built verbatim and reversed mid-move with real mouse clicks.
- A Motion 14.1.0 scratch page with five redirect trigger contexts, with and without an explicit `velocity`.

**Verdict: pass.** The gate and every should-fix item are addressed. Two minor items are left, and neither blocks.

| Round 1 item | Status | Evidence |
|---|---|---|
| Gate: velocity wording | ADDRESSED | Prompt: "Motion hands each new animation the current velocity, but Motion 14 drops it on `duration`/`bounce` (and `visualDuration`) springs; the physics form keeps it. `transform` strings have no velocity." The same text is in the JS and Motion tab headers (`:351-353`, `:395-397`) and in the source comments (`:47-50`, `:171-175`). "does not pass velocity on by itself" and "stops dead" are gone. |
| Description | ADDRESSED | `:453`: "Design it in duration and bounce; when it can be redirected, ship the matching stiffness and damping, because Motion 14 drops velocity on duration/bounce springs." It also has "drop its speed and snap into reverse, or stop and start over". |
| "no `transition-duration`" scope | ADDRESSED | It now reads "Motion route (no curve, no `transition-duration`)". The CSS route bullet has its own `transition`. |
| `<button>` + `aria-pressed` in Setup | ADDRESSED | Setup: "the card is a `<button type="button">`; each click toggles it … and sets `aria-pressed`". |
| Acceptance redirect line | ADDRESSED | "Motion route: after a mid-flight click, the next frame still moves toward the old target by less than the frame before; it then turns once and never reverses within a single frame." This is observable and frame-rate proof. Correct code meets it (JS tab 38.1 → 6.9 → 5.4 → −7.3; Motion tab 34.7 → 6.3 → 3.6 → −8.8). |
| Route-labelled checklist | ADDRESSED | Items are labelled Motion route (transition 0s, mid-flight, five clicks), All routes (settle, overshoot, `offsetLeft`, reduced motion), and CSS route: "reverses at speed, since CSS keeps no velocity". |
| CSS reversal claim | ADDRESSED (corrected) | The CSS tab as written, reversed at 132px: +22.6 → **−15 → −25.6**. It flips at speed, so the new "flips direction at speed" is right and the old "starts from rest" was wrong. |
| Reduced motion wording | ADDRESSED | Prompt: "at its target next frame, no travel. Motion: `x.jump(target)`; CSS: `transition: none`". CSS tab: "rests at its target at once". Checklist (all routes): "painted at its target in the first frame after the event". Live: still frame (`transform: none` for 1.5s), Play button present, glyph still. |
| Redirect at `max(40%, 90ms)` | ADDRESSED | `:203` `Math.max(physics.at40, MIN_BACK_MS)`. At 0.3s the peak now comes 83–100ms after launch (was 33–50ms). Bounce 0 at 0.3s reaches 245 of 336px before turning, so the outbound leg is visible. See new finding N1 for bounce 0.4. |
| Hint | ADDRESSED | "Click the card, then again mid-move". |
| Demo `aria-pressed` | ADDRESSED | It starts at `"false"` and is set in `send` (`:183`). Live: false → true → false over two clicks. |
| Glyph | ADDRESSED | `globals.css:251-253`: 3.5 / 2.85 / 3.05. |
| Aliases (nit) | Deferred | Unchanged, as agreed, until Overshoot is written. |

**Copy.**
- Prompt 210–228 words at all 18 combinations (max: 0.2 / any duration / compare).
- No em dashes or blocked words in the prompt, tabs or page.
- Physics values match the table at every combination.
- Console clean in both themes.
- The live demo still carries velocity: dark, round 1: 46.7 → 13.6 → 4.8 → −10.7, and back the other way −40.9 → −2.4 → −3.9 → +14.1.

### The rAF timing claim

The claim: the automatic handoff is lost when the redirect starts inside a `requestAnimationFrame` callback.

**Not reproduced.** I ran a physics spring with no explicit `velocity`, redirected at 40% of the way, 2 runs per context:

| Trigger context | `getVelocity()` at redirect | Steps around the turn |
|---|---|---|
| Raw rAF loop registered before Motion's frame | 1524–1530 px/s | 23.5 → 12.1 → −3.6 |
| rAF scheduled from `postRender` | 1567–1590 px/s | 24.1 → 12.4 → −2.8 |
| `frame.update` | 1336–1384 px/s | carried |
| `frame.postRender` | 1580–1612 px/s | carried |
| `setTimeout` | 1511–1640 px/s | carried |

Momentum carried every time, the same as with an explicit velocity.

The order in the comment is right. `value.start()` calls `stop()` (`value/index.mjs:295`) before the closure reads `value.getVelocity()` (`interfaces/motion-value.mjs:28`). But `JSAnimation.stop()` first ticks the animation to `time.now()` when the value is stale (`JSAnimation.mjs:46-49`), so the reading is fresh, not 0.

- **The prompt.** It makes no claim here; it keeps `velocity: x.getVelocity()` without comment, which is accurate and harmless.
- **The tab comments and source comment.** "inside a frame callback can come out 0" is unsupported by my measurements (see N2).

### New findings (round 2)

| Severity | Where | What | Fix |
|---|---|---|---|
| Minor (N1) | demo `:203`, 0.3s at bounce 0.4 (and partly 0.2) | The 90ms floor now lands after the card has reached B. At 0.4 / 0.3s the stiff spring crosses B at about 70ms. Measured peak 357–359px on a 336px track, so the "redirect" happens near the overshoot peak at low speed: it reads as "overshoot B, then go home", not a mid-move turn. At 0.2 / 0.3s it turns at 281–296px (84–88%), with little momentum left. Bounce 0 is fine (245px). | Cap the floor below arrival, for example `Math.min(Math.max(at40, 90), at75)` (store `at75`), or accept it: the 0.4 combination is flagged over the cap anyway. |
| Minor (N2) | JS tab `:372-375`, Motion tab `:422-425`, source `:172-174` | "(Motion reads its own after stopping the old animation, which inside a frame callback can come out 0)" did not reproduce in 5 trigger contexts, including raw rAF before and after Motion's frame. `stop()` ticks before the read. | Make the reason neutral: "Passed explicitly so the handoff does not depend on when Motion samples it." Or keep it only with a repro that pins the context. |
| Note | prompt | The "never dialogs, menus, icons; 0.1–0.3 for gestures" bullet left the prompt. Each bounce line now says "product UI ships 0" or "over the 0.3 cap", and `avoidWhen` keeps the full rule. Fine for a prompt about this card. | None. |

## Round 1 (58184d2)

This is the layer 3 craft review of `src/terms/spring.tsx` at `58184d2` (branch `batch-4`). I did not write the entry.

What I checked:

- **Motion 14.1.0 source.** I read the installed `motion-dom` (`animation/interfaces/motion-value.mjs`, `animation/generators/spring.mjs`, `waapi/supports/waapi.mjs`).
- **Scratch page (React 19.3 + motion 14.1.0, esbuild, Chromium).** I sampled per frame at a redirect at 40% of the way for:
  - `motion.div` `animate` prop retargeting with duration/bounce, visualDuration/bounce, physics, and a `transform` string;
  - `animate(motionValue)` with and without an explicit `velocity`;
  - `animate(element, { x })`.
- **Code tabs run as written.** I built the JS and Motion tabs verbatim and tested them with real mouse clicks, Enter, and reduced motion. I also ran the JS tab with `velocity:` removed.
- **The physics table.** I checked it against a port of `findSpring` (path, overshoot, 40% time, settle at 240px). I also ran `vitest src/spring.test.ts`: 18 passed.
- **Live `/terms/spring` on :3200 at all 18 combinations.** I sampled the card and the twin every frame, and checked the prompt, checklist and all three tabs.
- **More live checks:**
  - mid-flight clicks (3 rounds of 5 clicks), Enter and Space, and Replay;
  - light and dark at 1280, 375 with compare, and reduced motion;
  - the `/` card in both themes;
  - the sidebar glyph.

**Verdict: fail.** There is one gate, and its fix is a wording change. The demo, the physics values and both JS tabs behave correctly. But the prompt and both code tabs explain the velocity mechanism wrongly, and this entry exists to teach that mechanism.

### Findings

| Severity | Where | What | Fix |
|---|---|---|---|
| Gate | prompt `:465`, JS tab `:360-362`, Motion tab `:408-410` (also `:48`, `:161-162`, `:340-341`) | **"Motion 14 does not pass velocity on by itself … pass it, or the card stops dead and starts over" is false.** Every new animation already gets `velocity: value.getVelocity()` (`motion-dom/.../interfaces/motion-value.mjs:28`). Time-defined springs throw it away: `isTimeDefined` is true whenever `duration` or `bounce` is set without physics (`spring.mjs:174-175`), and then `inheritVelocity` returns 0 (`spring.mjs:226`). **Measured:** `animate(x, 0, physics)` with no `velocity` steps +25.0 → **+14.9 → +0.3 → −7.8**, the same as with `velocity: x.getVelocity()` (+27.1 → +16.0 → +0.4 → −7.4). The JS tab with `velocity:` deleted, from real mouse clicks, 3 runs: 38.7 → 8.2 → 3.6 → −7.2, 30.7 → 12.1 → 1.4 → −8.5, 35.6 → 9.2 → 0.9 → −9.3. So the momentum comes from the physics form; the explicit velocity changes nothing. | Say why it really works. Prompt: "Motion hands each new animation the current velocity, but Motion 14 drops it on `duration`/`bounce` (and `visualDuration`) springs; the physics form keeps it. `transform` strings have no velocity." Keep `velocity: x.getVelocity()` if you want it explicit, but drop "pass it, or the card stops dead". Fix the source comments the same way. |
| Should fix | `description` `:438` | It says "Describe it with duration and bounce … rather than mass, stiffness and damping", yet every route ships stiffness and damping, and nothing on the page says why until the prompt. It also says a curve "would stop dead and start over", while the demo's ease-out twin (and its label) **reverses at full speed** (measured +68 → −1.6 → −28 px/frame). | Add one sentence: "Design it in duration and bounce; when it can be redirected, ship the matching stiffness and damping, because Motion 14 drops velocity on duration/bounce springs." Change "stop dead and start over" to "drop its speed: snap into reverse, or stop and start over". |
| Should fix | prompt Spring bullet `:463` vs No-JS bullet `:468` | "no curve, no `transition-duration`" contradicts the CSS route's `transition: transform 500ms linear(…)` two bullets later. | Scope it: "(Motion route) no curve, no `transition-duration`". |
| Should fix | prompt Setup `:462` | The copied prompt never says the card is a `<button type="button">` with `aria-pressed` updated on click. That rule is only in `a11y`, which is not copied. Ease-out's prompt carries its focus rule. | Setup: "the card is a `<button type="button">`, `aria-pressed` set on click". About 8 words; the gate fix can save them. |
| Should fix | acceptance `:485` | "No frame where it stops dead" contradicts a correct turn, which passes through about 0 (measured +1.3, −0.3, +0.3 at the turn). "No step larger than the step before the click (+1px)" depends on frame timing: correct code measured 27 → **37.8** in the click frame. | Make it observable and frame-rate proof: "the first frame after the click still moves toward the old target, by less than the frame before; then it turns once and heads back; it never reverses within one frame." |
| Minor | demo, 0.3s | `at40` is 32–45ms, so the outbound leg lasts 2–3 frames at 1×. Measured peak at 33–50ms, and the momentum shows for one frame, so it reads as a twitch. At 0.5s (peak about 100ms after launch, a turn over 3 frames) and at 0.8s it reads. On the `/` card (160px travel, peak 74px) it reads as "flick and spring home" more than "redirect". | Send it back at about 60% of the way, or `max(at40, 90ms)`, so the outbound leg is visible before the turn. Or accept: it is honest physics, and compare plus the default teach it. |
| Minor | demo hint `:255` | "Click the card mid-move" shows while the card rests; the first click is what starts a move. | "Click the card, then again mid-move". |
| Nit | demo, reduced motion | A pointer click on the card under reduced motion animates the spring (26 in-between positions), while the prompt teaches a jump. This is defensible under the site's "plays on request" rule. | Optional: jump under reduced motion, or leave it as is. |
| Nit | demo button `:111` | It has no `aria-pressed`, though the a11y note teaches it. | Add `aria-pressed={side === 'b'}`, kept in sync in `send`. |
| Nit | glyph `globals.css:247` | It passes the end by 0.8 of a 6px travel (13%), then 2.6 and 3.2: about a 0.4 bounce. At 12px it reads well as overshoot and settle. | Optional: 3.5 / 2.85 / 3.05, to stay near the 0.3 cap. |
| Nit | aliases `:436` | "bouncy" and "it bounces a bit" are what Overshoot (a draft with no aliases yet) will want, and aliases must be unique. | Settle it when Overshoot is written. |
| Optional | Motion tab | Declarative retargeting also carries velocity with the physics form. Measured on `motion.div animate={{ x }} transition={physics}`: +27.3 → +13.9 → −0.6 → −9.3. | You could teach `animate={{ x: on ? 240 : 0 }} transition={spring}` (with `type: false` for a keyboard or reduced-motion jump) instead of `useMotionValue` + `animate()`. |

### Velocity claim, item by item

- **(a) `motion.div` `animate` prop retargeting:**
  - `{ duration: 0.5, bounce: 0 }`: +25.3 → **−4.7** → −10. It drops velocity and turns at once from rest.
  - `bounce 0.2`: the same (+29.7 → −4.4).
  - Physics: +27.3 → +13.9 → −0.6 → −9.3. It carries.
  - `transform: translateX()` string, physics: +24.6 → −4.1. A string has no velocity.
- **(b) `animate()`:**
  - On a motion value with duration/bounce: +26.4 → −4.2. With `velocity: x.getVelocity()` added: +26.5 → −4.3, so velocity is ignored.
  - Physics, with or without `velocity`: it carries (see the gate).
  - `animate(element, { x })`: duration +27 → −4.7; physics +25.5 → +14.6 → −1.3. Physics carries.
- **(c) `visualDuration: 0.5, bounce: 0`:** +13.8 → −1.3, so it drops velocity too, and it is a slower curve than `duration: 0.5`. `visualDuration` and `bounce` do not help.
- **Judgement.** The physics form is the right teaching for Motion 14.1.0. Emil's duration+bounce API stays the design language, and the prompt already states the spring that way first. The only thing wrong is the stated reason.
- **Conversions.** All within 0.32% (stiffness) and 0.30% (damping) of `findSpring`, and the path within 0.48px over 240px. Overshoot is 0 / 1.5 / 9.4–9.5%, `at40` matches to 1ms, and the curve is within 0.5px by 444–732ms, before each duration.
- **At every combination.** All 18 show the right physics values in the prompt, the JS tab and the Motion tab. The CSS tab shows the right ms, and the compare lines appear only with compare on.

### Feel notes

- **Default (0.5s, bounce 0), entry page.** It plays once and rests (movement 25–490ms, then still for 4s).
  - Mid-flight clicks, round 1: 38.7 → 41.1 → **19.1 → 1.9 → −11.2 → −17.7**. It keeps going, slows, turns and heads back, with no jump. All three rounds were smooth.
  - Five clicks in under 450ms neither queue nor jump.
  - Replay clears the takeover.
- **Compare.** The ease-out twin reverses in the next frame at every duration (0.5s: +68 → −1.6 → −28), beside the spring's +20.6 → −0.6 → −13. The difference is plain at 0.5 and 0.8s.
- **Bounce.**
  - 0: never passes A (min x 0.00).
  - 0.2: passes A by 1.5–2.8px, a light settle.
  - 0.4: passes A by 14.5–18.8px, which reads as toy-like. The prompt correctly flags it above the 0.3 cap.
- **Settle.** The return is done (under 0.5px) 250 / 416 / 684ms after the peak for 0.3 / 0.5 / 0.8s, within about the duration.
- **Transform.**
  - Motion route: `x` runs on the main thread.
  - One-shot `transform` string: runs as WAAPI. `getAnimations()` shows `linear(…)` over 500ms, so "on the compositor" is accurate.
  - No `left` or `margin`, no `ease-in`, no `transition: all` at any combination.
- **Keyboard.** Enter and Space jump: one x value, no frames in between. Both tabs as written do the same. The rule is stated in the prompt, the checklist, `avoidWhen` and `a11y`. It is right per the house rules ("triggered from the keyboard: no animation").
- **Reduced motion.**
  - Still frame at A, no autoplay over 2s, Play button present.
  - Play runs one cycle, then stops.
  - Both tabs as written jump.
  - The glyph is still.
- **Visual.**
  - Light: white card on a lab 92 track, slot border lab 84, subject lab 48.
  - Dark: card lab 6 on a lab 13 track, slot lab 23, subject lab 68.
  - The subject has the strongest contrast in both themes, and the slots are faint but readable.
- **Mobile and console.** 375 with compare has no overflow, and the card is 72×48. The console is clean in both themes.
- **Glyph.** It loops only on the current term (`g-spring` active on `/terms/spring`, `none` elsewhere) and reads as overshoot and settle.

### Content notes

- **Definition.** 100 characters, one sentence, accurate.
- **Use and avoid.** They match Emil: gestures, interruptible and physical moments, against dialogs, menus, icons, bounce above 0.3, keyboard changes, and constant rhythm.
- **Prompt.**
  - 198–226 words at every combination.
  - No em dashes, blocked words, or unbackticked tags.
  - Values only, with route-labelled bullets.
  - Self-contained, apart from the button semantics (should fix).
- **Tabs.**
  - The CSS `linear()` has 25 points from Motion's own generator, and the "starts from rest when reversed" caveat is right.
  - JS and Motion run as written: momentum on redirect, keyboard and reduced-motion jumps, `aria-pressed` updated.
- **`confusedWith`.** The overshoot line is correct and useful.
- **Sources.** Fine. Optional: Apple's WWDC23 "Animate with springs" for the duration and bounce model.
- **Not done.** The prompt test (a fresh agent building it in a sandbox) is still to run, after the gate fix.
