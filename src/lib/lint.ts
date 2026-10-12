import { defaultValues } from './content'
import type { Control, ControlValue, Term, Values } from './term-types'

export type LintIssue = { slug: string; rule: string; message: string }
export type Review = { slug: string; verdict?: string; approved: boolean }
export type LintConfig = { allowLayoutProps: readonly string[]; allowEaseIn: readonly string[] }

export const BLOCKED_WORDS = [
  'seamless', 'seamlessly', 'leverage', 'delve', 'robust', 'elevate',
  'effortless', 'effortlessly', 'cutting-edge', 'unlock', 'game-changer',
]
const MAX_DEFINITION = 140

const EASE_IN = /\bease-in\b(?!-out)|\beaseIn\b/
// `all` as a standalone token anywhere in a transition value, quoted or not; not `small`.
const TRANSITION_ALL = /transition(?:-property)?\s*:[^;{}]*(?<![\w-])all(?![\w-])|\btransition-all\b/
// scale, scaleZ and scale3d whose first argument is exactly 0, plus Motion's `scale: 0`.
// scaleX(0) and scaleY(0) are allowed: growing a bar from nothing is not an entrance.
const SCALE_ZERO = /\bscale(?:Z|3d)?\(\s*0(?![.\d])|\bscale\s*:\s*0(?![.\d])/
const LAYOUT_NAMES = '(?:width|height|top|left|right|bottom|margin[A-Za-z]*|padding[A-Za-z]*|minWidth|maxWidth|minHeight|maxHeight)'
const LAYOUT_TRANSITION = /transition(?:-property)?\s*:[^;{}]*\b(?:width|height|top|left|right|bottom|margin|padding)\b/
// Object keys in js, motion and gsap snippets: `height: 0`, `maxHeight: 10`, `'margin-left': 4`.
const LAYOUT_KEY = new RegExp(`(?<![\\w-])["']?${LAYOUT_NAMES}["']?\\s*:`)
// Declarations inside @keyframes bodies: `top: 0`, `margin-left: 4px`.
const LAYOUT_DECL = /(?<![\w-])(?:width|height|top|left|right|bottom|margin(?:-[a-z]+)?|padding(?:-[a-z]+)?|min-width|max-width|min-height|max-height)\s*:/
const HAS_MOTION =
  /\btransition\b|\banimation\b|@keyframes|\banimate\(|\bmotion\.[a-zA-Z]|\buseSpring\b|\buseAnimate\b|\bgsap\.|scroll-behavior\s*:\s*smooth|\banimate-(?:spin|pulse|bounce|ping|\[)/
const REDUCED = /prefers-reduced-motion|useReducedMotion|<MotionConfig\b[^>]*\breducedMotion\b/

function keyframeBodies(src: string): string[] {
  const bodies: string[] = []
  for (const m of src.matchAll(/@keyframes\s+[\w-]+\s*\{/g)) {
    let depth = 1
    let i = m.index + m[0].length
    const start = i
    for (; i < src.length && depth > 0; i++) {
      if (src[i] === '{') depth++
      else if (src[i] === '}') depth--
    }
    bodies.push(src.slice(start, i))
  }
  return bodies
}

function animatesLayout(approach: string, src: string): boolean {
  if (LAYOUT_TRANSITION.test(src)) return true
  if (keyframeBodies(src).some((body) => LAYOUT_DECL.test(body))) return true
  return approach !== 'css' && LAYOUT_KEY.test(src)
}

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

const MAX_COMBINATIONS = 64

function candidateValues(control: Control): ControlValue[] {
  if (control.type === 'toggle') return [true, false]
  if (control.type === 'select') return control.options.map((o) => o.value)
  return [...new Set([control.min, control.default, control.max])]
}

/** Every combination of control values worth linting: all toggle states, select options and range min/default/max, defaults first, capped at 64. */
export function controlCombinations(controls: readonly Control[] = []): Values[] {
  const defaults = defaultValues(controls)
  const out: Values[] = [defaults]
  const candidates = controls.map(candidateValues)
  const pick = new Array<number>(controls.length).fill(0)
  const isDefaults = (v: Values) => controls.every((c) => v[c.id] === defaults[c.id])
  while (out.length < MAX_COMBINATIONS) {
    const combo: Values = Object.fromEntries(controls.map((c, i) => [c.id, candidates[i][pick[i]]]))
    if (!isDefaults(combo)) out.push(combo)
    let i = controls.length - 1
    while (i >= 0 && ++pick[i] === candidates[i].length) pick[i--] = 0
    if (i < 0) break
  }
  return out
}

function proseOf(term: Term, v: Values): string[] {
  const prose = [term.name, term.definition, ...(term.aliases ?? []), ...(term.confusedWith ?? []).map((c) => c.difference)]
  if (term.status !== 'draft') {
    prose.push(term.description, ...term.useWhen, ...term.avoidWhen, term.a11y, term.prompt(v), ...term.acceptance(v))
  }
  return prose
}

export function lintTerms(terms: readonly Term[], reviews: readonly Review[], config: LintConfig): LintIssue[] {
  const issues: LintIssue[] = []
  const seenIssues = new Set<string>()
  const add = (slug: string, rule: string, message: string) => {
    const key = [slug, rule, message].join('|')
    if (seenIssues.has(key)) return
    seenIssues.add(key)
    issues.push({ slug, rule, message })
  }
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

    const combinations = term.status === 'draft' ? [{}] : controlCombinations(term.demo.controls)
    for (const v of combinations) {
      const prose = proseOf(term, v).join(' ')
      for (const word of BLOCKED_WORDS) {
        if (new RegExp(`\\b${word}\\b`, 'i').test(prose)) add(slug, 'blocked-word', `Remove "${word}".`)
      }
    }

    if (term.status !== 'draft') {
      for (const v of combinations) for (const [approach, src] of Object.entries(term.code(v))) {
        if (!src) continue
        if (!config.allowEaseIn.includes(slug) && EASE_IN.test(src)) add(slug, 'code-ease-in', `${approach}: don't use ease-in on UI.`)
        if (TRANSITION_ALL.test(src)) add(slug, 'code-transition-all', `${approach}: name the transitioned properties.`)
        if (SCALE_ZERO.test(src)) add(slug, 'code-scale-zero', `${approach}: start from scale(0.95), not 0.`)
        if (!config.allowLayoutProps.includes(slug) && animatesLayout(approach, src)) {
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
