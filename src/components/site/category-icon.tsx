import { ArrowDownUp, Hand, Layers, LayoutGrid, LoaderCircle, Spline, Type, type LucideIcon } from 'lucide-react'
import { categoryColor, getCategory, type CategorySlug } from '@/lib/categories'

const ICONS: Record<CategorySlug, LucideIcon> = {
  scroll: ArrowDownUp,
  motion: Spline,
  transitions: Layers,
  gestures: Hand,
  layout: LayoutGrid,
  states: LoaderCircle,
  visual: Type,
}

export function CategoryIcon({ slug, className }: { slug: CategorySlug; className?: string }) {
  const Icon = ICONS[slug]
  return (
    <Icon
      aria-hidden
      size={14}
      strokeWidth={1.75}
      className={className}
      style={{ color: categoryColor(getCategory(slug).hue) }}
    />
  )
}
