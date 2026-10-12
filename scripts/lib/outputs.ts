import { CATEGORIES } from '../../src/lib/categories'
import { compareSlug, confusedPairs, defaultValues } from '../../src/lib/content'
import { buildMarkdown, buildPromptText, termUrl, type Resolve } from '../../src/lib/prompt'
import { SITE_URL } from '../../src/lib/site'
import { isFull, type FullTerm, type Term } from '../../src/lib/term-types'
import { TOKENS } from '../../src/lib/tokens'

// Everything here feeds machine-readable outputs: only published terms, whatever NEXT_PUBLIC_SHOW_REVIEW says.

export const SUMMARY =
  'A visual dictionary of design engineering terms. Each one shows the idea moving, gives it a precise name, and comes with a prompt you can give your agent.'
export const JSON_URL = `${SITE_URL}/api/terms.json`
export const SKILL_DESCRIPTION_LIMIT = 1024

const categoryRank = (slug: string) => CATEGORIES.findIndex((c) => c.slug === slug)

/** Published terms in display order: category, then order within it. */
export function publishedTerms(terms: readonly Term[]): FullTerm[] {
  return terms
    .filter((t): t is FullTerm => isFull(t) && t.status === 'published')
    .sort((a, b) => categoryRank(a.category) - categoryRank(b.category) || a.order - b.order)
}

export const markdownUrl = (slug: string) => `${SITE_URL}/terms/${slug}.md`

function publishedResolver(terms: readonly Term[]): Resolve {
  return (slug) => {
    const t = terms.find((x) => x.slug === slug)
    return { name: t?.name ?? slug, visible: t?.status === 'published' }
  }
}

/** confusedWith is declared on one side; outputs list it on both. */
export function confusedFor(term: { slug: string }, terms: readonly Term[]): { slug: string; difference: string }[] {
  return confusedPairs(terms)
    .filter((p) => p.a === term.slug || p.b === term.slug)
    .map((p) => ({ slug: p.a === term.slug ? p.b : p.a, difference: p.difference }))
}

export function renderTermMarkdown(term: FullTerm, terms: readonly Term[]): string {
  return buildMarkdown(term, defaultValues(term.demo.controls), publishedResolver(terms), confusedFor(term, terms))
}

export function renderLlmsTxt(terms: readonly Term[]): string {
  const published = publishedTerms(terms)
  const sections = CATEGORIES.map((c) => ({ c, list: published.filter((t) => t.category === c.slug) }))
    .filter((s) => s.list.length > 0)
    .map(({ c, list }) => `## ${c.name}\n\n${list.map((t) => `- [${t.name}](${markdownUrl(t.slug)}): ${t.definition}`).join('\n')}`)
  const data = `## Data\n\n- [terms.json](${JSON_URL}): every term above as JSON, with its controls, prompt, acceptance checklist and code at default values`
  return `${[`# moveset`, `> ${SUMMARY}`, ...sections, data].join('\n\n')}\n`
}

/** Reproducible: the same term files always give the same bytes. */
export function renderTermsJson(terms: readonly Term[]) {
  const published = publishedTerms(terms)
  const isPublished = (slug: string) => published.some((t) => t.slug === slug)
  return {
    site: SITE_URL,
    terms: published.map((t) => {
      const values = defaultValues(t.demo.controls)
      return {
        slug: t.slug,
        name: t.name,
        category: t.category,
        order: t.order,
        aliases: [...t.aliases],
        definition: t.definition,
        description: t.description,
        useWhen: [...t.useWhen],
        avoidWhen: [...t.avoidWhen],
        a11y: t.a11y,
        related: t.related.filter(isPublished),
        confusedWith: confusedFor(t, terms)
          .filter((c) => isPublished(c.slug))
          .map((c) => ({ ...c, compare: `${SITE_URL}/compare/${compareSlug(t.slug, c.slug)}` })),
        controls: t.demo.controls ?? [],
        defaults: values,
        prompt: t.prompt(values).trim(),
        promptText: buildPromptText(t, values),
        acceptance: [...t.acceptance(values)],
        code: t.code(values),
        url: termUrl(t.slug),
        markdownUrl: markdownUrl(t.slug),
      }
    }),
  }
}

