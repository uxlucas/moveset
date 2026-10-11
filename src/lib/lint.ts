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
