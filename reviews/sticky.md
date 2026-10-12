---
verdict: pass
reviewedAt: 2026-10-12
approved: true
approvedBy: Lucas Lima
approvedAt: 2026-10-12
---

# Review: sticky

Layer 3 craft review of `src/terms/sticky.tsx` and `src/components/demo/use-auto-scroll.ts`, second round, at commits 0714a6d, 78f8d05 and 9210d30. The reviewer did not write the entry. Round 1 failed on demo teaching (end frame, still frame, pacing) and on an ambiguous offset-bar sentence in the prompt. All of those are fixed and measured below.

Verdict: **pass**. Two optional items remain: trimming the prompt and the definition wording. Neither blocks publishing.

## Findings (round 1 → round 2)

| Severity | Where | Before (round 1) | After (round 2) | Status |
|---|---|---|---|---|
| Gate | `sticky.tsx:25-31` list length | The scroll ended exactly at the B to C handoff, so the end frame looked like stacked headers. Only one handoff played at detail size. | Sections are A3 B5 C5 D6 E4. Detail end frame: D pinned at the offset with E 161px below it, at offsets 0, 24 and 40. Three full handoffs play at detail size and four on the card. Card end frame: E pinned, rows under it, D fully out. | ADDRESSED |
| Gate | `sticky.tsx:101-107` still frame | `stillAt: 0.4` put A and B stacked at the top of the detail still. | The still position is measured from content (B's top minus offset plus 1.5 rows), giving scrollTop 191 on both card and detail. B is pinned (`stuck=true`) with rows under it and the shadow visible, in light and dark. | ADDRESSED |
| Should fix | `sticky.tsx:34-69`, `use-auto-scroll.ts:77-90` pacing | Strong ease-in-out; the A to B push lasted about 150ms at peak speed. | Keyframed `track`, sampled every 50ms. Detail pushes: 374/437/372ms (offset 0), 451/438/373ms (24), 371/376/373ms (40). Card: 373–421ms across three runs. All within 350–450ms once the ±50ms sampling error is allowed for. Peak cruise speed is about 240px/s. No jolt at the boundaries between cruising and pushing. | ADDRESSED |
| Should fix | `sticky.tsx:201` prompt offset wording | "the bar that stays above the list" was ambiguous. | The prompt now says "a bar pinned with `position: sticky; top: 0` inside the same scroll container. If your bar sits outside the scroll container, use `top: 0`." Acceptance matches: "the 24px bar, which itself stays pinned at the top of the scroll container". | ADDRESSED |
| Should fix | `sticky.tsx:7-18, 119-123` offset bar | An empty strip on a 4px-step slider; a double hairline showed under it in the end frame. | The offset is now a 0/24/40px segmented control. The bar carries a toolbar pill and reads as a toolbar. The end frame at 24 and 40 shows one hairline under the bar. | ADDRESSED |
| Should fix (feel) | `sticky.tsx:118` dark stuck state | In dark mode only a 1px `--line` marked the stuck state; the 6% black shadow was invisible. | `--stuck-shadow` in dark resolves to `0 1px 0 var(--line-strong), 0 4px 12px rgb(0 0 0 / 0.4)`, checked under both System-dark and the forced Dark toggle. The line is visible and the shadow faintly visible. The copied CSS reads the same variable and has a dark-scheme override. | ADDRESSED |
| Nit | prompt sentinel clause (shadow off) | Referenced a sentinel that was never introduced. | Sentinels are gone everywhere. | ADDRESSED |
| Nit | prompt bullets 1–2 | The "pushes instead of overlapping" point was said twice. | Said once. | ADDRESSED |
| Nit | CSS tab `calc(32px + 0px)` | Odd output at offset 0, and the 32px was never explained. | `32px` at offset 0 and `calc(32px + Npx)` otherwise, with "your header height". The prompt says "replace 32px with yours". | ADDRESSED |
| Nit | `sticky.tsx:186` useWhen | "without taking space from the content" | "A toolbar that should stay within reach while its content scrolls." | ADDRESSED |
| Nit | `sticky.tsx:167` definition | "scrolls with the page … hits an edge" is looser than the offset the controls teach. | Unchanged. | NOT ADDRESSED (optional) |
| Info | related / confusedWith | All point at draft terms. | Unchanged; they are hidden until those terms publish. | n/a |

## New stuck recipe (headers observed directly)

Recipe: `rootMargin '-(offset+1)px 0px 100000px 0px'`, `threshold [0, 1]`, stuck = `isIntersecting && ratio < 1 && top <= rootBounds.top`, plus `margin-top: 1px` on the first child.

Each header's actual `data-stuck` was compared with the geometry, where expected stuck = the header straddles the line at offset+1. Positions within 0.5px of an edge were skipped.

| Offset | 1px scrub down + up | One-write jumps (random + to/from each pin and mid-push, both directions) | Wrong states |
|---|---|---|---|
| 0 | 1272 steps | 264 | 0 |
| 24 | 1320 steps | 264 | 0 |
| 40 | 1352 steps | 264 | 0 |

The logic holds up:
- Every transition crosses threshold 0 or 1.
- A pushed-out header now clears to `false`, where round 1 left it `true`.
- The large bottom margin removes the case where a header clipped by the bottom edge jumps to the pinned spot without a callback.
- `margin-top: 1px` keeps the first header off the line at rest, including at offsets 24 and 40, where the margin lands on the bar.

This is a better recipe than the sentinel one.

## Motion checklist (offsets 0/24/40 × shadow on/off)

| Check | Result |
|---|---|
| Should it animate | Only the 150ms stuck shadow, as state feedback. Pass. |
| Properties | `box-shadow` on one small element (paint only, within the shadow-change band). Pass. |
| Easing | Shadow uses `ease`. Autoscroll cruises on beziers and pushes linearly at a constant speed, which is right for a simulated scroll. Pass. |
| Duration | 150ms. Pass. |
| Interruptible | Transition retargets. Autoscroll stops on wheel, pointerdown, touchstart and keydown; replay restarts it. Pass. |
| Reduced motion | `transition-property: none` on the header. CSS tab has the media query and the prompt has the matching line. Nothing autoplays, and the still frame is representative. Pass. |
| Code tabs | CSS and JS match the prompt values (`--stuck-shadow` fallback, `rootMargin`, thresholds, condition, first-child margin). The shadow-off CSS has no transition. Pass. |

## Feel check

- At 1× each push reads clearly at about 400ms, and the cruising between pushes is calm. The cycle ends at about 5.8s on D (detail) or E (card), with the header pinned partway through its section and the shadow on.
- No overlap, flicker or double divider seen at any offset in either theme.
- No console errors. `src/content.test.ts` passes, and the file has no em dashes.

## Remaining optional items

1. **Prompt length.** The default prompt is 2,586 characters (438 words), and the detection bullet alone is about 150 words. Keep the exact recipe in the prompt: root, `rootMargin`, thresholds, the condition, `data-stuck`, no scroll listener. Replace the two "why" sentences (the bottom-margin rationale and `isIntersecting` vs `ratio > 0`) with one guard line, such as "Keep the 100000px bottom margin and `isIntersecting` as given; both cover one-step jumps." Move the full rationale into the JS tab comments; the bottom-margin note is already there. The theme-tuning sentence can drop "on a dark surface the 6% black disappears".
2. **Definition.** e.g. "An element scrolls normally until it reaches a set distance from its container's edge, then stays pinned until its section ends."
3. **Track measurement.** `buildTrack` is measured once per offset, with no ResizeObserver. The card and detail scrollers have fixed heights (card push timing was unchanged after resizing from 1280 to 900px), so this is latent, not live.

## Prompt test

Run by the coordinator between rounds (not by this reviewer). The recipe was re-verified above in a real browser.
