export const CATEGORIES = [
  { slug: 'scroll', name: 'Scroll', short: 'Scroll', hue: 245 },
  { slug: 'motion', name: 'Motion & Easing', short: 'Motion', hue: 190 },
  { slug: 'transitions', name: 'Transitions', short: 'Transitions', hue: 280 },
  { slug: 'gestures', name: 'Gestures', short: 'Gestures', hue: 160 },
  { slug: 'layout', name: 'Layout', short: 'Layout', hue: 215 },
  { slug: 'states', name: 'States & Feedback', short: 'States', hue: 170 },
  { slug: 'visual', name: 'Typography & Visual', short: 'Visual', hue: 300 },
] as const

export type Category = (typeof CATEGORIES)[number]
export type CategorySlug = Category['slug']

export function getCategory(slug: CategorySlug): Category {
  const category = CATEGORIES.find((c) => c.slug === slug)
  if (!category) throw new Error(`Unknown category "${slug}"`)
  return category
}

export function categoryColor(hue: number): string {
  return `oklch(var(--cat-l) 0.08 ${hue})`
}
