# moveset — design spec

- **Date:** 2026-10-11
- **Status:** approved 2026-10-11
- **Owner:** Lucas Lima (design, content approval). Built by Claude Code agents.

## 1. What this is

moveset is a visual dictionary of design engineering terms. Every term has a live demo, plain-language guidance, and a copy-ready prompt that tells an AI coding agent exactly what to build.

**Problem.** People know what they want ("that thing where the header sticks and the content slides under it") but not what it's called. Prompting an agent becomes slow and vague, and the result is close but wrong.

**Product.** A curated, opinionated vocabulary. Each entry shows the concept moving, names it precisely, says when to use it and when not to, and gives a prompt with clear acceptance criteria. Depth over breadth: fewer terms, each one done properly. It covers motion, feel and polish, not components.

**Audience.** Designers working with AI coding agents, design engineers who want a shared team reference, engineers who get vague feedback, and agents themselves through machine-readable exports.

**Success for v1.**
- The six scroll terms (1–6 below) are published: fully written, passed every check in section 8, approved by Lucas.
- The other 41 terms exist as drafts with a name, definition and working demo.
- All agent outputs (section 7) are live and generated from the content.
- Adding a term means creating one file.
- Deployed at moveset.lucaslima.design.

**Design principle.** Demos are the content. Everything else stays calm.

## 2. Term list (47)

Changes from the original brief: "Icon Morph" renamed to Icon Swap (morph means one shape becoming another, copy→check is a crossfade); "Horizontal Scroll" renamed to Pinned Horizontal Scroll (the swipeable overflow row is a different thing, linked from Scroll Snap); Reserved Space merged into Layout Shift as its prevention section; Origin-aware added.

| # | Category | Term | Note |
|---|---|---|---|
| 1 | Scroll | Scroll-triggered | Plays once when an element enters the viewport |
| 2 | Scroll | Scroll-linked | Progress tied directly to scroll position |
| 3 | Scroll | Parallax | |
| 4 | Scroll | Sticky | |
| 5 | Scroll | Scroll Snap | Confused-with link to the swipeable row |
| 6 | Scroll | Pinned Horizontal Scroll | Vertical scroll drives horizontal movement while pinned |
| 7 | Scroll | Scroll Fade | Fade the edge that has more content to scroll |
| 8 | Scroll | Scroll Progress Indicator | |
| 9 | Motion | Ease-out | Demo control switches between ease-out, ease-in and linear so the "avoid" options can be felt (ease-in and linear are not terms, so no compare page) |
| 10 | Motion | Ease-in-out | |
| 11 | Motion | Spring | |
| 12 | Motion | Stagger | |
| 13 | Motion | Duration | Demo lets you feel 150 / 300 / 500ms side by side |
| 14 | Motion | Overshoot | Curve past 1 (back easing); compare with Spring |
| 15 | Motion | Interruptibility | Animation that can change direction mid-flight |
| 16 | Motion | Origin-aware | Scales from its trigger, not its center |
| 17 | Transitions | Crossfade | |
| 18 | Transitions | Shared Layout | One element moving between positions |
| 19 | Transitions | View Transition | |
| 20 | Transitions | Clip-path Reveal | |
| 21 | Transitions | Enter and Exit | Presence |
| 22 | Transitions | Height Auto | Expand and collapse smoothly |
| 23 | Transitions | Icon Swap | Alias: icon morph |
| 24 | Gestures | Press Scale | |
| 25 | Gestures | Drag with Momentum | |
| 26 | Gestures | Swipe to Dismiss | |
| 27 | Gestures | Rubber Banding | |
| 28 | Gestures | Hover Intent | |
| 29 | Gestures | Long Press | |
| 30 | Layout | Layout Shift | Includes reserved space as the prevention technique |
| 31 | Layout | Nested Border Radius | Inner radius = outer radius − padding |
| 32 | Layout | Hit Area | |
| 33 | Layout | Optical Alignment | |
| 34 | Layout | Container Query | Lowest priority; kept for breadth |
| 35 | States | Skeleton | |
| 36 | States | Shimmer | The moving sheen itself, including text shimmer ("thinking…") |
| 37 | States | Optimistic UI | |
| 38 | States | Empty State | |
| 39 | States | Loading Button | Label swap without width jump |
| 40 | States | Toast | |
| 41 | States | Error Shake | |
| 42 | Visual | Letter Spacing | Tighten large text, loosen small text |
| 43 | Visual | Text Wrap Balance | |
| 44 | Visual | Tabular Numbers | |
| 45 | Visual | Layered Shadows | |
| 46 | Visual | Squircle | |
| 47 | Visual | Grain | |

