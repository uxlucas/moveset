# Contributing

moveset is opinionated on purpose: fewer terms, each one done properly. A new term is welcome when it names a piece of motion, feel or polish that people describe but cannot name, and when it can be shown moving. Component names and generic UI vocabulary are out of scope.

## Before you write

Read [`docs/house-rules.md`](docs/house-rules.md). Every demo, prompt and code sample is held to it, and `npm run check` lints the content against it. The [spec](docs/spec.md) says what the site is and the [decisions](docs/decisions) say why things are the way they are.

## Adding a term

1. Create `src/terms/<slug>.tsx` with `defineTerm`. Copy [`src/terms/sticky.tsx`](src/terms/sticky.tsx) as the reference: it has every field in use.
2. Start with `status: 'draft'`: a name, a definition and a working demo. A draft never gets a page.
3. Run `npm run dev` (or `npm run dev:watch` beside it). Restart the dev server after adding a term or changing its name, status, category or order.
4. Write the entry: when to use it and when not to, the prompt and its acceptance list, the code for each route, the accessibility note, related and often-confused terms, sources. Set `status: 'review'`; it now shows in development.
5. Verify it the way the published terms were: the demo in light and dark, at 1280 and 375 wide, with no overflow and no console errors; reduced motion; the keyboard; the code tabs built verbatim and measured against the acceptance list. Add an e2e spec for what the entry promises.
6. Write `reviews/<slug>.md`: what was checked, what was found, what was fixed. A term is `published` only with a passing, approved review.
7. Run `npm run generate` and commit `skills/` with the term. The pre-commit hook and CI fail if it is stale.

## Demos

The entry page shows a real component with real content: text is text, icons are lucide, and the component is the one the term is usually applied to. Index cards keep a wireframe of the same layout. Demos stay grayscale, never autoplay under reduced motion, and never drive per-frame animation through React state. See [`docs/decisions/2026-10-14-real-ui-demos.md`](docs/decisions/2026-10-14-real-ui-demos.md).

## Copy

Plain, specific and calm. Say what it does, not how good it is. Definitions are one sentence under 140 characters. The content lint blocks a short list of words; it is in the house rules.

## Checks

```
npm run check      # generate, typecheck, unit tests, content lint
npm run test:e2e   # Playwright on desktop and mobile Chromium
```
