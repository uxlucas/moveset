import type { ComponentType } from 'react'
import type { TermSlug } from '@/generated/slugs'
import type { CategorySlug } from './categories'
import type { TermStatus } from './term-data'

export type { TermStatus }

export type RangeControl = {
  readonly id: string
  readonly type: 'range'
  readonly label: string
  readonly min: number
  readonly max: number
  readonly step: number
  readonly unit?: string
  readonly default: number
}
export type SelectOption = { readonly value: string; readonly label: string }
export type SelectControl = {
  readonly id: string
  readonly type: 'select'
  readonly label: string
  readonly options: readonly SelectOption[]
  readonly default: string
}
export type ToggleControl = {
  readonly id: string
  readonly type: 'toggle'
  readonly label: string
  readonly default: boolean
}
export type Control = RangeControl | SelectControl | ToggleControl

export type ControlValue = number | string | boolean
export type Values = Record<string, ControlValue>

type ValueOf<K> = K extends { type: 'range' }
  ? number
  : K extends { type: 'toggle' }
    ? boolean
    : K extends { type: 'select'; options: readonly (infer O)[] }
      ? O extends { value: infer V }
        ? V
        : never
      : never

export type ControlValues<C extends readonly Control[]> = {
  [K in C[number] as K['id']]: ValueOf<K>
}

export type DemoProps<V = Values> = {
  values: V
  /** false when off-screen, tab hidden, or reduced motion before the visitor presses play */
  playing: boolean
  /** changes on replay; run one cycle from the start */
  replayKey: number
  size: 'card' | 'detail'
  /** 1 normally, 0.25 in slow motion; divide durations by it */
  timeScale: number
  /** call when one cycle finishes; the runtime decides whether to loop */
  onCycleEnd: () => void
}

export type CodeRef = { css?: string; js?: string; motion?: string; gsap?: string }
export type Source = { readonly label: string; readonly url: string }

type Base<C extends readonly Control[]> = {
  slug: string
  name: string
  category: CategorySlug
  order: number
  definition: string
  demo: {
    component: ComponentType<DemoProps<ControlValues<C>>>
    /** what the demo shows, for screen readers and agents */
    label: string
    controls?: C
  }
  aliases?: readonly string[]
  confusedWith?: readonly { slug: TermSlug; difference: string }[]
  sources?: readonly Source[]
}

type Full<C extends readonly Control[]> = {
  aliases: readonly string[]
  description: string
  useWhen: readonly string[]
  avoidWhen: readonly string[]
  prompt: (v: ControlValues<C>) => string
  acceptance: (v: ControlValues<C>) => readonly string[]
  code: (v: ControlValues<C>) => CodeRef
  a11y: string
  related: readonly TermSlug[]
}

export type TermInput<C extends readonly Control[]> =
  | (Base<C> & { status: 'draft' })
  | (Base<C> & Full<C> & { status: 'review' | 'published' })

/** The erased shape every term has once defined. */
export type Term = TermInput<readonly Control[]>
export type FullTerm = Extract<Term, { status: 'review' | 'published' }>

export function defineTerm<const C extends readonly Control[] = readonly []>(term: TermInput<C>): Term {
  return term as unknown as Term
}

export function isFull(term: Term): term is FullTerm {
  return term.status !== 'draft'
}
