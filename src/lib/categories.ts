export const CATEGORIES = [
  { slug: 'scroll', name: 'Scroll', short: 'Scroll', hue: 250 },
  { slug: 'motion', name: 'Motion & Easing', short: 'Motion', hue: 35 },
  { slug: 'transitions', name: 'Transitions', short: 'Transitions', hue: 300 },
  { slug: 'gestures', name: 'Gestures', short: 'Gestures', hue: 150 },
  { slug: 'layout', name: 'Layout', short: 'Layout', hue: 195 },
  { slug: 'states', name: 'States & Feedback', short: 'States', hue: 75 },
  { slug: 'visual', name: 'Typography & Visual', short: 'Visual', hue: 350 },
] as const

export type Category = (typeof CATEGORIES)[number]
export type CategorySlug = Category['slug']

export function getCategory(slug: CategorySlug): Category {
  const category = CATEGORIES.find((c) => c.slug === slug)
  if (!category) throw new Error(`Unknown category "${slug}"`)
  return category
}

export function categoryColor(hue: number): string {
  return `oklch(0.64 0.16 ${hue})`
}
