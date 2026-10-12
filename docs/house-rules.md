# House rules

The standard every demo, prompt and piece of site chrome is held to. Distilled from Emil Kowalski's animation skills, Rauno Freiberg's Web Interface Guidelines and Gustavo Fior's craft. Where those sources disagree, the decision is noted.

## Should it animate?
- Used 100+ times a day, or triggered from the keyboard: no animation.
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
- UI stays under 300ms. Exits run about 25% faster than enters.

## Springs
- Use a spring when motion follows a gesture or can be interrupted.
- Default `{ type: "spring", duration: 0.5, bounce: 0 }`. Bounce 0.1–0.3 only for playful or physical motion, never on dialogs or icons.

## Properties
- Animate `transform`, `opacity`, and `clip-path`. Height only for expand/collapse, kept short.
- Never `transition: all`. Name the properties.
- Never enter from `scale(0)`. Start at `scale(0.95)`–`0.97` with `opacity: 0`.
- Popovers, menus and tooltips scale from their trigger (`transform-origin`). Dialogs stay centered.

## Interruptibility
- Anything the user can toggle uses transitions or springs, which retarget mid-flight. Keyframes are for one-shot sequences only.

## Enter and exit
- Exits are quieter than enters: a few pixels of travel, faster, no full-height slides.
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

## Copy
- Plain, specific and calm. Say what it does, not how good it is.
- Definitions are one sentence, under 140 characters.
- Blocked: seamless, seamlessly, leverage, delve, robust, elevate, effortless, effortlessly, cutting-edge, unlock, game-changer.