Category slugs, in display order: `scroll`, `motion`, `transitions`, `gestures`, `layout`, `states`, `visual`. Display names: Scroll, Motion & Easing, Transitions, Gestures, Layout, States & Feedback, Typography & Visual.

## 3. Stack

- Next.js (App Router), statically generated pages (no `output: 'export'`, so routes with zero published terms still build), TypeScript, Tailwind CSS v4, Motion (`motion/react`).
- GSAP appears only as code-reference text in entries, never as a site dependency.
- Deployed on Vercel.
- Public GitHub repo `uxlucas/moveset`, written by Lucas and agents only (no outside contributions planned).

Chosen over Astro (a term would have to be a folder, two templating systems) and Vite + React Router prerendering (more setup for static HTML). Next keeps "one file per term" and stays all React.

## 4. The term file

Each term is one file: `src/terms/<slug>.tsx`, default-exporting `defineTerm({...})`. The demo component lives in the same file.

A generator script (`scripts/generate-registry.ts`) runs automatically before `dev`, `build` and tests. It reads `src/terms/`, writes a gitignored registry, and emits a `TermSlug` type union of every slug. Nobody edits the registry by hand.

### Fields

| Field | Draft | Review / Published | Notes |
|---|---|---|---|
| `slug` | required | required | Must match the filename |
| `name` | required | required | |
| `category` | required | required | One of the seven slugs |
| `order` | required | required | Position within category; unique per category; drives prev/next |
| `status` | required | required | `'draft' \| 'review' \| 'published'` |
| `definition` | required | required | One sentence. Used on cards, search, llms.txt |
| `demo` | required | required | `{ component, controls? }` |
| `demo.label` | required | required | Required for all statuses: a text description of the motion |
| `aliases` | optional | required | Loose phrasings people actually use. Searchable |
| `description` | — | required | Short plain-language paragraph |
| `useWhen` | — | required | String list |
| `avoidWhen` | — | required | String list |
| `prompt` | — | required | `(values) => string` |
| `acceptance` | — | required | `(values) => string[]`. Holds the states and edge cases agents forget |
| `code` | — | required | `(values) => { css?, js?, motion?, gsap? }`. Only approaches that make sense |
| `a11y` | — | required | Short note |
| `related` | — | required | `TermSlug[]` |
| `confusedWith` | optional | optional | `{ slug, difference }[]`. Declared on one side; the build links both directions |
| `sources` | optional | optional | `{ label, url }[]`. Credits per entry; `/about` collects them |

TypeScript enforces the table: `status: 'published'` makes every published field required, so a half-written entry cannot publish. `related` and `confusedWith` slugs are checked against `TermSlug`.

`review` means the content is complete but not yet approved. Review terms are visible only when `NEXT_PUBLIC_SHOW_REVIEW=1` (local development) and never appear in production or agent outputs.

### Controls

Control kinds: `range` (min, max, step, unit, default), `select` (options, default), `toggle` (default). Control values are typed, so `prompt`, `acceptance` and `code` can only reference controls that exist. Changing a control updates the demo, the prompt, the checklist and the code together: what you see is what you copy.

### Demo component contract

```ts
type DemoProps<V> = {
  values: V              // current control values
  playing: boolean       // false when off-screen, tab hidden, or reduced motion before play
  replayKey: number      // increments on replay; demo restarts
  size: 'card' | 'detail'
  timeScale: number      // 1 normally; 0.25 in /review slow motion
  onCycleEnd: () => void   // call when one cycle finishes; the runtime decides whether to loop
}
```

The site owns playback. A demo only has to respect these props.

## 5. Pages and behavior

### Layout (desktop)
- Left sidebar, centered content column (~680px), quiet header: lowercase "moveset" placeholder wordmark on the left, text theme toggle on the right (System → Light → Dark).
- Sidebar: categories in order, each with a small icon in its own hue and its terms below. Published terms link, the current one is marked. Drafts are muted, not clickable, with a "Soon" pill.
- Mobile: the sidebar goes away. Filter pills plus search take over navigation. The pill row scrolls sideways with a scroll fade on the edge that has more content.

### Index (`/`)
- Intro: what it is, who made it, a copy block with `npx skills add uxlucas/moveset`, repo link.
- One row with filter pills (All + seven categories) and a search field.
- Search matches name, aliases and definition. Results and filters update instantly with no animation. `/` focuses search. Empty result: "Nothing matches 'x'. Try describing what it does."
- Two-column card grid under category headings. Card: demo on top, name and definition below. Draft cards are muted with a "Soon" pill and are not links, but their demo still plays.

