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
