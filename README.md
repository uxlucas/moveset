# moveset

A visual dictionary of design engineering terms. See `docs/` for the spec, plan and house rules.

## Adding a term

1. Add one file, `src/terms/<slug>.tsx`, using `defineTerm`. Copy `src/terms/sticky.tsx` as a reference.
2. Run `npm run generate`. It also runs automatically before `dev`, `build` and `test`.
3. Restart `npm run dev` after adding a term or changing its name, status, category or order. The generated registry and `terms-data.json` are only rebuilt at start. To rebuild them as you save, run `npm run dev:watch` in a second terminal while authoring.
4. Read `docs/house-rules.md` before writing the demo, the prompt or the code samples. `npm run check` lints them against those rules.
5. Terms with `status: 'review'` only show in dev. A term is published once it has a passing, approved review.
6. After publishing a term, run `npm run generate` and commit `skills/` with it. The skill folder is generated but committed so `npx skills add uxlucas/moveset` works; a test, the pre-commit hook and CI fail if it is out of date.

## Agent outputs

Generated from the term files by `npm run generate`, published terms only (never `review` or `draft`, whatever `NEXT_PUBLIC_SHOW_REVIEW` says):

- `/llms.txt`, `/terms/<slug>.md` and `/api/terms.json`, written to `public/` (gitignored).
- `skills/moveset/`: `SKILL.md` (how to use, glossary, house tokens) and `terms/<slug>.md` (committed). The same files are served for download at `/skills/moveset/SKILL.md` and `/skills/moveset/terms/<slug>.md` (copied to `public/skills/`, gitignored).

The generators live in `scripts/lib/outputs.ts`. Deploying: `docs/deploy.md`.
