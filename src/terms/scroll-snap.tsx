import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { GlyphSvg } from '@/components/site/glyph'
import { defineTerm, type GlyphProps } from '@/lib/term-types'

function ScrollSnapGlyph({ active }: GlyphProps) {
  return (
    <GlyphSvg kind="scroll-snap" active={active} clipped>
      <g className="m">
        <rect x="2.6" y="2.6" width="6.8" height="6.8" rx="1.2" fill="currentColor" opacity=".9" />
        <rect x="2.6" y="10.6" width="6.8" height="6.8" rx="1.2" fill="currentColor" opacity=".45" />
      </g>
    </GlyphSvg>
  )
}

export default defineTerm({
  slug: 'scroll-snap',
  name: 'Scroll Snap',
  category: 'scroll',
  order: 5,
  status: 'draft',
  definition: 'Scrolling comes to rest exactly on an item instead of stopping anywhere in between.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.', glyph: ScrollSnapGlyph },
})
