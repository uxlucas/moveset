# moveset — Foundation + Sticky Checkpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the site foundation (term model, generator, guards, shell, demo runtime, index, entry page) and one fully written term (Sticky), ending at a visual checkpoint Lucas reviews in the browser.

**Architecture:** Next.js App Router with static generation. Each term is one `src/terms/<slug>.tsx` file that default-exports `defineTerm({...})` with its demo component in the same file. A generator script reads the folder and writes a gitignored registry, a `TermSlug` type and a serializable `terms-data.json`. Server components only ever read `terms-data.json`. Anything that renders a demo is a client component that imports the registry. (Term files use React hooks, and Next forbids hook imports in the server graph.)

**Tech Stack:** Next.js 16 (App Router, React 19), TypeScript, Tailwind CSS v4, Motion 14 (`motion/react`), next-themes, lucide-react, Vitest 5, Playwright, tsx.

**Spec:** `docs/superpowers/specs/2026-10-11-moveset-design.md`. Read it before starting. This plan covers spec §9 delivery steps 1–2.

**Out of this plan (next plans):** agent outputs (`/llms.txt`, `/api/terms.json`, `.md` routes, SKILL.md), axe and screenshot-baseline browser checks, the `/review` page, layer-3 reviews, the other five scroll terms, the 41 draft demos, and deploy.

## Global Constraints

- Platform: development happens on Windows. npm scripts must not use bash-only syntax (no `VAR=x cmd`, no `&&` chains that assume a POSIX shell beyond what npm runs cross-platform; `&&` is fine).
- Node ≥ 20.11, npm.
- Runtime dependencies are limited to: `next`, `react`, `react-dom`, `motion`, `next-themes`, `lucide-react`. Ask before adding any other runtime dependency.
- Term files (`src/terms/*.tsx`) never contain `'use client'` and are never imported from a server component, route handler or `layout.tsx`/`page.tsx`. Server code reads `@/generated/terms-data.json`.
- `SITE_URL = 'https://moveset.lucaslima.design'`; repo `uxlucas/moveset`; skill command `npx skills add uxlucas/moveset`.
- Motion tokens, verbatim:
  - `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`
  - `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`
  - `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`
  - durations 150 / 200 / 250 / 300ms
  - default spring `{ type: "spring", duration: 0.5, bounce: 0 }`
  - site press scale `0.97`
- Site chrome motion is limited to: copy→check icon swap, press feedback, 150ms hover color/shadow changes, theme-toggle switch knob. No page transitions, no scroll reveals, no `transition: all`, no `ease-in`, no `scale(0)`, no animated layout properties.
- Hover styles only via Tailwind `hover:` (v4 gates it to hover-capable devices).
- Text inputs are 16px (`text-base`) so iOS doesn't zoom.
- Mobile side gutter 16px (`px-4`); no horizontal page scroll at 375px.
- Copy is plain, specific and calm. Definitions are one sentence, ≤ 140 characters. Blocked words: seamless, seamlessly, leverage, delve, robust, elevate, effortless, effortlessly, cutting-edge, unlock, game-changer.
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Do not push to GitHub or create the remote repo. Lucas does that, or asks for it.

## Spec amendments made by this plan

These are folded into the spec in Task 1, Step 9:
1. A third status, `review`: content complete with the published-field requirements, visible only when `NEXT_PUBLIC_SHOW_REVIEW=1` (set in `.env.development`), hidden from production and agent outputs. Sticky lives in `review` until Lucas approves it.
2. `demo.label` (required): a text description of the motion, used for screen readers and semantic HTML.
3. Demo contract adds `onCycleEnd: () => void`. A demo calls it when one cycle finishes; the runtime decides whether to loop.
4. `code` may also return `js` (vanilla JavaScript) next to `css`, `motion`, `gsap`.
5. No `output: 'export'`. Pages are statically generated on Vercel, so dynamic routes with zero published terms still build.
6. Focus rings use `outline` (which follows `border-radius` in all current browsers) instead of box-shadow.

## Review Focus

1. **Messy search input:** "  Scroll Linked ", "scroll-linked" and "SCROLL linked" should all find Scroll-linked. Pinned by a unit test in Task 3 and an e2e test in Task 8.
2. **First paint with system dark mode:** the page must render dark on first paint with no hydration warning, and the theme label must not jump width. Pinned by an e2e test in Task 6.
3. **Rapid replay or control changes mid-cycle:** must never stack two animations on one demo. Pinned by the `data-active` e2e test in Task 10.
4. **Clipboard unavailable or denied:** must show "Couldn't copy", never a fake check. Pinned by a unit test and an e2e test in Task 8.
5. **Direct URL to a draft term or draft compare pair:** returns 404, and prev/next never link to drafts. Pinned by e2e tests in Task 10.

---

## File map

```
.env.development                      NEXT_PUBLIC_SHOW_REVIEW=1
.githooks/pre-commit                  runs npm run check
.github/workflows/ci.yml              check + build + e2e
content-lint.config.ts                per-term lint exceptions
docs/house-rules.md                   motion + interface rules, in our words
next.config.ts
playwright.config.ts                  e2e config (dev server on :3100)
playwright.checkpoint.config.ts       screenshot run for the checkpoint
tsconfig.scripts.json                 tsx config for scripts (jsx: react-jsx)
vitest.config.ts
reviews/.gitkeep                      layer-3 review files land here (next plan)
scripts/generate.ts                   CLI: writes src/generated/*
scripts/lib/registry.ts               pure render/extract helpers (+ .test.ts)
src/app/globals.css                   tokens, theme, base styles
src/app/layout.tsx                    fonts, theme provider, header, sidebar
src/app/page.tsx                      index
src/app/about/page.tsx
src/app/not-found.tsx
src/app/terms/[slug]/page.tsx         server shell → EntryView
src/app/compare/[pair]/page.tsx       server shell → CompareView
src/lib/site.ts                       SITE_URL, repo, command
src/lib/categories.ts                 the seven categories
src/lib/term-types.ts                 defineTerm + all term types
src/lib/term-types.typetest.ts        compile-time tests
src/lib/term-data.ts                  TermData (serializable subset)
src/lib/content.ts                    grouping, visibility, search, neighbors, pairs (+ .test.ts)
src/lib/lint.ts                       content lint rules (+ .test.ts)
src/lib/reviews.ts                    reads reviews/*.md (node only)
src/lib/tokens.ts                     token name → value
src/lib/prompt.ts                     copy-as-prompt + markdown builders (+ .test.ts)
src/lib/clipboard.ts                  copyText (+ .test.ts)
src/lib/terms.ts                      client registry access: terms, getTerm
src/content.test.ts                   runs the lint over real content
src/components/copy-button.tsx
src/components/site/{header,theme-toggle,sidebar,category-icon,soon-pill}.tsx
src/components/demo/playback.ts       pure playback rules (+ .test.ts)
src/components/demo/{use-page-visible,use-reduced-motion,use-auto-scroll}.ts
src/components/demo/{demo-player,demo-controls,browser-frame,placeholder-demo}.tsx
src/components/index/{intro,term-browser,term-card,filter-pills,use-scroll-edges}.tsx|ts
src/components/entry/{entry-view,code-tabs,compare-view}.tsx
src/terms/*.tsx                       47 term files
src/generated/                        gitignored: registry.ts, slugs.ts, terms-data.json
tests/e2e/{helpers,shell,index,sticky,entry}.spec.ts
tests/checkpoint/checkpoint.spec.ts
```

---

### Task 1: Scaffold, tooling and house rules

**Files:**
- Create: Next.js scaffold, `next.config.ts`, `vitest.config.ts`, `tsconfig.scripts.json`, `.env.development`, `docs/house-rules.md`, `reviews/.gitkeep`, `src/terms/.gitkeep`
- Modify: `package.json` (scripts), `.gitignore`, `docs/superpowers/specs/2026-10-11-moveset-design.md` (amendments)

**Interfaces:**
- Produces: npm scripts `generate`, `dev`, `build`, `typecheck`, `test`, `test:e2e`, `check`, `checkpoint`; path alias `@/*` → `src/*`.

- [ ] **Step 1: Scaffold Next.js into the existing repo**

Run from `C:\Users\lucas\Desktop\moveset-dev`:

```bash
npx create-next-app@latest . --ts --tailwind --app --src-dir --import-alias "@/*" --use-npm --turbopack --no-eslint --yes
```

Requirements, if a flag is rejected by the installed version: TypeScript, Tailwind, App Router, `src/` dir, alias `@/*`, npm, no ESLint. Check `npx create-next-app@latest --help` for the equivalent flag. If it refuses because the folder isn't empty, scaffold into `../moveset-scaffold`, then move everything except `.git` into this folder and delete the temp folder.

Expected: `package.json`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css` exist.

- [ ] **Step 2: Install dependencies**

```bash
npm install motion next-themes lucide-react
npm install -D vitest tsx @playwright/test
npx playwright install chromium
```

- [ ] **Step 3: Remove scaffold boilerplate**

Delete `public/*.svg`. Replace `src/app/page.tsx` with:

```tsx
export default function Home() {
  return <main>moveset</main>
}
```

- [ ] **Step 4: Write `next.config.ts`**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
}

export default nextConfig
```

- [ ] **Step 5: Write `tsconfig.scripts.json` and `vitest.config.ts`**

`tsconfig.scripts.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "module": "esnext",
    "moduleResolution": "bundler"
  }
}
```

`vitest.config.ts`:

```ts
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  esbuild: { jsx: 'automatic' },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
  },
})
```

- [ ] **Step 6: Scripts, env and ignores**

In `package.json`, set `"scripts"` to:

```json
{
  "generate": "tsx --tsconfig tsconfig.scripts.json scripts/generate.ts",
  "predev": "npm run generate",
  "dev": "next dev",
  "prebuild": "npm run generate",
  "build": "next build",
  "start": "next start",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:e2e": "playwright test",
  "checkpoint": "playwright test -c playwright.checkpoint.config.ts",
  "check": "npm run generate && npm run typecheck && npm run test",
  "prepare": "git config core.hooksPath .githooks"
}
```

Create `.env.development`:

```
NEXT_PUBLIC_SHOW_REVIEW=1
```

Append to `.gitignore`:

```
# moveset
/src/generated/
/test-results/
/playwright-report/
```

Create empty files `reviews/.gitkeep` and `src/terms/.gitkeep`.

- [ ] **Step 7: Write a stub generator so `npm run generate` succeeds**

Create `scripts/generate.ts` (Task 2 replaces it):

```ts
console.log('generate: no terms yet')
```

- [ ] **Step 8: Write `docs/house-rules.md`**

```markdown
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
- Blocked: seamless, leverage, delve, robust, elevate, effortless, cutting-edge, unlock, game-changer.
```

- [ ] **Step 9: Fold the spec amendments into the spec**

In `docs/superpowers/specs/2026-10-11-moveset-design.md`:
- §4 Fields table: change `status` notes to `'draft' | 'review' | 'published'`. Add a row `demo.label` (required for all statuses: a text description of the motion). Change the `code` row to `(values) => { css?, js?, motion?, gsap? }`. Change the "Published" column header to "Review / Published".
- §4: after the paragraph "TypeScript enforces the table…", add: "`review` means the content is complete but not yet approved. Review terms are visible only when `NEXT_PUBLIC_SHOW_REVIEW=1` (local development) and never appear in production or agent outputs."
- §4 Demo component contract: add the line `onCycleEnd: () => void   // call when one cycle finishes; the runtime decides whether to loop` to the type.
- §3 Stack: change "fully static output" to "statically generated pages (no `output: 'export'`, so routes with zero published terms still build)".
- §6 Interface basics: replace "Focus rings via box-shadow so they follow radius" with "Focus rings via `outline` with offset (it follows radius in current browsers)".

- [ ] **Step 10: Verify the scaffold**

```bash
npm run check
npm run build
```

Expected: `check` prints "generate: no terms yet", typecheck passes and vitest reports no test files and passes. `build` completes.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app, tooling and house rules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Term model and generator

**Files:**
- Create: `src/lib/categories.ts`, `src/lib/term-types.ts`, `src/lib/term-types.typetest.ts`, `src/lib/term-data.ts`, `scripts/lib/registry.ts`, `scripts/lib/registry.test.ts`
- Modify: `scripts/generate.ts`

**Interfaces:**
- Produces:
  - `CATEGORIES` (readonly array of `{ slug, name, short, hue }`), `CategorySlug`, `Category`, `getCategory(slug): Category`, `categoryColor(hue: number): string`
  - `Control`, `RangeControl`, `SelectControl`, `ToggleControl`, `ControlValue`, `Values`, `ControlValues<C>`, `DemoProps<V>`, `CodeRef`, `Source`, `TermInput<C>`, `Term`, `FullTerm`, `TermStatus`, `defineTerm<C>(t): Term`, `isFull(t): t is FullTerm`
  - `TermData` (serializable)
  - Generated: `@/generated/slugs` → `SLUGS`, `TermSlug`; `@/generated/registry` → `terms: readonly Term[]`; `@/generated/terms-data.json` → `TermData[]`
  - `slugFromFile(file): string`, `renderSlugs(slugs): string`, `renderRegistry(slugs): string`, `toTermData(terms): TermData[]`, `assertSlugsMatch(terms, slugs): void`

- [ ] **Step 1: Write the generator tests**

`scripts/lib/registry.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { assertSlugsMatch, renderRegistry, renderSlugs, slugFromFile, toTermData } from './registry'

describe('slugFromFile', () => {
  test('strips the extension', () => {
    expect(slugFromFile('scroll-snap.tsx')).toBe('scroll-snap')
  })
  test('rejects names that are not kebab-case', () => {
    expect(() => slugFromFile('ScrollSnap.tsx')).toThrow(/kebab-case/)
    expect(() => slugFromFile('scroll_snap.tsx')).toThrow(/kebab-case/)
  })
})

describe('renderSlugs', () => {
  test('emits a const tuple and a union type', () => {
    const src = renderSlugs(['a', 'b-c'])
    expect(src).toContain("export const SLUGS = ['a', 'b-c'] as const")
    expect(src).toContain('export type TermSlug = (typeof SLUGS)[number]')
  })
  test('handles no terms', () => {
    expect(renderSlugs([])).toContain('export const SLUGS = [] as const')
  })
})

describe('renderRegistry', () => {
  test('imports every term in order', () => {
    const src = renderRegistry(['a', 'b'])
    expect(src).toContain("import t0 from '@/terms/a'")
    expect(src).toContain("import t1 from '@/terms/b'")
    expect(src).toContain('export const terms: readonly Term[] = [t0, t1]')
  })
})

describe('toTermData', () => {
  test('keeps only serializable fields and fills defaults', () => {
    const data = toTermData([
      {
        slug: 'a', name: 'A', category: 'scroll', order: 1, status: 'draft', definition: 'A.',
        demo: { component: () => null, label: 'x' },
      },
    ] as never)
    expect(data).toEqual([
      {
        slug: 'a', name: 'A', category: 'scroll', order: 1, status: 'draft', definition: 'A.',
        aliases: [], confusedWith: [], sources: [],
      },
    ])
  })
})

describe('assertSlugsMatch', () => {
  test('throws when a file exports a different slug', () => {
    expect(() => assertSlugsMatch([{ slug: 'b' }] as never, ['a'])).toThrow(/a\.tsx exports slug "b"/)
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run scripts/lib/registry.test.ts`
Expected: FAIL, cannot resolve `./registry`.

- [ ] **Step 3: Write `src/lib/categories.ts`**

```ts
export const CATEGORIES = [
  { slug: 'scroll', name: 'Scroll', short: 'Scroll', hue: 250 },
  { slug: 'motion', name: 'Motion & Easing', short: 'Motion', hue: 35 },
  { slug: 'transitions', name: 'Transitions', short: 'Transitions', hue: 300 },
  { slug: 'gestures', name: 'Gestures', short: 'Gestures', hue: 150 },
  { slug: 'layout', name: 'Layout', short: 'Layout', hue: 195 },
  { slug: 'states', name: 'States & Feedback', short: 'States', hue: 75 },
  { slug: 'visual', name: 'Typography & Visual', short: 'Visual', hue: 350 },
] as const

export type Category = (typeof CATEGORIES)[number]
export type CategorySlug = Category['slug']

export function getCategory(slug: CategorySlug): Category {
  const category = CATEGORIES.find((c) => c.slug === slug)
  if (!category) throw new Error(`Unknown category "${slug}"`)
  return category
}

export function categoryColor(hue: number): string {
  return `oklch(0.64 0.16 ${hue})`
}
```

- [ ] **Step 4: Write `src/lib/term-data.ts`**

```ts
import type { CategorySlug } from './categories'

export type TermStatus = 'draft' | 'review' | 'published'

// The serializable part of a term. Server components read this, never the term files.
export type TermData = {
  slug: string
  name: string
  category: CategorySlug
  order: number
  status: TermStatus
  definition: string
  aliases: string[]
  confusedWith: { slug: string; difference: string }[]
  sources: { label: string; url: string }[]
}
```

- [ ] **Step 5: Write `src/lib/term-types.ts`**

```ts
import type { ComponentType } from 'react'
import type { TermSlug } from '@/generated/slugs'
import type { CategorySlug } from './categories'
import type { TermStatus } from './term-data'

export type { TermStatus }

export type RangeControl = {
  readonly id: string
  readonly type: 'range'
  readonly label: string
  readonly min: number
  readonly max: number
  readonly step: number
  readonly unit?: string
  readonly default: number
}
export type SelectOption = { readonly value: string; readonly label: string }
export type SelectControl = {
  readonly id: string
  readonly type: 'select'
  readonly label: string
  readonly options: readonly SelectOption[]
  readonly default: string
}
export type ToggleControl = {
  readonly id: string
  readonly type: 'toggle'
  readonly label: string
  readonly default: boolean
}
export type Control = RangeControl | SelectControl | ToggleControl

export type ControlValue = number | string | boolean
export type Values = Record<string, ControlValue>

type ValueOf<K> = K extends { type: 'range' }
  ? number
  : K extends { type: 'toggle' }
    ? boolean
    : K extends { type: 'select'; options: readonly (infer O)[] }
      ? O extends { value: infer V }
        ? V
        : never
      : never

export type ControlValues<C extends readonly Control[]> = {
  [K in C[number] as K['id']]: ValueOf<K>
}

export type DemoProps<V = Values> = {
  values: V
  /** false when off-screen, tab hidden, or reduced motion before the visitor presses play */
  playing: boolean
  /** changes on replay; run one cycle from the start */
  replayKey: number
  size: 'card' | 'detail'
  /** 1 normally, 0.25 in slow motion; divide durations by it */
  timeScale: number
  /** call when one cycle finishes; the runtime decides whether to loop */
  onCycleEnd: () => void
}

