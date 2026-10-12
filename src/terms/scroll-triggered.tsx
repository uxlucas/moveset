import { PlaceholderDemo } from '@/components/demo/placeholder-demo'
import { GlyphSvg } from '@/components/site/glyph'
import { defineTerm, type GlyphProps } from '@/lib/term-types'

function ScrollTriggeredGlyph({ active }: GlyphProps) {
  return (
    <GlyphSvg kind="scroll-triggered" active={active}>
      <rect x="3" y="3" width="6" height="1.3" rx=".65" fill="currentColor" opacity=".5" />
      <rect className="m" x="3" y="5.6" width="6" height="3.2" rx="1" fill="currentColor" />
    </GlyphSvg>
  )
}

export default defineTerm({
  slug: 'scroll-triggered',
  name: 'Scroll-triggered',
  category: 'scroll',
  order: 1,
  status: 'draft',
  definition: 'An animation that plays once when an element scrolls into view.',
  demo: { component: PlaceholderDemo, label: 'Placeholder until the demo is built.', glyph: ScrollTriggeredGlyph },
})
