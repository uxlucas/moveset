export const CATEGORIES = [
  { slug: 'scroll', name: 'Scroll', short: 'Scroll', hue: 245, line: 'Motion that scrolling drives or triggers.' },
  { slug: 'motion', name: 'Motion & Easing', short: 'Motion', hue: 190, line: 'How fast, how it accelerates, how it settles.' },
  { slug: 'transitions', name: 'Transitions', short: 'Transitions', hue: 280, line: 'Getting from one state to the next without a cut.' },
  { slug: 'gestures', name: 'Gestures', short: 'Gestures', hue: 160, line: 'What the interface does while your finger or cursor is on it.' },
  { slug: 'layout', name: 'Layout', short: 'Layout', hue: 215, line: 'Keeping things steady, aligned, and easy to hit.' },
  { slug: 'states', name: 'States & Feedback', short: 'States', hue: 170, line: 'Loading, empty, done, wrong, and saying so.' },
  { slug: 'visual', name: 'Typography & Visual', short: 'Visual', hue: 300, line: 'The finish: type, shadow, shape, texture.' },
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