export type CodeRef = { css?: string; js?: string; motion?: string; gsap?: string }
export type Source = { readonly label: string; readonly url: string }

type Base<C extends readonly Control[]> = {
  slug: string
  name: string
  category: CategorySlug
  order: number
  definition: string
  demo: {
    component: ComponentType<DemoProps<ControlValues<C>>>
    /** what the demo shows, for screen readers and agents */
    label: string
    controls?: C
  }
  aliases?: readonly string[]
  confusedWith?: readonly { slug: TermSlug; difference: string }[]
  sources?: readonly Source[]
}

type Full<C extends readonly Control[]> = {
  aliases: readonly string[]
  description: string
  useWhen: readonly string[]
  avoidWhen: readonly string[]
  prompt: (v: ControlValues<C>) => string
  acceptance: (v: ControlValues<C>) => readonly string[]
  code: (v: ControlValues<C>) => CodeRef
  a11y: string
  related: readonly TermSlug[]
}

export type TermInput<C extends readonly Control[]> =
  | (Base<C> & { status: 'draft' })
  | (Base<C> & Full<C> & { status: 'review' | 'published' })

/** The erased shape every term has once defined. */
export type Term = TermInput<readonly Control[]>
export type FullTerm = Extract<Term, { status: 'review' | 'published' }>

export function defineTerm<const C extends readonly Control[] = readonly []>(term: TermInput<C>): Term {
  return term as unknown as Term
}

export function isFull(term: Term): term is FullTerm {
  return term.status !== 'draft'
}
```

- [ ] **Step 6: Write `scripts/lib/registry.ts`**

```ts
import type { Term } from '../../src/lib/term-types'
import type { TermData } from '../../src/lib/term-data'

const HEADER = '// Generated by scripts/generate.ts. Do not edit.\n'
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function slugFromFile(file: string): string {
  const slug = file.replace(/\.tsx$/, '')
  if (!KEBAB.test(slug)) {
    throw new Error(`Invalid term filename "${file}": use kebab-case like "scroll-snap.tsx".`)
  }
  return slug
}

export function renderSlugs(slugs: readonly string[]): string {
  const list = slugs.map((s) => `'${s}'`).join(', ')
  return `${HEADER}export const SLUGS = [${list}] as const\nexport type TermSlug = (typeof SLUGS)[number]\n`
}

export function renderRegistry(slugs: readonly string[]): string {
  const imports = slugs.map((s, i) => `import t${i} from '@/terms/${s}'`).join('\n')
  const list = slugs.map((_, i) => `t${i}`).join(', ')
  return `${HEADER}import type { Term } from '@/lib/term-types'\n${imports}\n\nexport const terms: readonly Term[] = [${list}]\n`
}

export function assertSlugsMatch(terms: readonly Pick<Term, 'slug'>[], slugs: readonly string[]): void {
  terms.forEach((term, i) => {
    if (term.slug !== slugs[i]) {
      throw new Error(`${slugs[i]}.tsx exports slug "${term.slug}". The slug must match the filename.`)
    }
  })
}

export function toTermData(terms: readonly Term[]): TermData[] {
  return terms.map((t) => ({
    slug: t.slug,
    name: t.name,
    category: t.category,
    order: t.order,
    status: t.status,
    definition: t.definition,
    aliases: [...(t.aliases ?? [])],
    confusedWith: (t.confusedWith ?? []).map((c) => ({ slug: c.slug, difference: c.difference })),
    sources: (t.sources ?? []).map((s) => ({ label: s.label, url: s.url })),
  }))
}
```

- [ ] **Step 7: Replace `scripts/generate.ts`**

```ts
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { assertSlugsMatch, renderRegistry, renderSlugs, slugFromFile, toTermData } from './lib/registry'

const root = fileURLToPath(new URL('..', import.meta.url))
const termsDir = path.join(root, 'src/terms')
const outDir = path.join(root, 'src/generated')

function writeIfChanged(file: string, content: string) {
  if (existsSync(file) && readFileSync(file, 'utf8') === content) return
  writeFileSync(file, content)
}

async function main() {
  const files = readdirSync(termsDir).filter((f) => f.endsWith('.tsx')).sort()
  const slugs = files.map(slugFromFile)
  mkdirSync(outDir, { recursive: true })
  writeIfChanged(path.join(outDir, 'slugs.ts'), renderSlugs(slugs))
  writeIfChanged(path.join(outDir, 'registry.ts'), renderRegistry(slugs))

  const { terms } = await import(pathToFileURL(path.join(outDir, 'registry.ts')).href)
  assertSlugsMatch(terms, slugs)
  writeIfChanged(path.join(outDir, 'terms-data.json'), JSON.stringify(toTermData(terms), null, 2) + '\n')
  console.log(`generate: ${slugs.length} terms`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
```

- [ ] **Step 8: Run the generator tests**

Run: `npm run generate && npx vitest run scripts/lib/registry.test.ts`
Expected: "generate: 0 terms", then all registry tests PASS.

- [ ] **Step 9: Write the compile-time type tests**

`src/lib/term-types.typetest.ts` (checked by `tsc`; each `@ts-expect-error` fails the typecheck if the error it expects doesn't happen):

```ts
import { defineTerm, type Control, type ControlValues, type DemoProps } from './term-types'

const Demo = (_: DemoProps<any>) => null

const controls = [
  { id: 'offset', type: 'range', label: 'Offset', min: 0, max: 10, step: 1, default: 0 },
  { id: 'mode', type: 'select', label: 'Mode', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }], default: 'a' },
  { id: 'on', type: 'toggle', label: 'On', default: true },
] as const satisfies readonly Control[]

type V = ControlValues<typeof controls>
export const ok: V = { offset: 1, mode: 'b', on: false }
// @ts-expect-error mode only accepts declared option values
export const badMode: V = { offset: 1, mode: 'c', on: false }

defineTerm({ slug: 'x', name: 'X', category: 'scroll', order: 1, status: 'draft', definition: 'X.', demo: { component: Demo, label: 'x' } })

// @ts-expect-error review and published terms need description, prompt, acceptance, code, a11y, related, aliases
defineTerm({ slug: 'x', name: 'X', category: 'scroll', order: 1, status: 'published', definition: 'X.', demo: { component: Demo, label: 'x' } })

defineTerm({
  slug: 'x', name: 'X', category: 'scroll', order: 1, status: 'review', definition: 'X.',
  demo: { component: Demo, label: 'x', controls },
  aliases: [], description: 'd', useWhen: [], avoidWhen: [], a11y: 'a', related: [],
  prompt: (v) => `offset ${v.offset.toFixed(0)} mode ${v.mode}`,
  acceptance: (v) => [String(v.on)],
  code: () => ({ css: '' }),
})

defineTerm({
  slug: 'x', name: 'X', category: 'scroll', order: 1, status: 'review', definition: 'X.',
  demo: { component: Demo, label: 'x', controls },
  aliases: [], description: 'd', useWhen: [], avoidWhen: [], a11y: 'a', related: [],
  // @ts-expect-error prompt can only read declared controls
  prompt: (v) => `${v.missing}`,
  acceptance: () => [],
  code: () => ({}),
})

// @ts-expect-error category must be one of the seven
defineTerm({ slug: 'x', name: 'X', category: 'misc', order: 1, status: 'draft', definition: 'X.', demo: { component: Demo, label: 'x' } })

// @ts-expect-error demo needs a label
defineTerm({ slug: 'x', name: 'X', category: 'scroll', order: 1, status: 'draft', definition: 'X.', demo: { component: Demo } })
```

- [ ] **Step 10: Run the typecheck**

Run: `npm run typecheck`
Expected: PASS, with no "Unused '@ts-expect-error' directive" errors. If inference of `C` from `demo.controls` fails (errors on the `prompt: (v) =>` lines), change those two calls to `defineTerm<typeof controls>({...})`. Write the same pattern into the Sticky term in Task 9.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: term model, defineTerm types and registry generator

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Content helpers

**Files:**
- Create: `src/lib/content.ts`, `src/lib/content.test.ts`, `src/lib/site.ts`, `src/lib/tokens.ts`, `src/lib/terms.ts`

**Interfaces:**
- Consumes: `CATEGORIES`, `Category`, `Control`, `Values`, `Term`, `terms` from `@/generated/registry`
- Produces:
  - `isVisible(t: { status: TermStatus }, showReview?: boolean): boolean`
  - `groupByCategory<T extends Listable>(terms: readonly T[]): { category: Category; terms: T[] }[]`
  - `neighbors<T extends Listable>(terms: readonly T[], slug: string, showReview?: boolean): { prev?: T; next?: T }`
  - `normalize(s: string): string`, `matchesQuery(t: Listable, query: string): boolean`
  - `confusedPairs(terms): ConfusedPair[]` where `ConfusedPair = { a: string; b: string; difference: string }`, `compareSlug(a, b): string`
  - `defaultValues(controls?: readonly Control[]): Values`
  - `SITE_URL`, `SITE_NAME`, `REPO`, `REPO_URL`, `SKILL_COMMAND`, `AUTHOR_NAME`, `AUTHOR_URL`
  - `TOKENS: Record<string, string>`
  - `terms`, `getTerm(slug): Term`

- [ ] **Step 1: Write the failing tests**

`src/lib/content.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import {
  compareSlug, confusedPairs, defaultValues, groupByCategory, isVisible, matchesQuery, neighbors, normalize,
} from './content'
import type { TermData } from './term-data'

function t(over: Partial<TermData> & Pick<TermData, 'slug'>): TermData {
  return {
    name: over.slug, category: 'scroll', order: 1, status: 'published', definition: 'A thing.',
    aliases: [], confusedWith: [], sources: [], ...over,
  }
}

describe('isVisible', () => {
  test('published is always visible, drafts never', () => {
    expect(isVisible({ status: 'published' }, false)).toBe(true)
    expect(isVisible({ status: 'draft' }, true)).toBe(false)
  })
  test('review is visible only when review mode is on', () => {
    expect(isVisible({ status: 'review' }, true)).toBe(true)
    expect(isVisible({ status: 'review' }, false)).toBe(false)
  })
})

describe('groupByCategory', () => {
  test('returns all seven categories in display order, terms sorted by order', () => {
    const groups = groupByCategory([t({ slug: 'b', order: 2 }), t({ slug: 'a', order: 1 }), t({ slug: 'm', category: 'motion' })])
    expect(groups.map((g) => g.category.slug)).toEqual(['scroll', 'motion', 'transitions', 'gestures', 'layout', 'states', 'visual'])
    expect(groups[0].terms.map((x) => x.slug)).toEqual(['a', 'b'])
    expect(groups[1].terms.map((x) => x.slug)).toEqual(['m'])
  })
})

describe('neighbors', () => {
  const list = [
    t({ slug: 'one', order: 1 }),
    t({ slug: 'two', order: 2, status: 'draft' }),
    t({ slug: 'three', order: 3 }),
    t({ slug: 'other', order: 4, category: 'motion' }),
  ]
  test('skips drafts and stays inside the category', () => {
    expect(neighbors(list, 'one', false)).toEqual({ prev: undefined, next: list[2] })
    expect(neighbors(list, 'three', false)).toEqual({ prev: list[0], next: undefined })
  })
  test('unknown slug has no neighbors', () => {
    expect(neighbors(list, 'nope', false)).toEqual({})
  })
})

describe('search', () => {
  const term = t({ slug: 'scroll-linked', name: 'Scroll-linked', definition: 'Progress tied to scroll.', aliases: ['header that stays'] })
  test('normalize lowercases and turns hyphens into spaces', () => {
    expect(normalize('  Scroll-Linked  ')).toBe('scroll linked')
  })
  test.each(['scroll-linked', '  Scroll Linked ', 'SCROLL linked', 'linked scroll', 'header stays', ''])(
    'matches "%s"', (q) => expect(matchesQuery(term, q)).toBe(true),
  )
  test('does not match unrelated words', () => {
    expect(matchesQuery(term, 'parallax')).toBe(false)
  })
})

describe('confusedPairs', () => {
  test('merges both directions into one pair with a stable slug', () => {
    const pairs = confusedPairs([
      t({ slug: 'sticky', confusedWith: [{ slug: 'parallax', difference: 'D1' }] }),
      t({ slug: 'parallax', confusedWith: [{ slug: 'sticky', difference: 'D2' }] }),
    ])
    expect(pairs).toEqual([{ a: 'parallax', b: 'sticky', difference: 'D1' }])
    expect(compareSlug('sticky', 'parallax')).toBe('parallax-vs-sticky')
  })
})

describe('defaultValues', () => {
  test('maps control ids to defaults', () => {
    expect(defaultValues([
      { id: 'a', type: 'range', label: 'A', min: 0, max: 1, step: 1, default: 1 },
      { id: 'b', type: 'toggle', label: 'B', default: false },
    ])).toEqual({ a: 1, b: false })
    expect(defaultValues()).toEqual({})
  })
})
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/lib/content.test.ts`
Expected: FAIL, cannot resolve `./content`.

- [ ] **Step 3: Write `src/lib/content.ts`**

```ts
import { CATEGORIES, type Category } from './categories'
import type { TermStatus } from './term-data'
import type { Control, Values } from './term-types'

type Listable = {
  slug: string
  name: string
  category: string
  order: number
  status: TermStatus
  definition: string
  aliases?: readonly string[]
}

export function isVisible(
  term: { status: TermStatus },
  showReview: boolean = process.env.NEXT_PUBLIC_SHOW_REVIEW === '1',
): boolean {
  return term.status === 'published' || (showReview && term.status === 'review')
}

const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order

export function groupByCategory<T extends Listable>(terms: readonly T[]): { category: Category; terms: T[] }[] {
  return CATEGORIES.map((category) => ({
    category,
    terms: terms.filter((t) => t.category === category.slug).sort(byOrder),
  }))
}

export function neighbors<T extends Listable>(
  terms: readonly T[],
  slug: string,
  showReview?: boolean,
): { prev?: T; next?: T } {
  const current = terms.find((t) => t.slug === slug)
  if (!current) return {}
  const siblings = terms
    .filter((t) => t.category === current.category && (t.slug === slug || isVisible(t, showReview)))
    .sort(byOrder)
  const i = siblings.indexOf(current)
  return { prev: siblings[i - 1], next: siblings[i + 1] }
}

