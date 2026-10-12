---
verdict: pass
reviewedAt: 2026-10-12
approved: true
approvedBy: Lucas Lima
approvedAt: 2026-10-12
---

# Review: scroll-triggered (round 3)

This is a scoped Layer 3 re-review of `src/terms/scroll-triggered.tsx` at `foundation` 15350bb. I didn't write the entry.

What I ran:
- The live page on the owner's dev server, in Playwright Chromium at 1280×900.
  - All 18 control combinations, with the prompt, checklist and code tabs captured at each one.
  - Control changes in the middle of the scroll.
  - A visitor takeover followed by a control change.
  - The index card in light and dark.
  - Reduced motion.
  - No console errors.
- The JS, CSS and Motion tabs exactly as the page renders them at defaults, in scratch pages:
  - Pages served at 800×600.
  - The Motion tab typechecked under `tsc --strict`, then bundled with esbuild (React 19.3, motion 14.1), rendered on the server and hydrated.
  - Script arrival delayed by 400ms, blocked entirely, or (for Motion) hydration delayed by 3.5s.
  - Stagger measured at each card's 50% opacity crossing.

Verdict: **pass**. Every gate and should-fix item from round 2 is addressed and verified when run. One new should-fix (the prompt gives a Motion build nothing to follow on first paint) and three nits remain. Land the should-fix before the prompt test. Lucas still has to approve.

## Round 2 findings

| Finding | Verdict | Evidence |
|---|---|---|
| Motion stagger: per-card delay, 60ms gaps, 240ms cap, `above` takes no steps | ADDRESSED | `delay.current ??= nextDelay()` via `custom` (`:374-384`, `:399-405`); `whileInView={above ? undefined : 'shown'}` (`:407`). Measured at 50% crossings: row 0/61ms, jump 0/60/121/179/240/240ms, the same as the JS tab (0/61/121/180/240/240). The four unmarked cards in view on load start 0/67/133/183ms after hydration, so the `above` cards no longer use up steps. |
| JS first paint: marks in-view cards synchronously, adds `js` itself, no head script | ADDRESSED | `:301-309`. Deferred script arriving at 400ms: the first painted frame already shows the top card and card 6 at opacity 1, with no blank frame and no animation. Same with the script inline at the end of `<body>`. Script blocked: all 16 cards visible. Rows and jumps stagger as specified; nothing replays on the way up. |
| Motion failsafe, print, focus | ADDRESSED | Failsafe: with the bundle blocked, cards 4–15 are at 0 on load and all at 1 by 3.7s. Print emulation: all 16 cards at 1. Focus (`onFocus` + `animate`, `:400-418`): focusing an unrevealed card's link without scrolling gives opacity 0.58 at 80ms and 1 at 780ms, with no delay. Hydration clean, no console warnings. |
| `above` caveat stated | ADDRESSED | `:393-396` ("decided at render time … fade in after hydration. Mark generously."). Measured: unmarked cards in view on load fade in after hydration, as the comment says. |
| Observer-callback wording | ADDRESSED | Prompt `:468-469` and JS comment `:284-285` now say only the first callback reports every card and later ones include cards leaving. |
| Prompt easing and duration wording | ADDRESSED | `:211-218`: "(300ms for app UI; 500 to 800ms only for editorial pacing)" on every combination, plus "Build it with … as specified. It is a comparison option; ease-out is the recommended default for entrances." for in-out and spring only (the e2e test asserts it's absent for ease-out). |
| Takeover + control change nit | ADDRESSED | `root.scrollTop = 0` before measuring (`:124-126`). Take over, scroll to the bottom, change duration: the reset touches only off-screen tiles (`i6–i11`, at scroll position 0), the top rows stay as they are with no stagger, and the down leg replays normally. Nothing left hidden above the window. |
| CSS print `transition: none` | ADDRESSED | `:255-258`. The transition also now lives only on the revealed state, so switching to print doesn't start a fade. Print emulation: all cards at 1 immediately. |
| Card loop about 6.8s | ADDRESSED | `TRACK` `:46-54`. Measured card resets at 6.78s and 13.59s (light; 6.71s in dark). Rows reveal about 0.55s apart on the way down (0.98 / 1.55 / 2.05 / 2.63s), with no hide of a visible tile across three loops. |

## Regression run (live page)

- All 18 combinations:
  - Each cycle reveals 6 tiles on the way down.
  - No tile hides after the cycle starts, and none is left hidden above the window.
  - Every tile ends at opacity 1.
  - Durations are 0.3s, 0.5s or 0.8s as selected.
- Changing a control mid down-leg, mid up-leg, or at the bottom restarts the cycle from the top with the first screen in. No violations.
- Reduced motion:
  - The still frame (scroll position 169) and play button are unchanged.
  - Changing a control during a requested play restarts and keeps playing.
  - The demo returns to the still frame afterwards.
- JS and Motion tabs under reduced motion: opacity-only fade, about 150ms, no stagger. Motion's y snaps from 14 to 0 while the card is at opacity 0.
- Contrast is unchanged from round 2: `demo-2` tiles with a `demo-subject` pill.
- No blocked words or em dashes in any prompt, checklist or code tab.

## New findings

| Severity | Where | Before | After |
|---|---|---|---|
| Should fix | Prompt `:471`; `src/lib/prompt.ts:23-31` | Copy as prompt includes the prompt and checklist but no code tabs. The hiding bullet describes only the vanilla mechanism (mark in-view cards, then add `.js`). A Motion build from the prompt alone gets no instruction about `initial` being rendered hidden on the server, first-screen cards, or the failsafe and print styles. Two checklist items depend on those. | Add one sentence: "With Motion, `initial` is rendered into the server HTML: skip `initial` for cards on the first screen, and add a `<noscript>`, print and 3s-failsafe style that forces `.reveal` visible with `!important`." |
| Nit | JS tab `:301-306` | A card peeking less than 15% into the viewport at load is visible at first paint, then hides when the script adds `.js`. Measured: with 80px of top padding, card 6 showed 22px at the bottom edge and went from 1 to 0 at 422ms. | Mark any card that intersects the viewport at load (`seen > 0`) as in, and keep the 15% rule for the observer. |
| Nit | Prompt `:211` vs description `:443` | The description calls 300–500ms right for an entrance; the prompt says "500 to 800ms only for editorial pacing". At 300ms the line also reads "Timing: 300ms (300ms for app UI; …)". | e.g. "(300ms for app UI; up to 500ms for an editorial reveal; 800ms only to feel the drag)". |
| Note | Motion failsafe | If hydration takes more than 3s, the failsafe class stays on and every reveal is a no-op for that page view (measured with hydration at 3.5s: all cards visible, none animate). That's a graceful fallback, not a bug. | None, or mention it in the comment. |

## Prompt test

Not run. Run it after the Motion sentence lands: once with a vanilla build and once with a Motion build, at the defaults.
