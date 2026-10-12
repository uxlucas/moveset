# Deploy

moveset is a static Next.js build on Vercel. No `vercel.json`, no environment variables: `npm run build` runs `npm run generate` first (the `prebuild` script), which writes the registry, `public/llms.txt`, `public/terms/<slug>.md` and `public/api/terms.json` before Next builds.

## First deploy (Vercel dashboard)

1. **Import the repo.** Add New → Project → import `uxlucas/moveset`. Production branch: `main`.
2. **Keep the defaults.** Framework preset: Next.js. Build command, output directory and install command stay as detected (build is `npm run build`). The `prepare` script that sets up git hooks exits quietly when there is no git checkout. Add no environment variables. Production must not set `NEXT_PUBLIC_SHOW_REVIEW`; without it, review and draft terms stay off the site and out of every agent output. Deploy.
3. **Add the domain.** Project → Settings → Domains → add `moveset.lucaslima.design`. At the DNS host for `lucaslima.design`, add the record Vercel shows, normally a `CNAME` with name `moveset` pointing at the target Vercel gives (for example `cname.vercel-dns.com`). Wait for the domain to show Valid Configuration; Vercel issues the certificate itself.

`SITE_URL` in `src/lib/site.ts` is already `https://moveset.lucaslima.design`. If the domain ever changes, change that one value and redeploy.

## After the first deploy

Open each of these on the production domain:

- `/`: the index loads, the install command reads `npx skills add uxlucas/moveset`.
- `/terms/sticky`: the entry loads with its demo. View source: the prompt text is in the HTML.
- `/llms.txt`: lists every published term with a link to its `.md`, and ends with the `terms.json` link.
- `/terms/sticky.md`: the entry as markdown, starting with `# Sticky`.
- `/api/terms.json`: `terms` holds exactly the published slugs.
- Review and draft terms are absent: `/terms/parallax` and `/terms/parallax.md` are 404, and neither `llms.txt` nor `terms.json` mentions Parallax (or any other term not yet published).
- `npx skills add uxlucas/moveset --list` finds the `moveset` skill once `skills/` is on `main`.

## Publishing a term later

Push to `main`. Vercel rebuilds on every push; the generated outputs come from the term files, so nothing else needs doing. The committed `skills/` folder must be regenerated and committed with the term (CI fails otherwise).
