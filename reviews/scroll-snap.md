---
verdict: pass
reviewedAt: 2026-10-12
approved: true
approvedBy: Lucas Lima
approvedAt: 2026-10-12
---

# Review: scroll-snap

Layer 3 craft review of `src/terms/scroll-snap.tsx`, round 2, at 5a3b3c2 (fix) and fe75a68 (e2e). The reviewer did not write the entry.

I checked the review build on :3200 with Playwright Chromium (HeadlessChrome 156) at 1280×800:
- light and dark
- with and without emulated reduced motion
- all four control combinations

I also built the CSS and JS tabs literally into a standalone standards-mode page with a 56px fixed header, at all four combinations. No console errors.

Round 1 failed on two Gate items: the first panel sat behind a fixed header, and a null `snapTargetBlock` broke the JS. There was also one feel item (the speed jumped at the flick hand-off). All three are fixed and measured below.

Verdict: **pass**. One should-fix is new this round: the 8px demo inset makes Center show unequal neighbours (28px above, 20px below). It is a one-line change, and I'd make it before approval. Two nits remain.

## Findings (round 1 → round 2)

| Severity | Where | Before (round 1) | After (round 2) | Status |
|---|---|---|---|---|
| Gate | prompt, `ROOM`, CSS tab: fixed header | Panel 1 rested behind a 56px header: top at 0px (start) or 24px (center). | The prompt defines H. The container gets `scroll-padding-top: H`, `padding-top: H` (`H + 24px` for center) and `body { margin: 0 }`. The CSS tab uses `padding-block: var(--header) 48px` and `calc(var(--header) + 24px) 24px`. In the literal build with `--header: 56px`, panel 1 at scroll 0 has its top at **56px (start)** and **80px (center)**, which is exactly centered in the 744px area below the header. With mandatory, the last panel at max scroll rests at 56 and 80. Every combination meets acceptance line 3. | ADDRESSED |
| Gate | JS tab and prompt: null snap target | `panels.indexOf(null)` gave −1, and Next jumped to panel 1. | The JS now reads `show(e.snapTargetBlock ? panels.indexOf(e.snapTargetBlock) : nearest())`. The prompt says "`null` between panels: use the nearest". In the literal proximity build, wheeling 1.5 strides rested at 1.500 with `current` = 1. Next went to 2.000 with `current` = 2. A quick double Next went to 4.000 with Next disabled. Mandatory gives the same results. The `:234` comment now says the event fires when the scroll comes to rest. | ADDRESSED |
| Should fix (feel) | `NUDGE`/`flick` speed at the hand-off | 211–235 → 1438 px/s in one frame (detail); 111 → 706 (card). | `NUDGE = [0.5, 0, 0.85, 0.4]`, drag 0.25 over 240ms. `flick()` sizes the settle so the speeds match (540ms). Sampled every other frame, detail flicks run 471 → 813 → **1176 → 1125** → 889 px/s and 444 → 882 → **1235 → 1000** → 933. The card runs 313 → 438 → **471 → 412**. Speed is continuous through the hand-off, so there is no lurch. Overshoot stays at 0px and every move is monotonic. The proximity flick (drag 0.2 over 400ms) peaks at 588 px/s with no step. | ADDRESSED |
| Should fix | acceptance, proximity keyboard | "scroll as usual" | "PageDown moves one panel; ArrowDown moves a few lines and stays there instead of jumping to the next panel." Measured in the demo: PageDown 1 → 2 → 3, ArrowDown 2.000 → 2.145. In the literal build: PageDown 1.000, ArrowDown 1.057. | ADDRESSED |
| Nit | prompt `behavior` sentence | "…`behavior })`, `'smooth'`, or `'auto'`…" | "…`behavior })`, `behavior: 'smooth'`, `'instant'` under reduced motion". It now says `'instant'` in both the prompt and the JS. It still reads a little like a list; "with `behavior: 'smooth'` (`'instant'` under reduced motion)" would be cleaner. | ADDRESSED (wording optional) |
| Nit | nested panel height | "nested: `100%` for `100svh`" made panels 96px short when the scroller has padding. | "(nested: the scroller's height for `100svh`)". It avoids the `%`-inside-padding trap by a different route than the spacers I suggested, and that is fine. | ADDRESSED |
| Nit | description | "with its own momentum", "which of its edges" | "which part lines up: start, center or end … When a scroll ends, the browser finishes it on the nearest panel." | ADDRESSED |
| Nit | useWhen carousels | Horizontal use listed under a `y`-only prompt. | "Vertical galleries and full-screen feeds … Use the x axis for a sideways carousel." | ADDRESSED |
| Nit (optional) | demo top inset | Start panel sat flush against the toolbar. | `scroll-padding-top: 8px` plus an 8px spacer. At start, the panel rests 8px below the toolbar with no sliver of panel 2 above it (measured visible heights: 0/268/48). | ADDRESSED (introduces the new Center finding below) |
| Prompt test | one panel-height formula | n/a | `calc(100svh - H - 48px)` in the prompt and `calc(100svh - var(--header) - 48px)` in the CSS tab, at every combination. | ADDRESSED |
| Prompt test | `padding-bottom` rule | n/a | "`padding-bottom: 48px` (snap area height, viewport − H, minus panel height)", halved for center. The literal build confirms that the last panel reaches 56 and 80. | ADDRESSED |
| Prompt test | 8px gap, none on the last | n/a | `margin-bottom: 8px` plus `.panel:last-child { margin-bottom: 0 }`. Correct as written, but fragile (see the new nit). | ADDRESSED |