export function normalize(s: string): string {
  return s.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function matchesQuery(term: Listable, query: string): boolean {
  const q = normalize(query)
  if (!q) return true
  const haystack = normalize([term.name, term.definition, ...(term.aliases ?? [])].join(' '))
  return q.split(' ').every((word) => haystack.includes(word))
}

export type ConfusedPair = { a: string; b: string; difference: string }

export function compareSlug(a: string, b: string): string {
  const [x, y] = [a, b].sort()
  return `${x}-vs-${y}`
}

export function confusedPairs(
  terms: readonly { slug: string; confusedWith?: readonly { slug: string; difference: string }[] }[],
): ConfusedPair[] {
  const pairs = new Map<string, ConfusedPair>()
  for (const term of terms) {
    for (const c of term.confusedWith ?? []) {
      const [a, b] = [term.slug, c.slug].sort()
      const key = compareSlug(a, b)
      if (!pairs.has(key)) pairs.set(key, { a, b, difference: c.difference })
    }
  }
  return [...pairs.values()]
}

export function defaultValues(controls: readonly Control[] = []): Values {
  return Object.fromEntries(controls.map((c) => [c.id, c.default]))
}
```

- [ ] **Step 4: Write `src/lib/site.ts`, `src/lib/tokens.ts`, `src/lib/terms.ts`**

`src/lib/site.ts`:

```ts
export const SITE_URL = 'https://moveset.lucaslima.design'
export const SITE_NAME = 'moveset'
export const REPO = 'uxlucas/moveset'
export const REPO_URL = `https://github.com/${REPO}`
export const SKILL_COMMAND = `npx skills add ${REPO}`
export const AUTHOR_NAME = 'Lucas Lima'
export const AUTHOR_URL = 'https://lucaslima.design'
```

`src/lib/tokens.ts`:

```ts
// Mirrors the tokens in src/app/globals.css. Prompts list the ones they reference.
export const TOKENS: Record<string, string> = {
  '--ease-out': 'cubic-bezier(0.23, 1, 0.32, 1)',
  '--ease-in-out': 'cubic-bezier(0.77, 0, 0.175, 1)',
  '--ease-drawer': 'cubic-bezier(0.32, 0.72, 0, 1)',
  '--duration-1': '150ms',
  '--duration-2': '200ms',
  '--duration-3': '250ms',
  '--duration-4': '300ms',
}
```

`src/lib/terms.ts` (client side only: it imports every term file):

```ts
import { terms } from '@/generated/registry'
import type { Term } from './term-types'

export { terms }

export function getTerm(slug: string): Term {
  const term = terms.find((t) => t.slug === slug)
  if (!term) throw new Error(`Unknown term "${slug}"`)
  return term
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/lib/content.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: content helpers for grouping, search, neighbors and compare pairs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Content lint and automatic guards

**Files:**
- Create: `src/lib/lint.ts`, `src/lib/lint.test.ts`, `src/lib/reviews.ts`, `src/content.test.ts`, `content-lint.config.ts`, `.githooks/pre-commit`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `Term`, `defineTerm`, `defaultValues`, `TermSlug`
- Produces: `lintTerms(terms: readonly Term[], reviews: readonly Review[], config: LintConfig): LintIssue[]`, `parseFrontmatter(src): Record<string, string | boolean>`, `loadReviews(dir): Review[]`, `BLOCKED_WORDS`, types `LintIssue`, `Review`, `LintConfig`

- [ ] **Step 1: Write the failing lint tests**

`src/lib/lint.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import type { TermSlug } from '@/generated/slugs'
import { lintTerms, parseFrontmatter, type LintConfig, type Review } from './lint'
import { defineTerm, type Term } from './term-types'

const config: LintConfig = { allowLayoutProps: [], allowEaseIn: [] }

const base = defineTerm({
  slug: 'demo', name: 'Demo', category: 'scroll', order: 1, status: 'review',
  definition: 'A short, clear definition.',
  demo: { component: () => null, label: 'A demo.' },
  aliases: ['demo alias'], description: 'Plain description.', useWhen: ['Often.'], avoidWhen: ['Rarely.'],
  a11y: 'Note.', related: [],
  prompt: () => 'Build it.',
  acceptance: () => ['It works.'],
  code: () => ({ css: '.a { opacity: 1; }' }),
})

function term(over: Record<string, unknown> = {}): Term {
  return { ...base, ...over } as Term
}
function rules(terms: Term[], reviews: Review[] = [], cfg = config) {
  return lintTerms(terms, reviews, cfg).map((i) => i.rule)
}
const css = (src: string) => ({ code: () => ({ css: src }) })

describe('definitions', () => {
  test('a clean term passes', () => expect(rules([term()])).toEqual([]))
  test('must end with a period', () => expect(rules([term({ definition: 'No period' })])).toContain('definition-sentence'))
  test('must be one sentence', () => expect(rules([term({ definition: 'One. Two.' })])).toContain('definition-sentence'))
  test('must be at most 140 characters', () => {
    expect(rules([term({ definition: `${'a'.repeat(140)}.` })])).toContain('definition-length')
  })
})

describe('uniqueness', () => {
  test('aliases are unique across terms, ignoring case', () => {
    expect(rules([term(), term({ slug: 'other', order: 2, aliases: ['Demo Alias'] })])).toContain('alias-duplicate')
  })
  test('order is unique within a category but may repeat across categories', () => {
    expect(rules([term(), term({ slug: 'other', aliases: [] })])).toContain('order-duplicate')
    expect(rules([term(), term({ slug: 'other', aliases: [], category: 'motion' })])).toEqual([])
  })
  test('a term cannot be confused with itself', () => {
    expect(rules([term({ confusedWith: [{ slug: 'demo' as TermSlug, difference: 'D.' }] })])).toContain('confused-self')
  })
})

describe('blocked words', () => {
  test('flags blocked words in prose', () => expect(rules([term({ description: 'A seamless effect.' })])).toContain('blocked-word'))
  test('does not flag longer words that contain them', () => expect(rules([term({ description: 'An elevated card.' })])).toEqual([]))
})

describe('code rules', () => {
  test('ease-in is flagged, ease-in-out is not', () => {
    expect(rules([term(css('.a { transition: opacity 200ms ease-in; } @media (prefers-reduced-motion: reduce) {}'))])).toContain('code-ease-in')
    expect(rules([term(css('.a { transition: opacity 200ms ease-in-out; } @media (prefers-reduced-motion: reduce) {}'))])).toEqual([])
  })
  test('Motion easeIn is flagged, easeInOut is not', () => {
    expect(rules([term({ code: () => ({ motion: 'useReducedMotion(); animate(el, { opacity: 1 }, { ease: "easeIn" })' }) })])).toContain('code-ease-in')
    expect(rules([term({ code: () => ({ motion: 'useReducedMotion(); animate(el, { opacity: 1 }, { ease: "easeInOut" })' }) })])).toEqual([])
  })
  test('allowEaseIn exempts a term', () => {
    expect(rules([term(css('.a { transition: opacity 1s ease-in; } @media (prefers-reduced-motion: reduce) {}'))], [], { ...config, allowEaseIn: ['demo'] })).toEqual([])
  })
  test('transition: all and transition-all are flagged', () => {
    expect(rules([term(css('.a { transition: all 200ms; } @media (prefers-reduced-motion: reduce) {}'))])).toContain('code-transition-all')
    expect(rules([term(css('<div className="transition-all" /> prefers-reduced-motion'))])).toContain('code-transition-all')
  })
  test('scale(0) and scale: 0 are flagged, 0.95 is not', () => {
    expect(rules([term(css('.a { transform: scale(0); }'))])).toContain('code-scale-zero')
    expect(rules([term({ code: () => ({ motion: 'initial={{ scale: 0 }}' }) })])).toContain('code-scale-zero')
    expect(rules([term(css('.a { transform: scale(0.95); }'))])).toEqual([])
    expect(rules([term({ code: () => ({ motion: 'initial={{ scale: 0.96 }}' }) })])).toEqual([])
  })
  test('animated layout properties are flagged unless exempted', () => {
    const src = css('.a { transition: height 200ms; } @media (prefers-reduced-motion: reduce) {}')
    expect(rules([term(src)])).toContain('code-layout-prop')
    expect(rules([term(src)], [], { ...config, allowLayoutProps: ['demo'] })).toEqual([])
    expect(rules([term(css('.a { transition: transform 200ms; } @media (prefers-reduced-motion: reduce) {}'))])).toEqual([])
  })
  test('motion code needs a reduced-motion path', () => {
    expect(rules([term(css('.a { transition: opacity 200ms; }'))])).toContain('code-reduced-motion')
    expect(rules([term(css('.a { font-variant-numeric: tabular-nums; }'))])).toEqual([])
  })
  test('drafts skip code rules', () => {
    const draft = defineTerm({ slug: 'demo', name: 'Demo', category: 'scroll', order: 1, status: 'draft', definition: 'A draft.', demo: { component: () => null, label: 'x' } })
    expect(rules([draft])).toEqual([])
  })
})

describe('publish gate', () => {
  test('published needs a passing, approved review', () => {
    const published = term({ status: 'published' })
    expect(rules([published])).toContain('publish-gate')
    expect(rules([published], [{ slug: 'demo', verdict: 'pass', approved: false }])).toContain('publish-gate')
    expect(rules([published], [{ slug: 'demo', verdict: 'pass', approved: true }])).toEqual([])
  })
  test('review status is not gated', () => expect(rules([term()])).toEqual([]))
})

describe('parseFrontmatter', () => {
  test('reads strings and booleans with LF or CRLF', () => {
    expect(parseFrontmatter('---\nverdict: pass\napproved: true\n---\nbody')).toEqual({ verdict: 'pass', approved: true })
    expect(parseFrontmatter('---\r\nverdict: "pass"\r\napproved: false\r\n---\r\n')).toEqual({ verdict: 'pass', approved: false })
  })
  test('returns an empty object without frontmatter', () => expect(parseFrontmatter('# hi')).toEqual({}))
})
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/lib/lint.test.ts`
Expected: FAIL, cannot resolve `./lint`.

- [ ] **Step 3: Write `src/lib/lint.ts`**

```ts
import { defaultValues } from './content'
import type { Term } from './term-types'

export type LintIssue = { slug: string; rule: string; message: string }
export type Review = { slug: string; verdict?: string; approved: boolean }
export type LintConfig = { allowLayoutProps: readonly string[]; allowEaseIn: readonly string[] }

export const BLOCKED_WORDS = [
  'seamless', 'seamlessly', 'leverage', 'delve', 'robust', 'elevate',
  'effortless', 'effortlessly', 'cutting-edge', 'unlock', 'game-changer',
]
const MAX_DEFINITION = 140

const EASE_IN = /\bease-in\b(?!-out)|\beaseIn\b/
const TRANSITION_ALL = /transition(?:-property)?\s*:\s*all\b|\btransition-all\b/
const SCALE_ZERO = /scale\(\s*0\s*\)|\bscale\s*:\s*0(?![.\d])/
const LAYOUT_TRANSITION = /transition(?:-property)?\s*:[^;{}]*\b(?:width|height|top|left|right|bottom|margin|padding)\b/
const LAYOUT_MOTION = /animate=\{\{[^}]*\b(?:width|height|top|left)\s*:/
const HAS_MOTION = /\btransition\b|\banimation\b|@keyframes|\banimate\(|<motion\.|\buseSpring\b|\bgsap\./
const REDUCED = /prefers-reduced-motion|useReducedMotion/

export function parseFrontmatter(src: string): Record<string, string | boolean> {
  const match = src.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  const out: Record<string, string | boolean> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i === -1) continue
    const key = line.slice(0, i).trim()
    const raw = line.slice(i + 1).trim().replace(/^["']|["']$/g, '')
    out[key] = raw === 'true' ? true : raw === 'false' ? false : raw
  }
  return out
}

function proseOf(term: Term): string[] {
  const prose = [term.name, term.definition, ...(term.aliases ?? []), ...(term.confusedWith ?? []).map((c) => c.difference)]
  if (term.status !== 'draft') {
    const v = defaultValues(term.demo.controls)
    prose.push(term.description, ...term.useWhen, ...term.avoidWhen, term.a11y, term.prompt(v), ...term.acceptance(v))
  }
  return prose
}

export function lintTerms(terms: readonly Term[], reviews: readonly Review[], config: LintConfig): LintIssue[] {
  const issues: LintIssue[] = []
  const add = (slug: string, rule: string, message: string) => issues.push({ slug, rule, message })
  const aliasOwner = new Map<string, string>()
  const orderOwner = new Map<string, string>()

  for (const term of terms) {
    const { slug } = term
    const definition = term.definition.trim()
    if (!/[.!?]$/.test(definition)) add(slug, 'definition-sentence', 'Definition must end with a period.')
    if (/[.!?]["')\]]?\s+\S/.test(definition)) add(slug, 'definition-sentence', 'Definition must be one sentence.')
    if (definition.length > MAX_DEFINITION) {
      add(slug, 'definition-length', `Definition is ${definition.length} characters; keep it at ${MAX_DEFINITION} or fewer.`)
    }

    for (const alias of term.aliases ?? []) {
      const key = alias.toLowerCase()
      const owner = aliasOwner.get(key)
      if (owner && owner !== slug) add(slug, 'alias-duplicate', `Alias "${alias}" is also used by ${owner}.`)
      else aliasOwner.set(key, slug)
    }

    const orderKey = `${term.category}:${term.order}`
    const orderTaken = orderOwner.get(orderKey)
    if (orderTaken) add(slug, 'order-duplicate', `Order ${term.order} in ${term.category} is also used by ${orderTaken}.`)
    else orderOwner.set(orderKey, slug)

    for (const c of term.confusedWith ?? []) {
      if (c.slug === slug) add(slug, 'confused-self', 'A term cannot be confused with itself.')
    }

    const prose = proseOf(term).join('\n')
    for (const word of BLOCKED_WORDS) {
      if (new RegExp(`\\b${word}\\b`, 'i').test(prose)) add(slug, 'blocked-word', `Remove "${word}".`)
    }

    if (term.status !== 'draft') {
      const code = term.code(defaultValues(term.demo.controls))
      for (const [approach, src] of Object.entries(code)) {
        if (!src) continue
        if (!config.allowEaseIn.includes(slug) && EASE_IN.test(src)) add(slug, 'code-ease-in', `${approach}: don't use ease-in on UI.`)
        if (TRANSITION_ALL.test(src)) add(slug, 'code-transition-all', `${approach}: name the transitioned properties.`)
        if (SCALE_ZERO.test(src)) add(slug, 'code-scale-zero', `${approach}: start from scale(0.95), not 0.`)
        if (!config.allowLayoutProps.includes(slug) && (LAYOUT_TRANSITION.test(src) || LAYOUT_MOTION.test(src))) {
          add(slug, 'code-layout-prop', `${approach}: animate transform or opacity, not layout properties.`)
        }
        if (HAS_MOTION.test(src) && !REDUCED.test(src)) add(slug, 'code-reduced-motion', `${approach}: add a prefers-reduced-motion path.`)
      }
    }

    if (term.status === 'published') {
      const review = reviews.find((r) => r.slug === slug)
      if (!review || review.verdict !== 'pass' || !review.approved) {
        add(slug, 'publish-gate', `Published terms need reviews/${slug}.md with "verdict: pass" and "approved: true".`)
      }
    }
  }
  return issues
}
```

- [ ] **Step 4: Run the lint tests**

Run: `npx vitest run src/lib/lint.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the lint to the real content**

`src/lib/reviews.ts` (node only; imported only by tests):

```ts
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parseFrontmatter, type Review } from './lint'

export function loadReviews(dir: string): Review[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const fm = parseFrontmatter(readFileSync(path.join(dir, f), 'utf8'))
      return {
        slug: f.replace(/\.md$/, ''),
        verdict: typeof fm.verdict === 'string' ? fm.verdict : undefined,
        approved: fm.approved === true,
      }
    })
}
```

`content-lint.config.ts`:

```ts
import type { LintConfig } from '@/lib/lint'

// Terms whose subject requires a rule the lint normally forbids.
const config: LintConfig = {
  allowLayoutProps: ['height-auto', 'layout-shift'],
  allowEaseIn: [],
}

export default config
```

`src/content.test.ts`:

```ts
import { expect, test } from 'vitest'
import { terms } from '@/generated/registry'
import { lintTerms } from '@/lib/lint'
import { loadReviews } from '@/lib/reviews'
import config from '../content-lint.config'

test('every term passes the content lint', () => {
  expect(lintTerms(terms, loadReviews('reviews'), config)).toEqual([])
})
```

- [ ] **Step 6: Add the pre-commit hook and CI**

`.githooks/pre-commit`:

```sh
#!/bin/sh
npm run check
```

`.github/workflows/ci.yml`:

