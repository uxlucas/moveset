# House rules

The standard every demo, prompt and piece of site chrome is held to. Distilled from Emil Kowalski's animation skills, Rauno Freiberg's Web Interface Guidelines and Gustavo Fior's craft. Where those sources disagree, the decision is noted.

## Should it animate?
- Used 100+ times a day, or driven by the keyboard inside a component (arrow-key highlight, shortcut toggles): no animation. Opening something with Enter still animates.
- Used tens of times a day (hover, filters, tabs): instant, or a barely-there 150ms color change.
- Occasional (menus, dialogs, toasts): standard motion under 300ms.
- Rare (onboarding, success): room for more.
- Name the purpose before animating: feedback, spatial continuity, state change, preventing a jarring jump. No purpose, no motion.

## Easing
- `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` for things entering, leaving or responding to the user.
- `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)` for things already on screen moving from A to B.
- `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)` for sheets and drawers.
- `ease` for hover color changes. `linear` only for constant motion (marquee, progress that is time).
- Never `ease-in` on UI. Never the built-in `ease-out` keyword for deliberate motion.
- Decision: one shared set of three curves (Emil's published skills), not the single default from the local skill.

## Duration
- Press and hover 100–150ms. Tooltips and small popovers 125–200ms. Menus 150–250ms. Dialogs, drawers and toasts 200–300ms.
- Page-level transitions 300–400ms: the only place UI goes past 300ms.
- Product UI stays at or under 300ms. Exits run about 25% faster than enters.

## Springs
- Use a spring when motion follows a gesture or can be interrupted.
- Default `{ type: "spring", duration: 0.5, bounce: 0 }`. Bounce 0.1–0.3 only for playful or physical motion, never on dialogs or icons.

## Properties
- Animate `transform`, `opacity`, and `clip-path`. Height only for expand/collapse, kept short.
- Never `transition: all`. Name the properties.
- Never enter from `scale(0)`. Start at `scale(0.95)`–`0.97` with `opacity: 0`.
- Icon swaps start at `scale(0.3)`: a deep scale reads as a swap, 0.8–0.9 reads as a glitch (Icon Swap).
- Popovers, menus and tooltips scale from their trigger (`transform-origin`). Dialogs stay centered.

## Interruptibility
- Anything the user can toggle uses transitions or springs, which retarget mid-flight. Keyframes are for one-shot sequences only.

## Enter and exit
- Exits are quieter than enters: a few pixels of travel, faster, no full-height slides. Exception: drawers and sheets slide fully off on `--ease-drawer`, matching their enter.
- Don't play entrance animations for things already in place on first paint.

## Press and hover
- Press feedback is `scale: 0.97` over 150ms with `--ease-out`. Never below 0.95.
- Hover motion only on devices that really hover (Tailwind v4 `hover:` does this).

## Reduced motion
- Site chrome: under `prefers-reduced-motion: reduce`, transitions and animations are switched off.
- Demos: nothing autoplays. Each demo shows a still frame and a play button, and plays once when asked.
- Decision: the sources disagree (turn off everything vs keep fades). On a site whose content is motion, playing on request respects the setting and still teaches the term.
- Recipes: scroll-linked effects whose position *is* the information (progress bars) keep tracking under reduced motion; decorative scroll-linked effects (fades, scales) show their final state; parallax drops the speed difference, so every layer moves with the content.

## Performance
- Never drive per-frame animation through React state. Write to the DOM through refs, or let Motion or CSS run it.
- Demos pause when less than half visible or when the tab is hidden.
- Keep `filter: blur()` under 20px.

## Interface basics
- Focus rings use `outline` with an offset (it follows border radius in current browsers).
- Hit areas at least 44px on touch. Inputs at least 16px. `pointer-events: none` on decorative layers.
- Numbers that change use tabular figures. Headings use balanced wrapping.
- Icon-only buttons have an `aria-label`. Feedback appears next to what triggered it.

## Color
- The site is grayscale plus one accent. `--accent` (`oklch(0.62 0.2 292)` light, `0.72 0.15 292` dark) for marks and lines, `--accent-ink` (`0.53 0.2 292` light, same as accent in dark) for accent text, `--accent-soft` for `::selection`. Tailwind: `accent`, `accent-ink`, `accent-soft`.
- The accent marks where you are or what is on: the current rail item, focus rings, the toggle's on track, the selected segment or pill (text only), the copied check, link underlines (`link` utility; hover turns the words accent, as it does for footer links).
- Not for rail hover, cards, buttons, backgrounds, gradients or demos. Demos stay grayscale with the `--demo-*` tokens.

## Demos
- Every stage shows a real component with real content: text is text, icons are lucide, the component is the one the term is usually applied to (a tooltip on a toolbar, a user menu, a toast that says what happened). Grey bars only for body copy that is not the point, never for the subject of the motion. Verdict marks are words and ink, not red and green. See `docs/decisions/2026-10-14-real-ui-demos.md`.
- Accent text uses `accent-ink` (5.5:1 or more on light surfaces); plain `accent` is for non-text only (3.8:1).

## Copy
- Plain, specific and calm. Say what it does, not how good it is.
- Definitions are one sentence, under 140 characters.
- Blocked: seamless, seamlessly, leverage, delve, robust, elevate, effortless, effortlessly, cutting-edge, unlock, game-changer.