### Entry (`/terms/[slug]`)
In order:
1. Large demo stage with replay button and controls underneath.
2. Name, "Also called…" aliases, definition, description. "Copy as prompt" and "Copy as markdown" sit next to the title.
3. Use when / Avoid when, side by side on desktop.
4. Prompt in a mono block with Copy, acceptance checklist underneath. Copy confirms with an icon swap (copy → check).
5. Code tabs per approach (CSS / Motion / GSAP), short and readable.
6. Accessibility note.
7. Related terms as small cards. "Often confused with" links to the compare view.
8. Previous / next within the category (published only).

### Compare (`/compare/[a]-vs-[b]`)
Both demos side by side, both definitions, the one-line difference, links to both entries. Generated for every `confusedWith` pair.

### About (`/about`)
One short paragraph on why this exists, plus credits (collected `sources`, plus Emil Kowalski, Rauno Freiberg, Gustavo Fior's craft as references).

### Demo runtime (guaranteed for every term)
- Every demo sits on the same neutral stage. Scroll demos sit inside a mini browser window (traffic lights, address bar, scrollbar), so the scroll family reads as one set.
- Cards: play, hold the end state briefly, reset, loop. Only while mostly visible (IntersectionObserver). Paused off-screen and when the tab is hidden.
- Scroll demos auto-scroll themselves on cards. On the entry page the visitor can scroll inside the window; autoplay stops the moment they take over and replay restarts it.
- **Reduced motion:** nothing autoplays. Each demo shows a representative still frame with a play button and plays once on request. Rationale: the sources disagree (the local emil-animations skill disables all motion including fades; Emil's published `animate`/`improve-animations` skills keep fades and drop movement). On a site whose content is motion, user-initiated playback respects the setting and still teaches the term.
- Theme switches disable transitions for that frame so nothing flashes.

## 6. Visual system and house motion rules

These are starting defaults. Lucas reviews the first milestone in the browser and they will change.

### Look
- Near-white page (`#fafafa`-ish), white cards with a hairline border and a soft layered shadow. Dark mode is near-black with surfaces separated by lightness, not shadow.
- Color tokens defined in OKLCH; dark mode derived from the same scale. Theme follows the system by default.
- Inter for text, Geist Mono for prompt and code blocks. Balanced wrapping on headings, tabular figures for numbers, antialiased text.
- Color has one job: each category icon gets its own hue. Everything else is neutral.
- Demos are grayscale wireframes. The moving subject gets the strongest contrast.
- Icons: Lucide at 16px (swappable for Keyline later).

### Motion tokens (shared by site, demos and prompts)
```css
--ease-out:    cubic-bezier(0.23, 1, 0.32, 1);    /* enters, exits, user-initiated */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);   /* things already on screen moving */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);    /* sheets and drawers */
--duration-1: 150ms; --duration-2: 200ms; --duration-3: 250ms; --duration-4: 300ms;
```
- Springs: `{ type: "spring", duration: 0.5, bounce: 0 }` by default. Bounce 0.1–0.3 only in demos about playful or physical motion.
- UI animation stays under 300ms. Exits run ~25% faster than enters.
- Site press scale: 0.97. (The Press Scale entry exposes it as a control.)
- Hover motion only under `@media (hover: hover) and (pointer: fine)`.

### Site chrome motion (the full list)
Copy → check icon swap, press feedback on buttons, 150ms hover color changes, card hover darkens the border (no lift). No page transitions, no scroll reveals.

### Interface basics (from Rauno's guidelines)
Focus rings via `outline` with offset (it follows radius in current browsers); hit areas ≥ 44px on touch; search input ≥ 16px; `pointer-events: none` on decorative layers; `::selection` styled; icon-only buttons have `aria-label`; looping animation paused off-screen.

### House rules document
`docs/house-rules.md` distills the motion and interface rules above, in our own words, with the decisions where sources conflict. Builders and the reviewer agent work from it.

## 7. Agent outputs

All generated from term files at build time. Only **published** terms appear in any machine-readable output.

- **Copy as prompt:** prompt with current control values, the acceptance checklist, the house token values it relies on, and the entry URL. Self-contained for an agent with zero context.
- **Copy as markdown:** the whole entry as markdown. Also served at `/terms/<slug>.md`.
- **`/llms.txt`:** title, one-paragraph summary, then per category: `- [Name](https://moveset.lucaslima.design/terms/<slug>.md): definition`.
- **`/api/terms.json`:** full published data, with prompt, acceptance and code rendered at default control values, plus control definitions.
- **Agent skill:** generated `skills/moveset/SKILL.md` committed to the repo so `npx skills add uxlucas/moveset` works. Short main file (how to map a vague description to a term, plus the glossary) with one reference file per term holding the full guidance and prompt, loaded on demand. The same files are downloadable from the site.
- **Semantic HTML:** each entry is an `<article>` with real headings, `<pre><code>` blocks and a text label on every demo describing the motion. Prompt text is in the server HTML at default values, so fetching the URL without JavaScript gets everything.

## 8. Verification and review

A term moves from `draft` to `published` only after passing all three layers. The last layer is Lucas.

### Layer 1 — automatic guards
Run on every change, in a pre-commit hook, and in GitHub Actions on push.
- **Typecheck.** Missing published fields, broken slugs, unknown controls.
- **Content lint** (`scripts/lint-content.ts`):
  - Definition is one sentence and under a length limit.
  - Aliases unique across all terms; `order` unique within a category; `confusedWith` never points at itself.
  - Code snippets contain no `ease-in` on UI, no `transition: all`, no `scale(0)`, no animated `width`/`height`/`top`/`left`/`margin`/`padding`. Exceptions are declared per term (e.g. Height Auto) and listed in the lint config.
  - Every motion snippet includes reduced-motion handling.
  - Blocked words in copy (e.g. "seamless", "leverage", "delve", "robust").
  - **Publish gate:** a published term must have `reviews/<slug>.md` with `verdict: pass` and `approved: true` in its frontmatter.
- **Generated files current.** Committed `skills/moveset/**` must match the content.
- **Unit tests** (Vitest) for the registry, markdown, prompt, llms.txt, JSON and skill generators.
- **Production build** succeeds.

### Layer 2 — browser checks (Playwright + axe)
- Every page in light and dark, at 375px and 1280px: loads, no console errors, no horizontal overflow.
- axe accessibility scan on every page with zero serious or critical violations.
- Runtime behavior: off-screen demos report no running animations; with reduced motion emulated nothing animates until play is pressed; replay restarts.
- Screenshot baseline of every demo in both themes. A change in how a demo looks fails the check until the new baseline is accepted on purpose.

### Layer 3 — craft review
- **Reviewer agent.** Fresh context, never the agent that wrote the entry. Checks the motion checklist (should it animate; transform/opacity only; easing; duration; interruptible; origin; reduced motion) and the content rubric (definition precise; use/avoid concrete; acceptance checks observable; prompt self-contained with exact values).
- **Prompt test.** A fresh agent gets only the copied prompt, builds it in a throwaway Vite + React sandbox outside the repo, and the result is checked in a browser against the acceptance list. If the prompt cannot produce the thing, the entry is not done.
- Output: `reviews/<slug>.md` with frontmatter (`verdict`, `reviewedAt`, `approved`), a before/after findings table, and prompt-test notes.
- **`/review` page** (dev only, excluded from production build): each entry awaiting approval with its demo at 1× and 0.25×, what to feel-check, and the reviewer's notes. Lucas approves; `approved: true` is set in the review file; the entry flips to published.

### Reporting
Milestones are reported with actual test output and screenshots. Failures are reported as failures.

## 9. Delivery order

1. Scaffold, tokens, house rules doc, layer-1 guards and CI.
2. Site shell, demo runtime, and **Sticky** built end to end. **Visual checkpoint: Lucas reviews in the browser before anything else is built on top.**
3. Agent outputs and layer-2 browser checks.
4. Remaining five scroll terms (1–3, 5, 6) fully written; layer-3 review and Lucas's approval for all six.
5. The 41 drafts: name, definition, demo.
6. Deploy to Vercel at moveset.lucaslima.design.

## 10. Out of scope for v1

- Outside contributions (contributor docs, PR templates).
- Public slow-motion control (exists only in `/review`; could ship later).
- Analytics, accounts, comments, i18n.
- Final wordmark and brand (placeholder until Lucas designs it).

## 11. Hosting

- Domain: `moveset.lucaslima.design` (subdomain of Lucas's own domain), deployed via Vercel.
- The site URL lives in one config value (`SITE_URL`) used by every generated output, so a future move to another domain is a one-line change.
- Repo: `uxlucas/moveset`.