```yaml
name: ci
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run check
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

Then:

```bash
npm run prepare
git add .githooks/pre-commit
git update-index --chmod=+x .githooks/pre-commit
```

- [ ] **Step 7: Run the full check**

Run: `npm run check`
Expected: generate (0 terms), typecheck and all tests PASS.

- [ ] **Step 8: Prove the hook runs**

```bash
git add -A
git commit -m "feat: content lint, publish gate, pre-commit hook and CI

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: the commit output shows `npm run check` running before the commit is created.

---

### Task 5: The 47 term files

**Files:**
- Create: `src/components/demo/placeholder-demo.tsx`, 47 files `src/terms/<slug>.tsx`
- Modify: `src/content.test.ts`

**Interfaces:**
- Consumes: `defineTerm`, `DemoProps`
- Produces: `PlaceholderDemo`; every slug below becomes part of `TermSlug`.

- [ ] **Step 1: Add the failing count test**

Append to `src/content.test.ts`:

```ts
import { groupByCategory } from '@/lib/content'

test('the 47 terms are spread across the seven categories in order', () => {
  const counts = Object.fromEntries(groupByCategory(terms).map((g) => [g.category.slug, g.terms.length]))
  expect(counts).toEqual({ scroll: 8, motion: 8, transitions: 7, gestures: 6, layout: 5, states: 7, visual: 6 })
  for (const group of groupByCategory(terms)) {
    expect(group.terms.map((t) => t.order)).toEqual(group.terms.map((_, i) => i + 1))
  }
})
```

Run: `npm run check`
Expected: FAIL, counts are all 0.

- [ ] **Step 2: Write `src/components/demo/placeholder-demo.tsx`**

```tsx
import type { DemoProps } from '@/lib/term-types'

// Stands in for a draft's demo until it is built. Static on purpose.
export function PlaceholderDemo(_: DemoProps<unknown>) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-14 w-24 rounded-lg bg-demo" />
    </div>
  )
}
```

- [ ] **Step 3: Create the 47 term files**

For every row below, create `src/terms/<slug>.tsx` with exactly this template, substituting the row's values. `order` is the row's number within its category.

```tsx
import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { defineTerm } from '@/lib/term-types'

export default defineTerm({
  slug: '<slug>',
  name: '<name>',
  category: '<category>',
  order: <order>,
  status: 'draft',
  definition: '<definition>',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.' },
})
```

| category | order | slug | name | definition |
|---|---|---|---|---|
| scroll | 1 | scroll-triggered | Scroll-triggered | An animation that plays once when an element scrolls into view. |
| scroll | 2 | scroll-linked | Scroll-linked | An animation whose progress is tied directly to the scroll position, moving forward and backward as you scroll. |
| scroll | 3 | parallax | Parallax | Layers move at different speeds while you scroll, which makes the page feel like it has depth. |
| scroll | 4 | sticky | Sticky | An element scrolls with the page until it hits an edge, then stays pinned while the rest of its section scrolls underneath. |
| scroll | 5 | scroll-snap | Scroll Snap | Scrolling comes to rest exactly on an item instead of stopping anywhere in between. |
| scroll | 6 | pinned-horizontal-scroll | Pinned Horizontal Scroll | A section pins in place while vertical scrolling moves its content sideways. |
| scroll | 7 | scroll-fade | Scroll Fade | A soft fade on the edge of a scroll area that still has more content, hinting there is more to see. |
| scroll | 8 | scroll-progress-indicator | Scroll Progress Indicator | A bar or ring that fills as you move through the page, showing how much is left. |
| motion | 1 | ease-out | Ease-out | Motion that starts fast and slows into place, the default for anything responding to the user. |
| motion | 2 | ease-in-out | Ease-in-out | Motion that speeds up and then slows down, for elements already on screen moving from one spot to another. |
| motion | 3 | spring | Spring | Motion driven by physics instead of a fixed duration, so it can carry velocity and settle naturally. |
| motion | 4 | stagger | Stagger | Several items animate one after another with a small delay between each, creating a cascade. |
| motion | 5 | duration | Duration | How long an animation takes, which decides whether it feels instant, smooth or slow. |
| motion | 6 | overshoot | Overshoot | Motion that travels slightly past its target before settling back, giving a small sense of energy. |
| motion | 7 | interruptibility | Interruptibility | An animation that can change direction mid-flight from wherever it is, instead of finishing or restarting first. |
| motion | 8 | origin-aware | Origin-aware | An element grows out of the thing that triggered it, like a menu scaling from its button instead of its own center. |
| transitions | 1 | crossfade | Crossfade | One element fades out while another fades in, in the same spot. |
| transitions | 2 | shared-layout | Shared Layout | One element travels and reshapes between two positions, instead of one copy disappearing and another appearing. |
| transitions | 3 | view-transition | View Transition | The browser animates between two states or pages, connecting the elements they share. |
| transitions | 4 | clip-path-reveal | Clip-path Reveal | Content is uncovered by animating a clipping shape, like a wipe or an expanding circle. |
| transitions | 5 | enter-and-exit | Enter and Exit | The animations an element plays when it is added to the screen and when it is removed. |
| transitions | 6 | height-auto | Height Auto | A section smoothly expands and collapses to fit its content instead of jumping open. |
| transitions | 7 | icon-swap | Icon Swap | One icon turns into another in place with a quick scale, fade and blur, like copy becoming a check. |
| gestures | 1 | press-scale | Press Scale | A button shrinks slightly while pressed, so the click feels physical. |
| gestures | 2 | drag-with-momentum | Drag with Momentum | A dragged element keeps moving after release, slowing down based on how fast it was thrown. |
| gestures | 3 | swipe-to-dismiss | Swipe to Dismiss | Dragging an element off screen closes it, and a quick flick counts as much as a long drag. |
| gestures | 4 | rubber-banding | Rubber Banding | Dragging past an edge meets growing resistance, then snaps back on release. |
| gestures | 5 | hover-intent | Hover Intent | A short delay that waits for the pointer to settle before opening a menu or tooltip, so passing over it does nothing. |
| gestures | 6 | long-press | Long Press | Holding a press for a moment triggers a secondary action, usually with feedback that fills while you hold. |
| layout | 1 | layout-shift | Layout Shift | Content jumps out of place when something above it loads or changes size. |
| layout | 2 | nested-border-radius | Nested Border Radius | The inner radius equals the outer radius minus the padding, so nested corners look parallel. |
| layout | 3 | hit-area | Hit Area | The clickable region of an element, which can be larger than what you see. |
| layout | 4 | optical-alignment | Optical Alignment | Positioning that looks centered to the eye, even when the measurements say otherwise. |
| layout | 5 | container-query | Container Query | A component adapts its layout to the size of its container instead of the size of the screen. |
| states | 1 | skeleton | Skeleton | Gray placeholder shapes that stand in for content while it loads, matching its layout. |
| states | 2 | shimmer | Shimmer | A soft band of light that sweeps across a placeholder or text to show something is still working. |
| states | 3 | optimistic-ui | Optimistic UI | The interface shows the result of an action immediately and rolls back only if the server says it failed. |
| states | 4 | empty-state | Empty State | What a screen shows when there is nothing to display yet, ideally with a clear next step. |
| states | 5 | loading-button | Loading Button | A button that shows progress in place of its label without changing width. |
| states | 6 | toast | Toast | A brief message that slides in at the edge of the screen and leaves on its own. |
| states | 7 | error-shake | Error Shake | A quick side-to-side shake that signals an input was rejected. |
| visual | 1 | letter-spacing | Letter Spacing | Tightening the space between letters in large text and loosening it in small text, so both read comfortably. |
| visual | 2 | text-wrap-balance | Text Wrap Balance | Line breaks that even out line lengths in a heading, so the last line is not a single orphaned word. |
| visual | 3 | tabular-numbers | Tabular Numbers | Digits that all share the same width, so changing numbers do not shift sideways. |
| visual | 4 | layered-shadows | Layered Shadows | Several soft shadows stacked together, so depth looks natural instead of like one flat blur. |
| visual | 5 | squircle | Squircle | A rounded shape whose corners curve continuously into the sides, smoother than a regular border radius. |
| visual | 6 | grain | Grain | A subtle noise texture over a surface that adds warmth and hides gradient banding. |

Delete `src/terms/.gitkeep`.

- [ ] **Step 4: Run the full check**

Run: `npm run check`
Expected: "generate: 47 terms", typecheck PASS, lint test PASS (zero issues), count test PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add the 47 terms as drafts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Theme, tokens and site shell

**Files:**
- Create: `src/components/site/{header,theme-toggle,sidebar,category-icon,soon-pill}.tsx`, `playwright.config.ts`, `tests/e2e/helpers.ts`, `tests/e2e/shell.spec.ts`
- Modify: `src/app/globals.css`, `src/app/layout.tsx`

**Interfaces:**
- Consumes: `groupByCategory`, `isVisible`, `TermData`, `CATEGORIES`, `getCategory`, `categoryColor`, `REPO_URL`, `SITE_URL`
- Produces:
  - Tailwind colors `canvas`, `surface`, `line`, `line-strong`, `ink`, `ink-muted`, `ink-faint`, `demo`, `demo-2`, `demo-subject`
  - shadows `shadow-card`, `shadow-card-hover`; utility `press`
  - CSS vars `--ease-out`, `--ease-in-out`, `--ease-drawer`, `--duration-1..4`
  - Components `<Header />`, `<ThemeToggle />`, `<Sidebar />`, `<CategoryIcon slug className? />`, `<SoonPill />`
  - e2e helpers `trackErrors(page): string[]`, `expectNoHorizontalOverflow(page)`

- [ ] **Step 1: Playwright config and helpers**

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  expect: { timeout: 10_000 },
  use: { baseURL: 'http://localhost:3100', trace: 'on-first-retry' },
  webServer: {
    command: 'npm run dev -- --port 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
})
```

`tests/e2e/helpers.ts`:

```ts
import { expect, type Page } from '@playwright/test'

export function trackErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  return errors
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}
```

- [ ] **Step 2: Write the failing shell tests**

`tests/e2e/shell.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, trackErrors } from './helpers'

test('home loads without errors or sideways scroll', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/')
  await expect(page).toHaveTitle(/moveset/)
  await expectNoHorizontalOverflow(page)
  expect(errors).toEqual([])
})

test.describe('sidebar', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop only')

  test('lists every term under its category, drafts muted with Soon', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Terms' })
    await expect(nav.getByRole('heading', { level: 2 })).toHaveCount(7)
    await expect(nav.getByRole('listitem')).toHaveCount(47)
    const parallax = nav.getByRole('listitem').filter({ hasText: 'Parallax' })
    await expect(parallax.getByRole('link')).toHaveCount(0)
    await expect(parallax).toContainText('Soon')
  })
})

test('sidebar is hidden on mobile', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only')
  await page.goto('/')
  await expect(page.getByRole('navigation', { name: 'Terms' })).toBeHidden()
})

test('theme toggle cycles system → light → dark and persists', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  const toggle = page.getByRole('button', { name: /^Theme:/ })
  await expect(toggle).toHaveAccessibleName(/Theme: System/)
  await toggle.click()
  await expect(toggle).toHaveAccessibleName(/Theme: Light/)
  await expect(page.locator('html')).toHaveClass(/light/)
  await toggle.click()
  await expect(toggle).toHaveAccessibleName(/Theme: Dark/)
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('system dark mode renders dark on first paint without hydration errors', async ({ page }) => {
  const errors = trackErrors(page)
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await expect(page.locator('html')).toHaveClass(/dark/)
  const toggle = page.getByRole('button', { name: /^Theme:/ })
  const before = await toggle.boundingBox()
  await toggle.click()
  const after = await toggle.boundingBox()
  expect(after?.width).toBe(before?.width)
  expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([])
})
```

Run: `npm run test:e2e -- tests/e2e/shell.spec.ts`
Expected: FAIL (no sidebar, no theme toggle).

- [ ] **Step 3: Write `src/app/globals.css`**

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
}

:root {
  --canvas: oklch(0.985 0 0);
  --surface: oklch(1 0 0);
  --line: oklch(0.922 0 0);
  --line-strong: oklch(0.86 0 0);
  --ink: oklch(0.205 0 0);
  --ink-muted: oklch(0.48 0 0);
  --ink-faint: oklch(0.66 0 0);
  --demo: oklch(0.93 0 0);
  --demo-2: oklch(0.87 0 0);
  --demo-subject: oklch(0.205 0 0);
  --shadow-color: oklch(0 0 0 / 0.04);
  --selection: oklch(0.205 0 0 / 0.12);
  --duration-1: 150ms;
  --duration-2: 200ms;
  --duration-3: 250ms;
  --duration-4: 300ms;
  color-scheme: light;
}

.dark {
  --canvas: oklch(0.145 0 0);
  --surface: oklch(0.185 0 0);
  --line: oklch(0.26 0 0);
  --line-strong: oklch(0.34 0 0);
  --ink: oklch(0.95 0 0);
  --ink-muted: oklch(0.7 0 0);
  --ink-faint: oklch(0.52 0 0);
  --demo: oklch(0.25 0 0);
  --demo-2: oklch(0.32 0 0);
  --demo-subject: oklch(0.95 0 0);
  --shadow-color: transparent;
  --selection: oklch(0.95 0 0 / 0.16);
  color-scheme: dark;
}

@theme inline {
  --color-canvas: var(--canvas);
  --color-surface: var(--surface);
  --color-line: var(--line);
  --color-line-strong: var(--line-strong);
  --color-ink: var(--ink);
  --color-ink-muted: var(--ink-muted);
  --color-ink-faint: var(--ink-faint);
  --color-demo: var(--demo);
  --color-demo-2: var(--demo-2);
  --color-demo-subject: var(--demo-subject);
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
  --shadow-card: 0 0 0 1px var(--line), 0 1px 2px var(--shadow-color), 0 4px 12px var(--shadow-color);
  --shadow-card-hover: 0 0 0 1px var(--line-strong), 0 1px 2px var(--shadow-color), 0 4px 12px var(--shadow-color);
}

@utility press {
  transition-property: scale, color, background-color, box-shadow;
  transition-duration: 150ms;
  transition-timing-function: var(--ease-out);
  &:active {
    scale: 0.97;
  }
}

@layer base {
  html {
    -webkit-text-size-adjust: 100%;
    text-rendering: optimizeLegibility;
  }
  body {
    background: var(--canvas);
  }
  h1,
  h2,
  h3 {
    text-wrap: balance;
  }
  ::selection {
    background: var(--selection);
  }
  :focus-visible {
    outline: 2px solid var(--ink-faint);
    outline-offset: 2px;
  }
}

/* Site chrome goes still under reduced motion. Demos handle it themselves (play on request). */
@media (prefers-reduced-motion: reduce) {
  *:not([data-demo] *),
  *:not([data-demo] *)::before,
  *:not([data-demo] *)::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: Write the site components**

`src/components/site/soon-pill.tsx`:

```tsx
export function SoonPill() {
  return (
    <span className="rounded-full px-1.5 py-px text-[11px] text-ink-faint shadow-[inset_0_0_0_1px_var(--line)]">
      Soon
    </span>
  )
}
```

`src/components/site/category-icon.tsx`:

```tsx
import { ArrowDownUp, Hand, Layers, LayoutGrid, LoaderCircle, Spline, Type, type LucideIcon } from 'lucide-react'
import { categoryColor, getCategory, type CategorySlug } from '@/lib/categories'

const ICONS: Record<CategorySlug, LucideIcon> = {
  scroll: ArrowDownUp,
  motion: Spline,
  transitions: Layers,
  gestures: Hand,
  layout: LayoutGrid,
  states: LoaderCircle,
  visual: Type,
}

export function CategoryIcon({ slug, className }: { slug: CategorySlug; className?: string }) {
  const Icon = ICONS[slug]
  return (
    <Icon
      aria-hidden
      size={14}
      strokeWidth={1.75}
      className={className}
      style={{ color: categoryColor(getCategory(slug).hue) }}
    />
  )
}
```

`src/components/site/theme-toggle.tsx`:

```tsx
'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

const ORDER = ['system', 'light', 'dark'] as const
type Mode = (typeof ORDER)[number]
const LABEL: Record<Mode, string> = { system: 'System', light: 'Light', dark: 'Dark' }

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const current: Mode = mounted && ORDER.includes(theme as Mode) ? (theme as Mode) : 'system'
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${LABEL[current]}. Switch to ${LABEL[next]}.`}
      className="press inline-grid min-h-11 items-center rounded-md px-3 text-sm text-ink-muted hover:text-ink sm:min-h-0 sm:py-1.5"
    >
      {/* All labels share one grid cell, so the button keeps the width of the longest label. */}
      {ORDER.map((mode) => (
        <span key={mode} aria-hidden className={`[grid-area:1/1] ${mounted && mode === current ? '' : 'invisible'}`}>
          {LABEL[mode]}
        </span>
      ))}
    </button>
  )
}
```

`src/components/site/header.tsx`:

```tsx
import Link from 'next/link'
import { REPO_URL } from '@/lib/site'
import { ThemeToggle } from './theme-toggle'

export function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <Link href="/" className="text-[15px] font-medium tracking-[-0.01em] text-ink">
        moveset
      </Link>
      <div className="flex items-center gap-1">
        <a
          href={REPO_URL}
          className="press inline-flex min-h-11 items-center rounded-md px-3 text-sm text-ink-muted hover:text-ink sm:min-h-0 sm:py-1.5"
        >
          GitHub
        </a>
        <ThemeToggle />
      </div>
    </header>
  )
}
```

`src/components/site/sidebar.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import data from '@/generated/terms-data.json'
import { groupByCategory, isVisible } from '@/lib/content'
import type { TermData } from '@/lib/term-data'
import { CategoryIcon } from './category-icon'
import { SoonPill } from './soon-pill'

const groups = groupByCategory(data as TermData[])

function SideLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`relative block py-1 transition-colors duration-150 ease-[ease] hover:text-ink ${active ? 'text-ink' : 'text-ink-muted'}`}
    >
      {active && <span aria-hidden className="absolute -left-3 top-1/2 size-1 -translate-y-1/2 rounded-full bg-ink" />}
      {children}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-0 max-h-dvh overflow-y-auto px-8 pb-16 pt-10 [scrollbar-width:none]">
        <nav aria-label="Site" className="mb-8">
          <ul className="text-sm">
            <li><SideLink href="/" active={pathname === '/'}>Index</SideLink></li>
            <li><SideLink href="/about" active={pathname === '/about'}>About</SideLink></li>
          </ul>
        </nav>
        <nav aria-label="Terms">
          {groups.map(({ category, terms }) => (
            <div key={category.slug} className="mb-7">
              <h2 className="mb-1.5 flex items-center gap-2 text-sm text-ink">
                <CategoryIcon slug={category.slug} />
                {category.name}
              </h2>
              <ul className="text-sm">
                {terms.map((t) => (
                  <li key={t.slug}>
                    {isVisible(t) ? (
                      <SideLink href={`/terms/${t.slug}`} active={pathname === `/terms/${t.slug}`}>{t.name}</SideLink>
                    ) : (
                      <span className="flex items-center gap-2 py-1 text-ink-faint">
                        {t.name}
                        <SoonPill />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  )
}
```

- [ ] **Step 5: Write `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Geist_Mono, Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'
import { Header } from '@/components/site/header'
import { Sidebar } from '@/components/site/sidebar'
import { SITE_URL } from '@/lib/site'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'moveset', template: '%s · moveset' },
  description: 'A visual dictionary of design engineering terms, each with a live demo and a prompt you can paste into an AI coding agent.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${mono.variable}`}>
      <body className="bg-canvas font-sans text-ink antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:shadow-card">
            Skip to content
          </a>
          <Header />
          <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)_260px]">
            <Sidebar />
            <main id="main" className="mx-auto w-full max-w-[680px] px-4 pb-24 pt-6 sm:px-6 lg:pt-10">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Run the shell tests**

