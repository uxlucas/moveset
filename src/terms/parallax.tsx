import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { GlyphSvg } from '@/components/site/glyph'
import { defineTerm, type GlyphProps } from '@/lib/term-types'

function ParallaxGlyph({ active }: GlyphProps) {
  return (
    <GlyphSvg kind="parallax" active={active} clipped>
      <rect className="m b" x="2.6" y="2.6" width="6.8" height="3.4" rx=".9" fill="currentColor" opacity=".35" />
      <rect className="m f" x="3" y="6.8" width="6" height="1.2" rx=".6" fill="currentColor" />
    </GlyphSvg>
  )
}

export default defineTerm({
  slug: 'parallax',
  name: 'Parallax',
  category: 'scroll',
  order: 3,
  status: 'draft',
  definition: 'Layers move at different speeds while you scroll, which makes the page feel like it has depth.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.', glyph: ParallaxGlyph },
})