const SKILL_LEAD =
  'Design engineering vocabulary with copy-ready prompts: turns a vague description of motion or interaction into its exact term and a prompt with acceptance criteria. Use when someone describes an effect loosely ("the header stays put while I scroll", "things fade in as they come into view"), asks what an effect is called, or wants a precise prompt for building one.'

/** One line, under the 1024-character limit skill loaders enforce. Term names are added while they fit. */
export function skillDescription(published: readonly FullTerm[]): string {
  const names = published.map((t) => t.name)
  for (let n = names.length; n > 0; n--) {
    const more = n < names.length ? ', and more' : ''
    const out = `${SKILL_LEAD} Terms: ${names.slice(0, n).join(', ')}${more}.`
    if (out.length <= SKILL_DESCRIPTION_LIMIT) return out
  }
  return SKILL_LEAD
}

const TOKEN_NOTES: Record<string, string> = {
  '--ease-out': 'entering, leaving, or responding to the user',
  '--ease-in-out': 'something already on screen moving from A to B',
  '--ease-drawer': 'sheets and drawers',
}

function renderSkillMain(terms: readonly Term[]): string {
  const published = publishedTerms(terms)
  const glossary = CATEGORIES.map((c) => ({ c, list: published.filter((t) => t.category === c.slug) }))
    .filter((s) => s.list.length > 0)
    .map(({ c, list }) => {
      const lines = list.map((t) => {
        const aka = t.aliases.length > 0 ? ` Also called: ${t.aliases.join(', ')}.` : ''
        return `- **${t.name}**: ${t.definition}${aka} Read \`terms/${t.slug}.md\`.`
      })
      return `### ${c.name}\n\n${lines.join('\n')}`
    })
  const tokens = Object.entries(TOKENS)
    .map(([name, value]) => `${name}: ${value};${TOKEN_NOTES[name] ? ` /* ${TOKEN_NOTES[name]} */` : ''}`)
    .join('\n')

  return `---
name: moveset
description: ${JSON.stringify(skillDescription(published))}
---

# moveset

${SUMMARY} This skill holds the published terms from ${SITE_URL}.

## How to use

1. When someone describes motion or interaction loosely, find the term in the glossary below. Match on what the effect does, not on the words used; aliases are the loose phrasings people actually say.
2. When a term matches, say its name so you both share the word, then read \`terms/<slug>.md\` next to this file. It has the full prompt at default values, the acceptance checklist, code for each approach that fits, accessibility notes, and the terms it is often confused with.
3. Build from that file. Keep its exact values (durations, curves, offsets, thresholds): they are decisions, not suggestions. Change one only when asked, and say which.
4. Check the result against every item in the acceptance checklist before calling it done.
5. When two terms are close, read both files and use the "Often confused with" section to pick. When nothing matches, say so rather than forcing the nearest term.

## Glossary

${glossary.join('\n\n')}

## House motion tokens

Every prompt assumes these values. Define them once in the project's CSS.

\`\`\`css
:root {
${tokens
  .split('\n')
  .map((l) => `  ${l}`)
  .join('\n')}
}
\`\`\`

- Springs default to \`{ type: "spring", duration: 0.5, bounce: 0 }\`. Bounce 0.1 to 0.3 only for playful or physical motion.
- UI motion stays under 300ms. Exits run about 25% faster than enters.
- Never \`ease-in\` on UI, never \`transition: all\`, never enter from \`scale(0)\`.
- Hover motion only under \`@media (hover: hover) and (pointer: fine)\`.
- Every motion snippet handles \`prefers-reduced-motion\`.
`
}

/** The skill folder as relative path → content: SKILL.md plus one reference file per published term. */
export function renderSkill(terms: readonly Term[]): Record<string, string> {
  const files: Record<string, string> = { 'SKILL.md': renderSkillMain(terms) }
  for (const t of publishedTerms(terms)) files[`terms/${t.slug}.md`] = renderTermMarkdown(t, terms)
  return files
}