Run: `npm run test:e2e -- tests/e2e/shell.spec.ts`
Expected: PASS on both projects. If the hydration test reports a warning from `next-themes`'s inline script, confirm `suppressHydrationWarning` is on `<html>`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: tokens, theme toggle, header and sidebar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Demo runtime

**Files:**
- Create: `src/components/demo/playback.ts`, `src/components/demo/playback.test.ts`, `src/components/demo/use-page-visible.ts`, `src/components/demo/use-reduced-motion.ts`, `src/components/demo/use-auto-scroll.ts`, `src/components/demo/browser-frame.tsx`, `src/components/demo/demo-player.tsx`, `src/components/demo/demo-controls.tsx`

**Interfaces:**
- Consumes: `getTerm`, `defaultValues`, `Values`, `Control`, `ControlValue`, `DemoProps`
- Produces:
  - `HOLD_MS`, `isPlaying({ inView, pageVisible, reducedMotion, requested }): boolean`, `scaled(ms, timeScale): number`
  - `usePageVisible(): boolean`, `usePrefersReducedMotion(): boolean`
  - `useAutoScroll(ref, { playing, replayKey, timeScale, onCycleEnd, interactive, durationMs?, stillAt? }): void` (writes `data-active` and `data-taken-over` on the scroller)
  - `<BrowserFrame scrollRef size label>{children}</BrowserFrame>` (scroller carries `data-scroller`)
  - `<DemoPlayer slug size values? timeScale? replayRequest? />` (wrapper carries `data-demo`, `data-playing`)
  - `<DemoControls controls values onChange onReplay />`
- Runtime behavior is covered end-to-end in Tasks 9 and 10 once Sticky and the entry page exist. This task's own gate is the unit tests plus typecheck.

- [ ] **Step 1: Write the failing playback tests**

`src/components/demo/playback.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { isPlaying, scaled } from './playback'

describe('isPlaying', () => {
  const base = { inView: true, pageVisible: true, reducedMotion: false, requested: false }
  test('plays when visible on screen', () => expect(isPlaying(base)).toBe(true))
  test('pauses off screen', () => expect(isPlaying({ ...base, inView: false })).toBe(false))
  test('pauses when the tab is hidden', () => expect(isPlaying({ ...base, pageVisible: false })).toBe(false))
  test('reduced motion waits for an explicit play', () => {
    expect(isPlaying({ ...base, reducedMotion: true })).toBe(false)
    expect(isPlaying({ ...base, reducedMotion: true, requested: true })).toBe(true)
  })
  test('an explicit play still pauses off screen', () => {
    expect(isPlaying({ ...base, reducedMotion: true, requested: true, inView: false })).toBe(false)
  })
})

describe('scaled', () => {
  test('slow motion stretches durations', () => expect(scaled(300, 0.25)).toBe(1200))
  test('never divides by zero', () => expect(Number.isFinite(scaled(300, 0))).toBe(true))
})
```

Run: `npx vitest run src/components/demo/playback.test.ts`
Expected: FAIL, cannot resolve `./playback`.

- [ ] **Step 2: Write `src/components/demo/playback.ts`**

```ts
/** How long a looping card demo holds its end state before replaying. */
export const HOLD_MS = 1200

export function isPlaying(s: { inView: boolean; pageVisible: boolean; reducedMotion: boolean; requested: boolean }): boolean {
  return s.inView && s.pageVisible && (!s.reducedMotion || s.requested)
}

export function scaled(ms: number, timeScale: number): number {
  return ms / Math.max(timeScale, 0.01)
}
```

Run: `npx vitest run src/components/demo/playback.test.ts`
Expected: PASS.

- [ ] **Step 3: Write the two media hooks**

Both use `useSyncExternalStore` with a server snapshot, so the first client render matches the server and there is no hydration mismatch.

`src/components/demo/use-page-visible.ts`:

```ts
'use client'

import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

export function usePageVisible(): boolean {
  return useSyncExternalStore(subscribe, () => document.visibilityState === 'visible', () => true)
}
```

`src/components/demo/use-reduced-motion.ts`:

```ts
'use client'

import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false)
}
```

- [ ] **Step 4: Write `src/components/demo/use-auto-scroll.ts`**

```ts
'use client'

import { animate } from 'motion/react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { scaled } from './playback'

type Options = {
  playing: boolean
  replayKey: number
  timeScale: number
  onCycleEnd: () => void
  /** detail size: the visitor can take over by scrolling */
  interactive: boolean
  durationMs?: number
  /** scroll position (0–1) shown as the still frame */
  stillAt?: number
}

const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const
const TAKEOVER_EVENTS = ['wheel', 'pointerdown', 'touchstart', 'keydown'] as const

// Scrolls a container top to bottom once per cycle. Writes scrollTop directly; no React state per frame.
export function useAutoScroll(
  ref: RefObject<HTMLElement | null>,
  { playing, replayKey, timeScale, onCycleEnd, interactive, durationMs = 3200, stillAt = 0.4 }: Options,
) {
  const [takenOver, setTakenOver] = useState(false)
  const onCycleEndRef = useRef(onCycleEnd)
  useEffect(() => {
    onCycleEndRef.current = onCycleEnd
  })
  useEffect(() => {
    setTakenOver(false)
  }, [replayKey])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.dataset.takenOver = String(takenOver)
    const max = el.scrollHeight - el.clientHeight
    if (takenOver) return
    if (!playing) {
      el.scrollTop = max * stillAt
      return
    }

    el.dataset.active = String(Number(el.dataset.active ?? 0) + 1)
    el.scrollTop = 0
    const controls = animate(0, max, {
      duration: scaled(durationMs, timeScale) / 1000,
      ease: EASE_IN_OUT,
      onUpdate: (v) => {
        el.scrollTop = v
      },
      onComplete: () => onCycleEndRef.current(),
    })
    const takeOver = () => {
      controls.stop()
      setTakenOver(true)
    }
    if (interactive) TAKEOVER_EVENTS.forEach((e) => el.addEventListener(e, takeOver, { passive: true }))

    return () => {
      controls.stop()
      el.dataset.active = String(Number(el.dataset.active ?? 1) - 1)
      if (interactive) TAKEOVER_EVENTS.forEach((e) => el.removeEventListener(e, takeOver))
    }
  }, [ref, playing, replayKey, timeScale, takenOver, interactive, durationMs, stillAt])
}
```

- [ ] **Step 5: Write `src/components/demo/browser-frame.tsx`**

```tsx
'use client'

import type { ReactNode, Ref } from 'react'

type Props = {
  children: ReactNode
  scrollRef: Ref<HTMLDivElement>
  size: 'card' | 'detail'
  /** accessible name of the scroll area on the entry page */
  label: string
}

// A mini browser window, so every scroll demo reads as part of one family.
export function BrowserFrame({ children, scrollRef, size, label }: Props) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-surface shadow-card">
      <div className="flex h-7 shrink-0 items-center gap-1.5 border-b border-line px-3">
        <span className="size-2 rounded-full bg-demo-2" />
        <span className="size-2 rounded-full bg-demo-2" />
        <span className="size-2 rounded-full bg-demo-2" />
        <span className="mx-auto h-2.5 w-1/3 rounded-full bg-demo" />
      </div>
      <div
        ref={scrollRef}
        data-scroller=""
        tabIndex={size === 'detail' ? 0 : -1}
        aria-label={size === 'detail' ? label : undefined}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]"
      >
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Write `src/components/demo/demo-player.tsx`**

```tsx
'use client'

import { Play } from 'lucide-react'
import { useInView } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { defaultValues } from '@/lib/content'
import type { Values } from '@/lib/term-types'
import { getTerm } from '@/lib/terms'
import { HOLD_MS, isPlaying, scaled } from './playback'
import { usePageVisible } from './use-page-visible'
import { usePrefersReducedMotion } from './use-reduced-motion'

type Props = {
  slug: string
  size: 'card' | 'detail'
  values?: Values
  timeScale?: number
  /** increment to replay from outside (the entry page's Replay button) */
  replayRequest?: number
}

