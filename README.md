# moveset

A visual dictionary of design engineering terms. See `docs/` for the spec, plan and house rules.

## Adding a term

1. Add one file, `src/terms/<slug>.tsx`, using `defineTerm`. Copy `src/terms/sticky.tsx` as a reference.
2. Run `npm run generate`. It also runs automatically before `dev`, `build` and `test`.
3. Restart `npm run dev` after adding a term or changing its name, status, category or order. The generated registry and `terms-data.json` are only rebuilt at start. To rebuild them as you save, run `npm run dev:watch` in a second terminal while authoring.
4. Read `docs/house-rules.md` before writing the demo, the prompt or the code samples. `npm run check` lints them against those rules.
5. Terms with `status: 'review'` only show in dev. A term is published once it has a passing, approved review.
