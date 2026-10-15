# moveset

A visual dictionary of design engineering terms. Each term shows the idea moving, gives it a precise name, says when to use it and when not to, and comes with a prompt you can paste into an AI coding agent, with acceptance criteria the result can be checked against.

Live at [moveset.lucaslima.design](https://moveset.lucaslima.design).

[![ci](https://github.com/uxlucas/moveset/actions/workflows/ci.yml/badge.svg)](https://github.com/uxlucas/moveset/actions/workflows/ci.yml)

## Why

You usually know what you want from an interface before you know what it is called: "that thing where the header sticks and the content slides under it". Describing it to an agent is slow and vague, and the result is close but wrong. moveset is the shared vocabulary: fewer terms, each one done properly, written to be acted on.

## For agents

- `npx skills add uxlucas/moveset` adds the whole vocabulary to your agent as a skill (the committed [`skills/moveset`](skills/moveset) folder).
- [`/llms.txt`](https://moveset.lucaslima.design/llms.txt) lists every published term with a markdown version of its entry at `/terms/<slug>.md`.
- [`/api/terms.json`](https://moveset.lucaslima.design/api/terms.json) is the same data as JSON.

Only published terms appear in any of these.

## What an entry holds

Every term is one typed file, `src/terms/<slug>.tsx`, built with `defineTerm`. It carries the live demo and its controls, a one-sentence definition, when to use it and when not to, the prompt (rewritten by the controls), an acceptance list an agent's output can be measured against, copy-ready code for each route (CSS, Motion, plain JS, as the term needs), accessibility notes, related and often-confused terms, and sources.

A term starts as a `draft`, moves to `review` (visible in development only), and is `published` once it has a passing review in [`reviews/`](reviews) and the owner's approval. The standard every demo and prompt is held to is [`docs/house-rules.md`](docs/house-rules.md).

## Running it

Node 22.

```
npm ci
npm run dev
```

`npm run dev` first runs `npm run generate`, which builds the term registry and `src/generated/terms-data.json` from the term files. Restart it after adding a term or changing a term's name, status, category or order, or run `npm run dev:watch` in a second terminal. `.env.development` sets `NEXT_PUBLIC_SHOW_REVIEW=1`, so review terms show while you work; production never sets it.

## Checks

```
npm run check      # generate, typecheck, unit tests and the content lint
npm run test:e2e   # Playwright, desktop and mobile Chromium, against a dev server it starts
```

The pre-commit hook runs `npm run check` and refuses a commit that leaves `skills/` stale. CI runs both, then a production build. To run the e2e with a Chromium already on the machine instead of the build Playwright downloads, set `PLAYWRIGHT_CHROMIUM_PATH` to its executable.

## Adding a term

See [CONTRIBUTING.md](CONTRIBUTING.md). The short version: copy `src/terms/sticky.tsx`, keep the house rules, write the review, commit `skills/` with it.

## Layout

| Path | What it is |
| --- | --- |
| `src/terms/` | One file per term. The content. |
| `src/components/` | The site shell, the index, the entry page and the demo runtime. |
| `src/lib/` | The term model, the content lint and site constants. |
| `scripts/` | The generator: registry, term data, agent outputs and the skill. |
| `skills/` | The generated skill, committed so `npx skills add` works. |
| `reviews/` | One review file per published term. |
| `docs/` | The [spec](docs/spec.md), the [house rules](docs/house-rules.md), [decisions](docs/decisions) and [deploying](docs/deploy.md). |
| `tests/` | Unit tests beside the code, e2e specs in `tests/e2e`. |

## Learned from

Most of what is here comes from [Rauno Freiberg](https://rauno.me), [Emil Kowalski](https://emilkowal.ski), [Jakub Krehel](https://jakub.kr) and [Paco Coursey](https://paco.me). Every term lists its sources; the full list is on [/about](https://moveset.lucaslima.design/about).

Made by [Lucas Lima](https://lucaslima.design).

## Licence

[MIT](LICENSE). The fonts (Inter and Geist Mono, loaded at build time) keep their own licences.