export function DemoPlayer({ slug, size, values, timeScale = 1, replayRequest = 0 }: Props) {
  const term = getTerm(slug)
  const Demo = term.demo.component
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.5 })
  const pageVisible = usePageVisible()
  const reducedMotion = usePrefersReducedMotion()
  const [requested, setRequested] = useState(false)
  const [replayKey, setReplayKey] = useState(0)
  const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const playing = isPlaying({ inView, pageVisible, reducedMotion, requested })

  useEffect(() => {
    if (replayRequest === 0) return
    setRequested(true)
    setReplayKey((k) => k + 1)
  }, [replayRequest])

  useEffect(() => {
    if (!playing) clearTimeout(holdTimer.current)
  }, [playing])
  useEffect(() => () => clearTimeout(holdTimer.current), [])

  const onCycleEnd = useCallback(() => {
    clearTimeout(holdTimer.current)
    const hold = scaled(HOLD_MS, timeScale)
    if (reducedMotion) {
      holdTimer.current = setTimeout(() => setRequested(false), hold)
    } else if (size === 'card') {
      holdTimer.current = setTimeout(() => setReplayKey((k) => k + 1), hold)
    }
  }, [reducedMotion, size, timeScale])

  const play = () => {
    setRequested(true)
    setReplayKey((k) => k + 1)
  }

  return (
    <div ref={ref} data-demo={slug} data-playing={playing} className="relative h-full overflow-hidden rounded-xl bg-canvas">
      <div
        className="h-full"
        inert={size === 'card'}
        aria-hidden={size === 'card' || undefined}
        role={size === 'detail' ? 'group' : undefined}
        aria-label={size === 'detail' ? term.demo.label : undefined}
      >
        <Demo
          values={values ?? defaultValues(term.demo.controls)}
          playing={playing}
          replayKey={replayKey}
          size={size}
          timeScale={timeScale}
          onCycleEnd={onCycleEnd}
        />
      </div>
      {size === 'card' && <p className="sr-only">{term.demo.label}</p>}
      {reducedMotion && !playing && (
        <button
          type="button"
          onClick={play}
          aria-label={`Play ${term.name} demo`}
          className="press absolute bottom-2 right-2 z-10 inline-flex size-8 items-center justify-center rounded-full bg-surface text-ink shadow-card"
        >
          <Play size={14} aria-hidden />
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Write `src/components/demo/demo-controls.tsx`**

```tsx
'use client'

import { RotateCcw } from 'lucide-react'
import type { Control, ControlValue, Values } from '@/lib/term-types'

type Props = {
  controls: readonly Control[]
  values: Values
  onChange: (id: string, value: ControlValue) => void
  onReplay: () => void
}

export function DemoControls({ controls, values, onChange, onReplay }: Props) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
      <button
        type="button"
        onClick={onReplay}
        className="press inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface px-3 text-ink shadow-card hover:shadow-card-hover"
      >
        <RotateCcw size={14} aria-hidden />
        Replay
      </button>
      {controls.map((c) => (
        <ControlField key={c.id} control={c} value={values[c.id]} onChange={(v) => onChange(c.id, v)} />
      ))}
    </div>
  )
}

function ControlField({ control, value, onChange }: { control: Control; value: ControlValue; onChange: (v: ControlValue) => void }) {
  const id = `control-${control.id}`

  if (control.type === 'range') {
    return (
      <div className="flex items-center gap-3">
        <label htmlFor={id} className="text-ink-muted">{control.label}</label>
        <input
          id={id}
          type="range"
          min={control.min}
          max={control.max}
          step={control.step}
          value={Number(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-28 accent-[var(--ink)]"
        />
        <output htmlFor={id} className="w-12 tabular-nums text-ink">{`${value}${control.unit ?? ''}`}</output>
      </div>
    )
  }

  if (control.type === 'toggle') {
    return (
      <div className="flex items-center gap-3">
        <span id={`${id}-label`} className="text-ink-muted">{control.label}</span>
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={Boolean(value)}
          aria-labelledby={`${id}-label`}
          onClick={() => onChange(!value)}
          className={`relative h-5 w-9 rounded-full transition-colors duration-150 ease-[ease] ${value ? 'bg-ink' : 'bg-demo-2'}`}
        >
          <span
            aria-hidden
            className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-surface transition-transform duration-150 ease-out ${value ? 'translate-x-4' : ''}`}
          />
        </button>
      </div>
    )
  }

  return (
    <div role="group" aria-label={control.label} className="flex items-center gap-3">
      <span aria-hidden className="text-ink-muted">{control.label}</span>
      <div className="flex rounded-full bg-surface p-0.5 shadow-card">
        {control.options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-full px-2.5 py-1 transition-colors duration-150 ease-[ease] ${value === o.value ? 'bg-ink text-canvas' : 'text-ink-muted hover:text-ink'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Verify**

Run: `npm run check`
Expected: PASS (typecheck plus all unit tests).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: demo runtime with in-view playback, reduced motion and auto-scroll

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Index, about and copy button

**Files:**
- Create: `src/lib/clipboard.ts`, `src/lib/clipboard.test.ts`, `src/components/copy-button.tsx`, `src/components/index/intro.tsx`, `src/components/index/use-scroll-edges.ts`, `src/components/index/filter-pills.tsx`, `src/components/index/term-card.tsx`, `src/components/index/term-browser.tsx`, `src/app/about/page.tsx`, `src/app/not-found.tsx`, `tests/e2e/index.spec.ts`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `DemoPlayer`, `groupByCategory`, `isVisible`, `matchesQuery`, `TermData`, `CATEGORIES`, `CategoryIcon`, `SoonPill`, `usePrefersReducedMotion`, site constants
- Produces: `copyText(text): Promise<boolean>`, `<CopyButton text label children? className? />`, `<TermCard term />`, `<TermBrowser />`, `useScrollEdges(ref): { start: boolean; end: boolean }`

- [ ] **Step 1: Write the failing clipboard tests**

`src/lib/clipboard.test.ts`:

```ts
import { afterEach, describe, expect, test, vi } from 'vitest'
import { copyText } from './clipboard'

afterEach(() => vi.unstubAllGlobals())

describe('copyText', () => {
  test('returns true when the clipboard accepts the text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    expect(await copyText('hi')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('hi')
  })
  test('returns false when there is no clipboard API', async () => {
    vi.stubGlobal('navigator', {})
    expect(await copyText('hi')).toBe(false)
  })
  test('returns false when the browser refuses', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    expect(await copyText('hi')).toBe(false)
  })
})
```

Run: `npx vitest run src/lib/clipboard.test.ts`
Expected: FAIL, cannot resolve `./clipboard`.

- [ ] **Step 2: Write `src/lib/clipboard.ts`**

```ts
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
```

Run: `npx vitest run src/lib/clipboard.test.ts`
Expected: PASS.

- [ ] **Step 3: Write the failing index tests**

`tests/e2e/index.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, trackErrors } from './helpers'

const cards = (page: import('@playwright/test').Page) => page.getByTestId('term-card')

test('intro shows the skill command and copies it', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'clipboard permissions are chromium-only')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await expect(page.getByText('npx skills add uxlucas/moveset')).toBeVisible()
  await page.getByRole('button', { name: 'Copy install command' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Copied' })).toHaveCount(1)
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('npx skills add uxlucas/moveset')
})

test('copy failure says so instead of showing a check', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Copy install command' }).click()
  await expect(page.getByText("Couldn't copy")).toBeVisible()
})

test('shows all 47 cards, drafts without links', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/')
  await expect(cards(page)).toHaveCount(47)
  await expect(cards(page).filter({ hasText: 'Parallax' }).getByRole('link')).toHaveCount(0)
  await expectNoHorizontalOverflow(page)
  expect(errors).toEqual([])
})

test.describe('search', () => {
  test('finds a term by name', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('searchbox', { name: 'Search terms' }).fill('parallax')
    await expect(cards(page)).toHaveCount(1)
    await expect(cards(page)).toContainText('Parallax')
  })

  for (const query of ['  Scroll Linked ', 'scroll-linked', 'SCROLL linked']) {
    test(`tolerates messy input: "${query}"`, async ({ page }) => {
      await page.goto('/')
      await page.getByRole('searchbox', { name: 'Search terms' }).fill(query)
      await expect(cards(page).filter({ hasText: 'Scroll-linked' })).toHaveCount(1)
    })
  }

  test('says when nothing matches', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('searchbox', { name: 'Search terms' }).fill('zzzz')
    await expect(cards(page)).toHaveCount(0)
    await expect(page.getByText('Nothing matches “zzzz”. Try describing what it does.')).toBeVisible()
  })

  test('slash focuses search and Escape clears it', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard shortcut')
    await page.goto('/')
    await page.keyboard.press('/')
    const box = page.getByRole('searchbox', { name: 'Search terms' })
    await expect(box).toBeFocused()
    await box.fill('toast')
    await box.press('Escape')
    await expect(box).toHaveValue('')
  })
})

test('category pills filter the grid', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('group', { name: 'Filter by category' }).getByRole('button', { name: 'Gestures' }).click()
  await expect(cards(page)).toHaveCount(6)
  // Scoped to main: the desktop sidebar has its own category headings.
  const main = page.getByRole('main')
  await expect(main.getByRole('heading', { level: 2, name: 'Gestures' })).toBeVisible()
  await expect(main.getByRole('heading', { level: 2, name: 'Scroll' })).toHaveCount(0)
})

test('about page loads', async ({ page }) => {
  await page.goto('/about')
  await expect(page.getByRole('heading', { level: 1, name: 'About' })).toBeVisible()
})
```

Run: `npm run test:e2e -- tests/e2e/index.spec.ts`
Expected: FAIL.

- [ ] **Step 4: Write `src/components/copy-button.tsx`**

```tsx
'use client'

import { Check, Copy } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { copyText } from '@/lib/clipboard'
import { usePrefersReducedMotion } from './demo/use-reduced-motion'

type Props = {
  text: string | (() => string)
  /** accessible name; also the visible text when no children are given */
  label: string
  children?: ReactNode
  className?: string
}

export function CopyButton({ text, label, children, className = '' }: Props) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const reduce = usePrefersReducedMotion()
  useEffect(() => () => clearTimeout(timer.current), [])

  async function onClick() {
    const ok = await copyText(typeof text === 'function' ? text() : text)
    setState(ok ? 'copied' : 'failed')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), ok ? 1500 : 2500)
  }

  const copied = state === 'copied'
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={onClick} aria-label={children ? undefined : label} className={`press inline-flex items-center gap-1.5 ${className}`}>
        <span className="relative inline-flex size-4 items-center justify-center">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={copied ? 'check' : 'copy'}
              className="inline-flex"
              initial={{ scale: 0.3, opacity: 0, filter: 'blur(3px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              exit={{ scale: 0.3, opacity: 0, filter: 'blur(3px)' }}
              transition={reduce ? { duration: 0 } : { type: 'spring', duration: 0.35, bounce: 0 }}
            >
              {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
            </motion.span>
          </AnimatePresence>
        </span>
        {children}
      </button>
      <span role="status" className={state === 'failed' ? 'text-xs text-ink-muted' : 'sr-only'}>
        {state === 'copied' ? 'Copied' : state === 'failed' ? "Couldn't copy" : ''}
      </span>
    </span>
  )
}
```

- [ ] **Step 5: Write `src/components/index/intro.tsx`**

```tsx
import { ArrowUpRight } from 'lucide-react'
import { CopyButton } from '@/components/copy-button'
import { AUTHOR_NAME, AUTHOR_URL, REPO, REPO_URL, SKILL_COMMAND } from '@/lib/site'

export function Intro() {
  return (
    <section aria-labelledby="intro-title" className="mb-14">
      <h1 id="intro-title" className="mb-3 text-[17px] font-medium">moveset</h1>
      <p className="leading-relaxed text-ink-muted">
        A visual dictionary of design engineering terms. Each entry shows the idea moving, gives it its precise name,
        and hands you a prompt you can paste into Cursor, Claude or v0 to get exactly that.
      </p>
      <p className="mt-4 leading-relaxed text-ink-muted">
        Made by{' '}
        <a href={AUTHOR_URL} className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
          {AUTHOR_NAME}
        </a>
        . Add the whole vocabulary to your agent:
      </p>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-surface px-5 py-4 shadow-card">
        <code className="font-mono text-[13px] text-ink">{SKILL_COMMAND}</code>
        <CopyButton text={SKILL_COMMAND} label="Copy install command" className="size-8 justify-center rounded-lg text-ink-muted hover:text-ink" />
      </div>
      <a
        href={REPO_URL}
        className="press mt-3 flex items-center justify-between rounded-2xl bg-surface px-5 py-4 text-ink shadow-card hover:shadow-card-hover"
      >
        <span className="text-sm">{REPO}</span>
        <ArrowUpRight size={16} aria-hidden className="text-ink-muted" />
      </a>
    </section>
  )
}
```

- [ ] **Step 6: Write `src/components/index/use-scroll-edges.ts` and `filter-pills.tsx`**

`src/components/index/use-scroll-edges.ts`:

```ts
'use client'

import { useEffect, useState, type RefObject } from 'react'

/** Whether a horizontal scroller has more content toward its start and end. */
export function useScrollEdges(ref: RefObject<HTMLElement | null>): { start: boolean; end: boolean } {
  const [edges, setEdges] = useState({ start: false, end: false })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const start = el.scrollLeft > 1
      const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
      setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [ref])
  return edges
}
```

`src/components/index/filter-pills.tsx`:

```tsx
'use client'

import { useRef } from 'react'
import { CATEGORIES, type CategorySlug } from '@/lib/categories'
import { useScrollEdges } from './use-scroll-edges'

export type Filter = CategorySlug | 'all'
const OPTIONS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  ...CATEGORIES.map((c) => ({ value: c.slug, label: c.short })),
]

export function FilterPills({ value, onChange }: { value: Filter; onChange: (f: Filter) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const { start, end } = useScrollEdges(ref)
  // Scroll fade: fade only the edge that has more content.
  const mask = `linear-gradient(to right, ${start ? 'transparent' : 'black'}, black 24px, black calc(100% - 24px), ${end ? 'transparent' : 'black'})`
  return (
    <div
      ref={ref}
      role="group"
      aria-label="Filter by category"
      className="-mx-4 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:px-0"
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    >
      {OPTIONS.map((o) => {
        const pressed = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(o.value)}
            className={`press shrink-0 rounded-full px-3 py-1.5 text-sm ${pressed ? 'bg-ink text-canvas' : 'bg-surface text-ink-muted shadow-card hover:text-ink'}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 7: Write `src/components/index/term-card.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { DemoPlayer } from '@/components/demo/demo-player'
import { SoonPill } from '@/components/site/soon-pill'
import { isVisible } from '@/lib/content'
import type { TermData } from '@/lib/term-data'

export function TermCard({ term }: { term: TermData }) {
  const visible = isVisible(term)
  return (
    <article
      data-testid="term-card"
      data-slug={term.slug}
      className={`relative flex flex-col rounded-2xl bg-surface shadow-card transition-shadow duration-150 ease-[ease] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ink-faint ${visible ? 'hover:shadow-card-hover' : ''}`}
    >
      <div className="h-52 p-3">
        <DemoPlayer slug={term.slug} size="card" />
      </div>
      <div className="px-5 pb-5 pt-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className={`text-[15px] ${visible ? 'text-ink' : 'text-ink-faint'}`}>
            {visible ? (
              <Link href={`/terms/${term.slug}`} className="outline-none after:absolute after:inset-0 after:rounded-2xl">
                {term.name}
              </Link>
            ) : (
              term.name
            )}
          </h3>
          {!visible && <SoonPill />}
        </div>
        <p className={`mt-1 text-sm leading-snug ${visible ? 'text-ink-muted' : 'text-ink-faint'}`}>{term.definition}</p>
      </div>
    </article>
  )
}
```

- [ ] **Step 8: Write `src/components/index/term-browser.tsx`**

```tsx
'use client'

import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CategoryIcon } from '@/components/site/category-icon'
import data from '@/generated/terms-data.json'
import { groupByCategory, matchesQuery } from '@/lib/content'
import type { TermData } from '@/lib/term-data'
import { FilterPills, type Filter } from './filter-pills'
import { TermCard } from './term-card'

const ALL = data as TermData[]

export function TermBrowser() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const groups = groupByCategory(ALL)
    .filter((g) => filter === 'all' || g.category.slug === filter)
    .map((g) => ({ ...g, terms: g.terms.filter((t) => matchesQuery(t, query)) }))
    .filter((g) => g.terms.length > 0)

  return (
    <section aria-label="Terms">
      <div className="mb-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <FilterPills value={filter} onChange={setFilter} />
        <label className="relative block shrink-0 sm:w-44">
          <span className="sr-only">Search terms</span>
          <Search size={14} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setQuery('')
            }}
            placeholder="Search"
            autoComplete="off"
            spellCheck={false}
            className="h-9 w-full rounded-full bg-surface pl-8 pr-8 text-base text-ink shadow-card placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
          />
          <kbd aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-ink-faint">/</kbd>
        </label>
      </div>

      {groups.length === 0 ? (
        <p role="status" className="text-ink-muted">
          Nothing matches “{query.trim()}”. Try describing what it does.
        </p>
      ) : (
        groups.map(({ category, terms }) => (
          <section key={category.slug} aria-labelledby={`cat-${category.slug}`} className="mb-14">
            <h2 id={`cat-${category.slug}`} className="mb-4 flex items-center gap-2 text-[15px] text-ink">
              <CategoryIcon slug={category.slug} />
              {category.name}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {terms.map((t) => (
                <TermCard key={t.slug} term={t} />
              ))}
            </div>
          </section>
        ))
      )}
    </section>
  )
}
```

- [ ] **Step 9: Pages**

`src/app/page.tsx`:

```tsx
import { Intro } from '@/components/index/intro'
import { TermBrowser } from '@/components/index/term-browser'

export default function Home() {
  return (
    <>
      <Intro />
      <TermBrowser />
    </>
  )
}
```

`src/app/about/page.tsx`:

```tsx
import type { Metadata } from 'next'
import data from '@/generated/terms-data.json'
import type { TermData } from '@/lib/term-data'

export const metadata: Metadata = { title: 'About' }

const REFERENCES = [
  { label: 'Emil Kowalski', url: 'https://emilkowal.ski' },
  { label: 'Rauno Freiberg — Web Interface Guidelines', url: 'https://interfaces.rauno.me' },
  { label: 'Gustavo Fior — Craft', url: 'https://craft.gustavofior.com' },
]

export default function About() {
  const seen = new Set(REFERENCES.map((r) => r.url))
  const sources = (data as TermData[])
    .flatMap((t) => t.sources)
    .filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true)))

  return (
    <article>
      <h1 className="mb-4 text-[17px] font-medium">About</h1>
      <p className="leading-relaxed text-ink-muted">
        You usually know what you want from an interface before you know what it is called. moveset gives those
        things names, shows each one moving, and turns it into a prompt an agent can build from. It is opinionated on
        purpose: fewer terms, each one done properly.
      </p>
      <h2 className="mb-3 mt-10 text-[15px] font-medium">Credits</h2>
      <ul className="space-y-1.5 text-sm">
        {[...REFERENCES, ...sources].map((s) => (
          <li key={s.url}>
            <a href={s.url} className="text-ink-muted underline decoration-line-strong underline-offset-4 hover:text-ink">
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </article>
  )
}
```

`src/app/not-found.tsx`:

```tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div>
      <h1 className="mb-3 text-[17px] font-medium">Not here yet</h1>
      <p className="text-ink-muted">
        This page doesn&apos;t exist, or the term is still being written.{' '}
        <Link href="/" className="text-ink underline decoration-line-strong underline-offset-4">Back to the index</Link>
      </p>
    </div>
  )
}
```

- [ ] **Step 10: Run the tests**

Run: `npm run check && npm run test:e2e -- tests/e2e/index.spec.ts tests/e2e/shell.spec.ts`
Expected: PASS on both projects.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: index with search, category filter, cards and copy button; about page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Sticky, fully written

**Files:**
- Modify: `src/terms/sticky.tsx`
- Create: `tests/e2e/sticky.spec.ts`

**Interfaces:**
- Consumes: `defineTerm`, `Control`, `ControlValues`, `DemoProps`, `BrowserFrame`, `useAutoScroll`
- Produces: the Sticky term (status `review`) with controls `offset` (range 0–24, step 4, px, default 0) and `shadow` (toggle, default true). Headers carry `data-sticky-header` and `data-stuck`.

- [ ] **Step 1: Write the failing card-runtime tests**

`tests/e2e/sticky.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

const stickyCard = (page: import('@playwright/test').Page) => page.locator('[data-testid="term-card"][data-slug="sticky"]')

test('Sticky is clickable on the index in review mode', async ({ page }) => {
  await page.goto('/')
  await expect(stickyCard(page).getByRole('link', { name: 'Sticky' })).toHaveAttribute('href', '/terms/sticky')
})

test('card demo plays only while on screen', async ({ page }) => {
  await page.goto('/')
  const demo = stickyCard(page).locator('[data-demo="sticky"]')
  await demo.scrollIntoViewIfNeeded()
  await expect(demo).toHaveAttribute('data-playing', 'true')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect(demo).toHaveAttribute('data-playing', 'false')
})

test('reduced motion: nothing plays until asked', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const demo = stickyCard(page).locator('[data-demo="sticky"]')
  await demo.scrollIntoViewIfNeeded()
  await expect(demo).toHaveAttribute('data-playing', 'false')
  await stickyCard(page).getByRole('button', { name: 'Play Sticky demo' }).click()
  await expect(demo).toHaveAttribute('data-playing', 'true')
})
```

Run: `npm run test:e2e -- tests/e2e/sticky.spec.ts`
Expected: FAIL (Sticky is a draft, so it has no link; the placeholder isn't a demo).

- [ ] **Step 2: Replace `src/terms/sticky.tsx`**

```tsx
import { useEffect, useRef, type RefObject } from 'react'
import { BrowserFrame } from '@/components/demo/browser-frame'
import { useAutoScroll } from '@/components/demo/use-auto-scroll'
import { defineTerm, type Control, type ControlValues, type DemoProps } from '@/lib/term-types'

const controls = [
  { id: 'offset', type: 'range', label: 'Top offset', min: 0, max: 24, step: 4, unit: 'px', default: 0 },
  { id: 'shadow', type: 'toggle', label: 'Shadow when stuck', default: true },
] as const satisfies readonly Control[]

type V = ControlValues<typeof controls>

const SECTIONS = [
  { letter: 'A', rows: 3 },
  { letter: 'B', rows: 4 },
  { letter: 'C', rows: 4 },
  { letter: 'D', rows: 3 },
]
const LINE_WIDTHS = ['w-24', 'w-20', 'w-28', 'w-16']

// Marks a header stuck when the 1px sentinel just above it scrolls out of view.
function useStuckHeaders(rootRef: RefObject<HTMLElement | null>, offset: number) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const header = entry.target.nextElementSibling as HTMLElement | null
          if (!header) continue
          const above = entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0) + offset + 1
          header.dataset.stuck = String(!entry.isIntersecting && above)
        }
      },
      { root, rootMargin: `-${offset + 1}px 0px 0px 0px`, threshold: 0 },
    )
    root.querySelectorAll('[data-sentinel]').forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [rootRef, offset])
}

function StickyDemo({ values, playing, replayKey, size, timeScale, onCycleEnd }: DemoProps<V>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useAutoScroll(scrollRef, { playing, replayKey, timeScale, onCycleEnd, interactive: size === 'detail', durationMs: 3600, stillAt: 0.4 })
  useStuckHeaders(scrollRef, values.offset)

  return (
    <BrowserFrame scrollRef={scrollRef} size={size} label="Contact list with sticky letter headers">
      <div>
        {SECTIONS.map((section) => (
          <div key={section.letter}>
            <div data-sentinel="" className="h-px" />
            <div
              data-sticky-header=""
              data-stuck="false"
              style={{ top: values.offset }}
              className={`sticky z-10 border-b border-line bg-surface px-3 py-1 text-[10px] font-medium text-ink-muted transition-shadow duration-150 ease-[ease] ${values.shadow ? 'data-[stuck=true]:shadow-[0_1px_0_var(--line),0_4px_12px_oklch(0_0_0/0.06)]' : ''}`}
            >
              {section.letter}
            </div>
            {Array.from({ length: section.rows }, (_, i) => (
              <div key={i} className="flex items-center gap-2.5 border-b border-line px-3 py-2">
                <span className="size-5 shrink-0 rounded-full bg-demo" />
                <span className={`h-2 rounded-full bg-demo-2 ${LINE_WIDTHS[(i + section.rows) % LINE_WIDTHS.length]}`} />
                <span className="ml-auto h-2 w-10 rounded-full bg-demo" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </BrowserFrame>
  )
}

export default defineTerm({
  slug: 'sticky',
  name: 'Sticky',
  category: 'scroll',
  order: 4,
  status: 'review',
  definition: 'An element scrolls with the page until it hits an edge, then stays pinned while the rest of its section scrolls underneath.',
  aliases: [
    'sticky header',
    'sticky section header',
    'pinned header',
    'header that stays at the top',
    'position sticky',
    'sticky table header',
  ],
  description:
    'Sticky is CSS position: sticky. The element sits in the normal flow until scrolling brings it to the offset you set, then it holds there until the end of its parent pushes it out. That last part is why section headers hand off to each other: each header only sticks inside its own section.',
  useWhen: [
    'Section headers in long lists, like contacts, settings or a changelog.',
    'Table headers that need to stay visible while rows scroll.',
    'A toolbar that should stay within reach without taking space from the content.',
  ],
  avoidWhen: [
    'Small screens where a pinned element takes a big share of the viewport.',
    'Stacking several sticky bars, which leaves little room to read.',
    'When the element must stay visible past the end of its parent. Sticky cannot leave its container, so use a fixed element instead.',
  ],
  demo: { component: StickyDemo, label: 'A contact list scrolls inside a small browser window. Each letter header pins to the top while its section passes underneath, then the next header pushes it away.', controls },
  prompt: (v) =>
    [
      'Make the section headers in this list sticky.',
      '',
      `- Give each section header \`position: sticky; top: ${v.offset}px;\` inside the list's own scroll container. Each header should only stick within its own section, so the next header pushes it up instead of overlapping it.`,
      '- Give headers an opaque background that matches the list, and a z-index above the rows, so rows never show through.',
      '- Check every ancestor between the header and the scroll container: `overflow: hidden` or `overflow: auto` on any of them silently breaks sticky.',
      `- Set \`scroll-padding-top\` on the scroll container to the header height plus ${v.offset}px, so rows focused with the keyboard are never hidden behind a stuck header.`,
      ...(v.shadow
        ? [
            '- While a header is stuck, show a soft shadow under it: `box-shadow: 0 1px 0 var(--border), 0 4px 12px rgb(0 0 0 / 0.06)`, transitioned over 150ms with `ease`. Detect "stuck" with an IntersectionObserver watching a 1px sentinel element placed just above each header, not with a scroll listener.',
            '- Under `prefers-reduced-motion: reduce`, drop the shadow transition so the shadow just appears.',
          ]
        : ["- Don't change the header's style when it is stuck."]),
      '- Keep the headers as real headings (h2 or h3) in DOM order.',
    ].join('\n'),
  acceptance: (v) => [
    `While scrolling, each header pins ${v.offset}px from the top of the scroll container.`,
    'The next header pushes the current one up; they never overlap.',
    'No row content is visible through a stuck header.',
    v.shadow
      ? 'The shadow appears only while a header is stuck and goes away when it scrolls back into place.'
      : 'A stuck header looks the same as one in its normal place.',
    'It works inside a nested scroll container, not only when the whole page scrolls.',
    'Tabbing through rows never leaves the focused row hidden behind a stuck header.',
    'Screen readers read each header before its rows.',
  ],
  code: (v) => ({
    css: [
      '.list {',
      '  overflow-y: auto;',
      `  scroll-padding-top: calc(var(--header-height) + ${v.offset}px);`,
      '}',
      '',
      '.section-header {',
      '  position: sticky;',
      `  top: ${v.offset}px;`,
      '  z-index: 1;',
      '  background: var(--surface); /* opaque, so rows never show through */',
      ...(v.shadow
        ? [
            '  transition: box-shadow 150ms ease;',
            '}',
            '',
            '.section-header[data-stuck="true"] {',
            '  box-shadow: 0 1px 0 var(--border), 0 4px 12px rgb(0 0 0 / 0.06);',
            '}',
            '',
            '@media (prefers-reduced-motion: reduce) {',
            '  .section-header { transition: none; }',
            '}',
          ]
        : ['}']),
    ].join('\n'),
    ...(v.shadow
      ? {
          js: [
            '// A 1px .sentinel sits just above each header.',
            '// When it scrolls out of view, the header below it is stuck.',
            "const list = document.querySelector('.list')",
            'const io = new IntersectionObserver(',
            '  (entries) => {',
            '    for (const entry of entries) {',
            '      const header = entry.target.nextElementSibling',
            `      const above = entry.boundingClientRect.top < entry.rootBounds.top + ${v.offset + 1}`,
            '      header.dataset.stuck = String(!entry.isIntersecting && above)',
            '    }',
            '  },',
            `  { root: list, rootMargin: '-${v.offset + 1}px 0px 0px 0px' },`,
            ')',
            "list.querySelectorAll('.sentinel').forEach((s) => io.observe(s))",
          ].join('\n'),
        }
      : {}),
  }),
  a11y: 'Keep stuck headers as real headings in reading order, and set scroll-padding-top on the scroll container so a focused row is never hidden underneath a stuck header.',
  related: ['scroll-fade', 'scroll-snap', 'pinned-horizontal-scroll'],
  confusedWith: [
    {
      slug: 'pinned-horizontal-scroll',
      difference: 'Sticky pins one element while its section scrolls past. Pinned horizontal scroll pins a whole section and turns vertical scrolling into sideways movement.',
    },
  ],
  sources: [
    { label: 'MDN — position: sticky', url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky_positioning' },
  ],
})
```

If Task 2 Step 10 needed the explicit generic, write `defineTerm<typeof controls>({` here.

- [ ] **Step 3: Run the checks**

Run: `npm run check && npm run test:e2e -- tests/e2e/sticky.spec.ts`
Expected: lint finds no issues, and the three Sticky tests PASS on both projects.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: write Sticky in full with its demo (review status)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Entry page, compare page and prompt builders

**Files:**
- Create: `src/lib/prompt.ts`, `src/lib/prompt.test.ts`, `src/components/entry/entry-view.tsx`, `src/components/entry/code-tabs.tsx`, `src/components/entry/compare-view.tsx`, `src/app/terms/[slug]/page.tsx`, `src/app/compare/[pair]/page.tsx`, `tests/e2e/entry.spec.ts`

**Interfaces:**
- Consumes: everything above
- Produces: `CODE_APPROACHES: readonly { key: keyof CodeRef; label: string; lang: string }[]`, `termUrl(slug): string`, `usedTokens(text): [string, string][]`, `buildPromptText(term: FullTerm, values: Values): string`, `buildMarkdown(term: FullTerm, values: Values, nameOf: (slug: string) => string): string`, `<EntryView slug />`, `<CodeTabs code />`, `<CompareView a b difference />`

- [ ] **Step 1: Write the failing builder tests**

`src/lib/prompt.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { buildMarkdown, buildPromptText, usedTokens } from './prompt'
import { defineTerm, type FullTerm } from './term-types'

const term = defineTerm({
  slug: 'demo', name: 'Demo', category: 'scroll', order: 1, status: 'review',
  definition: 'A demo term.',
  demo: { component: () => null, label: 'x', controls: [{ id: 'ms', type: 'range', label: 'Duration', min: 100, max: 300, step: 50, default: 200 }] },
  aliases: ['sample', 'example'], description: 'What it is.', useWhen: ['Here.'], avoidWhen: ['There.'],
  a11y: 'Be kind.', related: [],
  prompt: (v) => `Fade it in over ${v.ms}ms with var(--ease-out).`,
  acceptance: (v) => [`Takes ${v.ms}ms.`, 'No jump.'],
  code: (v) => ({ css: `.a { transition: opacity ${v.ms}ms var(--ease-out); }` }),
}) as FullTerm

describe('usedTokens', () => {
  test('lists only tokens the text mentions', () => {
    expect(usedTokens('var(--ease-out)')).toEqual([['--ease-out', 'cubic-bezier(0.23, 1, 0.32, 1)']])
    expect(usedTokens('nothing here')).toEqual([])
  })
})

describe('buildPromptText', () => {
  const text = buildPromptText(term, { ms: 250 })
  test('uses the current control values', () => {
    expect(text).toContain('Fade it in over 250ms')
    expect(text).toContain('- [ ] Takes 250ms.')
  })
  test('is self-contained: title, checklist, token values, link', () => {
    expect(text.startsWith('# Demo\n')).toBe(true)
    expect(text).toContain('## Acceptance checklist')
    expect(text).toContain('`--ease-out`: `cubic-bezier(0.23, 1, 0.32, 1)`')
    expect(text).toContain('Reference: https://moveset.lucaslima.design/terms/demo')
  })
})

describe('buildMarkdown', () => {
  test('contains every section of the entry', () => {
    const md = buildMarkdown(term, { ms: 200 }, (slug) => slug)
    for (const part of ['# Demo', 'Also called: sample, example', '> A demo term.', 'What it is.', '## Use when', '- Here.', '## Avoid when', '## Prompt', '## Code', '### CSS', '```css', '## Accessibility', 'Be kind.']) {
      expect(md).toContain(part)
    }
  })
})
```

Run: `npx vitest run src/lib/prompt.test.ts`
Expected: FAIL, cannot resolve `./prompt`.

- [ ] **Step 2: Write `src/lib/prompt.ts`**

```ts
import { SITE_URL } from './site'
import type { CodeRef, FullTerm, Values } from './term-types'
import { TOKENS } from './tokens'

export const CODE_APPROACHES: readonly { key: keyof CodeRef; label: string; lang: string }[] = [
  { key: 'css', label: 'CSS', lang: 'css' },
  { key: 'js', label: 'JS', lang: 'js' },
  { key: 'motion', label: 'Motion', lang: 'tsx' },
  { key: 'gsap', label: 'GSAP', lang: 'js' },
]

export function termUrl(slug: string): string {
  return `${SITE_URL}/terms/${slug}`
}

export function usedTokens(text: string): [string, string][] {
  return Object.entries(TOKENS).filter(([name]) => text.includes(name))
}

const checklist = (items: readonly string[]) => items.map((i) => `- [ ] ${i}`).join('\n')

export function buildPromptText(term: FullTerm, values: Values): string {
  const prompt = term.prompt(values).trim()
  const code = Object.values(term.code(values)).join('\n')
  const tokens = usedTokens(`${prompt}\n${code}`)
  const parts = [`# ${term.name}`, prompt, `## Acceptance checklist\n\n${checklist(term.acceptance(values))}`]
  if (tokens.length > 0) parts.push(`## Values\n\n${tokens.map(([n, v]) => `- \`${n}\`: \`${v}\``).join('\n')}`)
  parts.push(`Reference: ${termUrl(term.slug)}`)
  return `${parts.join('\n\n')}\n`
}

export function buildMarkdown(term: FullTerm, values: Values, nameOf: (slug: string) => string): string {
  const code = term.code(values)
  const parts = [
    `# ${term.name}`,
    term.aliases.length > 0 ? `Also called: ${term.aliases.join(', ')}` : '',
    `> ${term.definition}`,
    term.description,
    `## Use when\n\n${term.useWhen.map((i) => `- ${i}`).join('\n')}`,
    `## Avoid when\n\n${term.avoidWhen.map((i) => `- ${i}`).join('\n')}`,
    `## Prompt\n\n\`\`\`text\n${term.prompt(values).trim()}\n\`\`\`\n\n### Acceptance checklist\n\n${checklist(term.acceptance(values))}`,
    `## Code\n\n${CODE_APPROACHES.filter((a) => code[a.key])
      .map((a) => `### ${a.label}\n\n\`\`\`${a.lang}\n${code[a.key]}\n\`\`\``)
      .join('\n\n')}`,
    `## Accessibility\n\n${term.a11y}`,
    term.related.length > 0 ? `## Related\n\n${term.related.map((s) => `- [${nameOf(s)}](${termUrl(s)})`).join('\n')}` : '',
    (term.confusedWith ?? []).length > 0
      ? `## Often confused with\n\n${(term.confusedWith ?? []).map((c) => `- [${nameOf(c.slug)}](${termUrl(c.slug)}): ${c.difference}`).join('\n')}`
      : '',
    `Source: ${termUrl(term.slug)}`,
  ]
  return `${parts.filter(Boolean).join('\n\n')}\n`
}
```

Run: `npx vitest run src/lib/prompt.test.ts`
Expected: PASS.

- [ ] **Step 3: Write the failing entry tests**

`tests/e2e/entry.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow, trackErrors } from './helpers'