## New findings

| Severity | Where | What | Fix |
|---|---|---|---|
| Should fix | demo `PADDING_CLASS` and `before`, `scroll-snap.tsx` (`INSET`, `before = inset + (center ? peek / 2 : 0)`) | With Center, the 8px top-only `scroll-padding` centers the panel in the area *below* the inset, so the neighbours show unequally. Measured at detail size: **28px of panel 2 above, 20px of panel 4 below** (panel rect 36–304 in a 332px scroller). It is visible in `still-*-Center.png`. Acceptance line 1 promises "both neighbours showing equally", and this is the one frame that teaches Center. The card is unaffected because it always uses Start. | Apply the inset only for Start. For Center, use `scroll-padding-top: 0` and `before = peek / 2`, which gives 20px and 20px. Alternatively, use `scroll-padding-block: 8px` with an 8px spacer at each end. |
| Nit | CSS tab `.panel:last-child`; prompt "none on the last" | `:last-child` only matches when nothing follows the panels in the container. In my literal build a `<script>` came after the panels, so the last panel kept its 8px. With mandatory it still snapped correctly. With proximity, the max scroll was 8px past the last snap point, so the last panel could rest at 48px instead of 56px (72 instead of 80 for center). | Go back to `.panel + .panel { margin-top: 8px }`, which gives the same geometry without depending on structure. In the prompt: "8px between panels (`.panel + .panel { margin-top: 8px }`)". |

## Motion and behaviour (re-measured)

| Check | Result |
|---|---|
| Real CSS snap on takeover | During autoplay `scroll-snap-type` is `none`. After takeover it is `y mandatory` or `y`. With mandatory, wheel 40/100/140/200/−60/−140/600 landed on panels 1, 1, 2, 3, 3, 2, 4. With proximity, ±140 rested at 1.507 and 1.493, and the rest snapped. Same results at both alignments and under reduced motion. Pass. |
| Keyboard | Home, PageDown ×3, PageUp, ArrowDown, Space, End: 0, 1, 2, 3, 2, 3, 4, 4 (mandatory) and 0, 1, 2, 3, 2, 2.145, 3, 4 (proximity). A keydown takeover mid-flick (0.73) followed by PageDown landed on 2.000. Pass. |
| Still frame and reduced motion | scrollTop 552 (panel 3) in every combination, with snap on. Play runs once, then the still frame returns (552 at +7.7s). Replay after takeover resets the takeover state and snap. Pass. |
| Code tabs | No transitions or easing. `'instant'` under reduced motion. No wheel or touch listeners. Pass. |
| Prompt | 199 / 203 / 208 / 212 words (mandatory-start, mandatory-center, proximity-start, proximity-center), all ≤ 230. No em dashes and no blocked words in the prompt, acceptance, CSS or JS. Values only. Pass. |

## Feel notes

- **Flick:** now one continuous gesture. It accelerates over 240ms to about 1.15k px/s at detail size (about 470 px/s on the card), then decelerates over 540ms onto the panel.
- **Overshoot and stops:** no overshoot, and the scroll never stops between panels.
- **Holds:** 800ms. Each flick is 780ms.
- **Proximity:** the halfway stop (754ms drift, 1.1s hold) still reads clearly.
- **Card loop:** holds panel 5, cuts back to panel 1 the same way the rest of the scroll family does, then holds 0.67s before the first flick.
