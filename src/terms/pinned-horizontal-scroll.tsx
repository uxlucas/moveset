import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { GlyphSvg } from '@/components/site/glyph'
import { defineTerm, type GlyphProps } from '@/lib/term-types'

function PinnedHorizontalScrollGlyph({ active }: GlyphProps) {
  return (
    <GlyphSvg kind="pinned-horizontal-scroll" active={active} clipped>
      <g className="m">
        {[1.6, 5.6, 9.6, 13.6].map((x, i) => (
          <rect key={x} x={x} y="2.8" width="3" height="4" rx=".7" fill="currentColor" opacity={i % 2 ? 0.45 : 0.9} />
        ))}
      </g>
      <rect x="3" y="8.4" width="6" height="1" rx=".5" fill="currentColor" opacity=".5" />
    </GlyphSvg>
  )
}

export default defineTerm({
  slug: 'pinned-horizontal-scroll',
  name: 'Pinned Horizontal Scroll',
  category: 'scroll',
  order: 6,
  status: 'draft',
  definition: 'A section pins in place while vertical scrolling moves its content sideways.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.', glyph: PinnedHorizontalScrollGlyph },
})