const scroller = (page: Page) => page.locator('main [data-demo="sticky"] [data-scroller]')

test('entry sections appear in the specified order', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/terms/sticky')
  await expect(page.getByRole('heading', { level: 1, name: 'Sticky' })).toBeVisible()
  const h2s = await page.getByRole('main').getByRole('heading', { level: 2 }).allTextContents()
  expect(h2s).toEqual(['Use when', 'Avoid when', 'Prompt', 'Code', 'Accessibility', 'Related', 'Often confused with'])
  await expectNoHorizontalOverflow(page)
  expect(errors).toEqual([])
})

test('controls rewrite the prompt and the checklist', async ({ page }) => {
  await page.goto('/terms/sticky')
  const prompt = page.getByRole('main').locator('pre').first()
  await expect(prompt).toContainText('top: 0px')
  const slider = page.getByLabel('Top offset')
  await slider.focus()
  await slider.press('ArrowRight')
  await slider.press('ArrowRight')
  await expect(prompt).toContainText('top: 8px')
  await expect(page.getByText('each header pins 8px from the top')).toBeVisible()
  await page.getByRole('switch', { name: 'Shadow when stuck' }).click()
  await expect(prompt).toContainText("Don't change the header's style when it is stuck.")
})

test('copy as prompt copies prompt, checklist and link', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/terms/sticky')
  await page.getByRole('button', { name: 'Copy as prompt' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('# Sticky')
  expect(text).toContain('## Acceptance checklist')
  expect(text).toContain('https://moveset.lucaslima.design/terms/sticky')
})

test('the demo really sticks at the chosen offset', async ({ page }) => {
  await page.goto('/terms/sticky')
  await page.getByLabel('Top offset').focus()
  await page.getByLabel('Top offset').press('ArrowRight')
  await page.getByLabel('Top offset').press('ArrowRight')
  // Takeover listeners attach only while the demo is playing.
  await expect(page.locator('main [data-demo="sticky"]')).toHaveAttribute('data-playing', 'true')
  await scroller(page).hover()
  await page.mouse.wheel(0, 120)
  await expect(scroller(page)).toHaveAttribute('data-taken-over', 'true')
  await scroller(page).evaluate((el) => {
    el.scrollTop = 160
  })
  await expect(scroller(page).locator('[data-sticky-header][data-stuck="true"]').first()).toBeVisible()
  const gap = await scroller(page).evaluate((el) => {
    const top = el.getBoundingClientRect().top
    const stuck = [...el.querySelectorAll<HTMLElement>('[data-sticky-header]')].map((h) => h.getBoundingClientRect().top - top)
    return Math.min(...stuck.map((d) => Math.abs(d - 8)))
  })
  expect(gap).toBeLessThanOrEqual(1)
})

test('scrolling the demo takes over; replay hands it back', async ({ page }) => {
  await page.goto('/terms/sticky')
  await expect(page.locator('main [data-demo="sticky"]')).toHaveAttribute('data-playing', 'true')
  await scroller(page).hover()
  await page.mouse.wheel(0, 100)
  await expect(scroller(page)).toHaveAttribute('data-taken-over', 'true')
  await page.getByRole('button', { name: 'Replay' }).click()
  await expect(scroller(page)).toHaveAttribute('data-taken-over', 'false')
})

test('rapid replay never stacks animations', async ({ page }) => {
  await page.goto('/terms/sticky')
  const replay = page.getByRole('button', { name: 'Replay' })
  for (let i = 0; i < 5; i++) await replay.click()
  await expect(scroller(page)).toHaveAttribute('data-active', '1')
})

test('drafts have no page and are never linked as prev/next', async ({ page }) => {
  const response = await page.goto('/terms/parallax')
  expect(response?.status()).toBe(404)
  await page.goto('/terms/sticky')
  const nav = page.getByRole('navigation', { name: 'Previous and next' })
  await expect(nav.getByRole('link')).toHaveCount(0)
})

test('a compare pair with a draft side has no page', async ({ page }) => {
  const response = await page.goto('/compare/pinned-horizontal-scroll-vs-sticky')
  expect(response?.status()).toBe(404)
})
```

Run: `npm run test:e2e -- tests/e2e/entry.spec.ts`
Expected: FAIL (no route).

- [ ] **Step 4: Write `src/components/entry/code-tabs.tsx`**

```tsx
'use client'

import { useState, type KeyboardEvent } from 'react'
import { CopyButton } from '@/components/copy-button'
import { CODE_APPROACHES } from '@/lib/prompt'
import type { CodeRef } from '@/lib/term-types'

export function CodeTabs({ code }: { code: CodeRef }) {
  const available = CODE_APPROACHES.filter((a) => code[a.key])
  const [active, setActive] = useState(available[0]?.key)
  const current = available.find((a) => a.key === active) ?? available[0]
  if (!current) return null
  const src = code[current.key] ?? ''

  function onKeyDown(e: KeyboardEvent, i: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + available.length) % available.length
    setActive(available[n].key)
    document.getElementById(`tab-${available[n].key}`)?.focus()
  }

  return (
    <div className="mt-3 rounded-2xl bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-line px-2">
        <div role="tablist" aria-label="Code approach" className="flex">
          {available.map((a, i) => {
            const selected = a.key === current.key
            return (
              <button
                key={a.key}
                id={`tab-${a.key}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="code-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(a.key)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={`px-3 py-2.5 text-sm ${selected ? 'text-ink shadow-[inset_0_-1px_0_var(--ink)]' : 'text-ink-muted hover:text-ink'}`}
              >
                {a.label}
              </button>
            )
          })}
        </div>
        <CopyButton text={src} label={`Copy ${current.label} code`} className="size-8 justify-center rounded-lg text-ink-muted hover:text-ink" />
      </div>
      <pre id="code-panel" role="tabpanel" aria-labelledby={`tab-${current.key}`} tabIndex={0} className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-ink">
        <code>{src}</code>
      </pre>
    </div>
  )
}
```

- [ ] **Step 5: Write `src/components/entry/entry-view.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CopyButton } from '@/components/copy-button'
import { DemoControls } from '@/components/demo/demo-controls'
import { DemoPlayer } from '@/components/demo/demo-player'
import { CategoryIcon } from '@/components/site/category-icon'
import { SoonPill } from '@/components/site/soon-pill'
import { getCategory } from '@/lib/categories'
import { compareSlug, confusedPairs, defaultValues, isVisible, neighbors } from '@/lib/content'
import { buildMarkdown, buildPromptText } from '@/lib/prompt'
import { isFull, type FullTerm, type Values } from '@/lib/term-types'
import { getTerm, terms } from '@/lib/terms'
import { CodeTabs } from './code-tabs'

const nameOf = (slug: string) => getTerm(slug).name
const h2 = 'text-[15px] font-medium text-ink'

export function EntryView({ slug }: { slug: string }) {
  const term = getTerm(slug)
  if (!isFull(term)) throw new Error(`"${slug}" is a draft and has no entry page.`)
  return <Entry term={term} />
}

function Entry({ term }: { term: FullTerm }) {
  const [values, setValues] = useState<Values>(() => defaultValues(term.demo.controls))
  const [replayRequest, setReplayRequest] = useState(0)
  const { prev, next } = neighbors(terms, term.slug)
  const confused = confusedPairs(terms)
    .filter((p) => p.a === term.slug || p.b === term.slug)
    .map((p) => {
      const other = getTerm(p.a === term.slug ? p.b : p.a)
      return { other, difference: p.difference, href: isVisible(other) ? `/compare/${compareSlug(p.a, p.b)}` : null }
    })

  return (
    <article>
      <div className="h-80 rounded-2xl bg-surface p-3 shadow-card sm:h-96">
        <DemoPlayer slug={term.slug} size="detail" values={values} replayRequest={replayRequest} />
      </div>
      <DemoControls
        controls={term.demo.controls ?? []}
        values={values}
        onChange={(id, value) => setValues((s) => ({ ...s, [id]: value }))}
        onReplay={() => setReplayRequest((n) => n + 1)}
      />

      <header className="mt-12">
        <p className="mb-2 flex items-center gap-2 text-sm text-ink-muted">
          <CategoryIcon slug={term.category} />
          {getCategory(term.category).name}
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-medium tracking-[-0.015em]">{term.name}</h1>
          <div className="flex flex-wrap gap-1 text-sm">
            <CopyButton text={() => buildPromptText(term, values)} label="Copy as prompt" className="rounded-full px-3 py-1.5 text-ink-muted hover:text-ink">
              Copy as prompt
            </CopyButton>
            <CopyButton text={() => buildMarkdown(term, values, nameOf)} label="Copy as markdown" className="rounded-full px-3 py-1.5 text-ink-muted hover:text-ink">
              Copy as markdown
            </CopyButton>
          </div>
        </div>
        {term.aliases.length > 0 && <p className="mt-2 text-sm text-ink-muted">Also called {term.aliases.join(', ')}</p>}
        <p className="mt-6 text-[17px] leading-relaxed text-ink">{term.definition}</p>
        <p className="mt-3 leading-relaxed text-ink-muted">{term.description}</p>
      </header>

      <div className="mt-12 grid gap-8 sm:grid-cols-2">
        <section aria-labelledby="use-when">
          <h2 id="use-when" className={h2}>Use when</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-ink-muted">
            {term.useWhen.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <section aria-labelledby="avoid-when">
          <h2 id="avoid-when" className={h2}>Avoid when</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-ink-muted">
            {term.avoidWhen.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      </div>

      <section aria-labelledby="prompt" className="mt-12">
        <h2 id="prompt" className={h2}>Prompt</h2>
        <div className="relative mt-3 rounded-2xl bg-surface shadow-card">
          <pre className="whitespace-pre-wrap p-5 pr-14 font-mono text-[13px] leading-relaxed text-ink">
            <code>{term.prompt(values)}</code>
          </pre>
          <div className="absolute right-3 top-3">
            <CopyButton text={() => buildPromptText(term, values)} label="Copy prompt" className="size-8 justify-center rounded-lg text-ink-muted hover:text-ink" />
          </div>
        </div>
        <h3 className="mt-6 text-sm font-medium">Acceptance checklist</h3>
        <ul className="mt-2 space-y-2 text-sm leading-relaxed text-ink-muted">
          {term.acceptance(values).map((item, i) => (
            <li key={i} className="flex gap-2.5">
              <span aria-hidden className="mt-1 size-3 shrink-0 rounded-[4px] shadow-[inset_0_0_0_1px_var(--line-strong)]" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="code" className="mt-12">
        <h2 id="code" className={h2}>Code</h2>
        <CodeTabs code={term.code(values)} />
      </section>

      <section aria-labelledby="a11y" className="mt-12">
        <h2 id="a11y" className={h2}>Accessibility</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">{term.a11y}</p>
      </section>

      <section aria-labelledby="related" className="mt-12">
        <h2 id="related" className={h2}>Related</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {term.related.map((s) => {
            const r = getTerm(s)
            const visible = isVisible(r)
            return (
              <li key={s} className="relative rounded-xl bg-surface p-4 shadow-card">
                <p className={`flex items-center justify-between gap-2 text-sm ${visible ? 'text-ink' : 'text-ink-faint'}`}>
                  {visible ? <Link href={`/terms/${s}`} className="after:absolute after:inset-0">{r.name}</Link> : r.name}
                  {!visible && <SoonPill />}
                </p>
                <p className="mt-1 text-xs leading-snug text-ink-faint">{r.definition}</p>
              </li>
            )
          })}
        </ul>
      </section>

      {confused.length > 0 && (
        <section aria-labelledby="confused" className="mt-12">
          <h2 id="confused" className={h2}>Often confused with</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {confused.map(({ other, difference, href }) => (
              <li key={other.slug}>
                <span className="flex items-center gap-2">
                  {href ? (
                    <Link href={href} className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                      {term.name} vs {other.name}
                    </Link>
                  ) : (
                    <span className="text-ink-faint">{other.name}</span>
                  )}
                  {!href && <SoonPill />}
                </span>
                <span className="mt-1 block leading-relaxed text-ink-muted">{difference}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav aria-label="Previous and next" className="mt-16 flex justify-between gap-4 border-t border-line pt-6 text-sm">
        {prev ? <Link href={`/terms/${prev.slug}`} className="text-ink-muted hover:text-ink">← {prev.name}</Link> : <span />}
        {next ? <Link href={`/terms/${next.slug}`} className="text-ink-muted hover:text-ink">{next.name} →</Link> : <span />}
      </nav>
    </article>
  )
}
```

- [ ] **Step 6: Write `src/components/entry/compare-view.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { DemoPlayer } from '@/components/demo/demo-player'
import { getTerm } from '@/lib/terms'

export function CompareView({ a, b, difference }: { a: string; b: string; difference: string }) {
  const sides = [getTerm(a), getTerm(b)]
  return (
    <article>
      <h1 className="text-2xl font-medium tracking-[-0.015em]">{sides[0].name} vs {sides[1].name}</h1>
      <p className="mt-3 text-[17px] leading-relaxed text-ink">{difference}</p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {sides.map((t) => (
          <section key={t.slug} aria-labelledby={`cmp-${t.slug}`}>
            <div className="h-64 rounded-2xl bg-surface p-3 shadow-card">
              <DemoPlayer slug={t.slug} size="detail" />
            </div>
            <h2 id={`cmp-${t.slug}`} className="mt-4 text-[15px] font-medium">
              <Link href={`/terms/${t.slug}`} className="underline decoration-line-strong underline-offset-4 hover:decoration-ink">{t.name}</Link>
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t.definition}</p>
          </section>
        ))}
      </div>
    </article>
  )
}
```

- [ ] **Step 7: Write the two route shells**

These are server components. They read `terms-data.json` only.

`src/app/terms/[slug]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EntryView } from '@/components/entry/entry-view'
import data from '@/generated/terms-data.json'
import { isVisible } from '@/lib/content'
import type { TermData } from '@/lib/term-data'

const terms = data as TermData[]
type Params = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return terms.filter((t) => isVisible(t)).map((t) => ({ slug: t.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const term = terms.find((t) => t.slug === slug)
  return term ? { title: term.name, description: term.definition } : {}
}

export default async function TermPage({ params }: Params) {
  const { slug } = await params
  const term = terms.find((t) => t.slug === slug)
  if (!term || !isVisible(term)) notFound()
  return <EntryView slug={slug} />
}
```

`src/app/compare/[pair]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CompareView } from '@/components/entry/compare-view'
import data from '@/generated/terms-data.json'
import { compareSlug, confusedPairs, isVisible } from '@/lib/content'
import type { TermData } from '@/lib/term-data'

const terms = data as TermData[]
type Params = { params: Promise<{ pair: string }> }

function visiblePairs() {
  const visible = (slug: string) => {
    const t = terms.find((x) => x.slug === slug)
    return Boolean(t && isVisible(t))
  }
  return confusedPairs(terms).filter((p) => visible(p.a) && visible(p.b))
}

const findPair = (key: string) => visiblePairs().find((p) => compareSlug(p.a, p.b) === key)
const nameOf = (slug: string) => terms.find((t) => t.slug === slug)?.name ?? slug

export const dynamicParams = false

export function generateStaticParams() {
  return visiblePairs().map((p) => ({ pair: compareSlug(p.a, p.b) }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const pair = findPair((await params).pair)
  return pair ? { title: `${nameOf(pair.a)} vs ${nameOf(pair.b)}`, description: pair.difference } : {}
}

export default async function ComparePage({ params }: Params) {
  const pair = findPair((await params).pair)
  if (!pair) notFound()
  return <CompareView a={pair.a} b={pair.b} difference={pair.difference} />
}
```

- [ ] **Step 8: Run everything**

```bash
npm run check
npm run test:e2e
npm run build
```

Expected: all unit tests PASS; every e2e spec PASSes on desktop and mobile; the production build succeeds (Sticky is `review`, so production generates no term pages, and that is expected).

If `/terms/parallax` returns 200 in dev instead of 404, confirm `dynamicParams = false` is exported, and that `notFound()` is reached for drafts.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: entry page with live prompt, code tabs and compare view

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Visual checkpoint

**Files:**
- Create: `playwright.checkpoint.config.ts`, `tests/checkpoint/checkpoint.spec.ts`, `docs/checkpoints/m2/` (screenshots)

**Interfaces:**
- Consumes: the running site.
- Produces: screenshots of index and Sticky in light and dark, at desktop and mobile widths, for Lucas.

- [ ] **Step 1: Write the checkpoint config and spec**

`playwright.checkpoint.config.ts`:

```ts
import base from './playwright.config'
import { defineConfig } from '@playwright/test'

export default defineConfig({ ...base, testDir: 'tests/checkpoint', retries: 0 })
```

`tests/checkpoint/checkpoint.spec.ts`:

```ts
import { test } from '@playwright/test'

for (const scheme of ['light', 'dark'] as const) {
  for (const [name, path] of [['index', '/'], ['sticky', '/terms/sticky']] as const) {
    test(`${name} ${scheme}`, async ({ page }, info) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto(path)
      await page.waitForTimeout(1500)
      await page.screenshot({ path: `docs/checkpoints/m2/${name}-${scheme}-${info.project.name}.png`, fullPage: true })
    })
  }
}
```

- [ ] **Step 2: Capture**

Run: `npm run checkpoint`
Expected: 8 PNGs in `docs/checkpoints/m2/` (2 pages × 2 schemes × 2 projects).

- [ ] **Step 3: Run the complete verification and keep the output**

```bash
npm run check
npm run test:e2e
npm run build
```

Expected: everything PASSes. Save the summary lines (test counts and build result) for the report.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: milestone 2 checkpoint screenshots

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Hand to Lucas**

Start the dev server in the browser pane with `preview_start`. Add a `.claude/launch.json` entry first if needed: `{ "name": "moveset", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 3000 }`. Open `/` and `/terms/sticky`. Report:
- the actual test and build output from Step 3
- the screenshots
- what to look at: the card grid and sidebar, Sticky's demo in a card and on its page, the controls rewriting the prompt, light and dark, mobile.

Stop and collect Lucas's visual feedback before planning milestone 3.
