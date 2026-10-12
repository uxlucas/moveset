import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { GlyphSvg } from '@/components/site/glyph'
import { defineTerm, type GlyphProps } from '@/lib/term-types'

function ScrollLinkedGlyph({ active }: GlyphProps) {
  return (
    <GlyphSvg kind="scroll-linked" active={active}>
      <rect className="m" x="1.6" y="1.7" width="8.8" height="1.3" rx=".65" fill="currentColor" />
      <rect x="3" y="5" width="6" height="1" rx=".5" fill="currentColor" opacity=".5" />
      <rect x="3" y="7.4" width="4.4" height="1" rx=".5" fill="currentColor" opacity=".5" />
    </GlyphSvg>
  )
}

export default defineTerm({
  slug: 'scroll-linked',
  name: 'Scroll-linked',
  category: 'scroll',
  order: 2,
  status: 'draft',
  definition: 'An animation whose progress is tied directly to the scroll position, moving forward and backward as you scroll.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.', glyph: ScrollLinkedGlyph },
})
