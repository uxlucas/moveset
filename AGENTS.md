# moveset agents

- One term is one file: `src/terms/<slug>.tsx`, built with `defineTerm`.
- `npm run generate` rebuilds the registry and `terms-data.json`. It runs before dev, build and test.
- Restart `npm run dev` after adding a term or changing its name, status, category or order (or run `npm run dev:watch` in a second terminal).
- `review` terms only show in dev; `published` terms need a passing, approved review file.
- Read `docs/house-rules.md` before writing a demo or prompt.
- This is Next.js 16: check `node_modules/next/dist/docs/` before relying on older APIs.
- `npm run test:e2e` needs Playwright's Chromium. In a container that ships one instead, point `PLAYWRIGHT_CHROMIUM_PATH` at it (the Claude cloud container: `/opt/pw-browsers/chromium`). Pipe the output to a file, not `tail`: a browser that fails to launch exits 0 through a pipe.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
