import { useId, type ReactNode } from 'react'
import type { GlyphProps } from '@/lib/term-types'

// 12px wireframe glyphs for the sidebar. The moving part carries class `m`; globals.css animates it
// only while the svg has data-active="true", and never under reduced motion.

export function GlyphFrame({ dashed = false }: { dashed?: boolean }) {
  return (
    <rect
      x=".6" y=".6" width="10.8" height="10.8" rx="2.6"
      fill="none" stroke="currentColor" strokeWidth="1"
      strokeDasharray={dashed ? '2 1.7' : undefined}
      opacity={dashed ? 0.8 : 0.6}
    />
  )
}

type GlyphSvgProps = {
  /** names the glyph for CSS and tests: the term slug, or index / generic / soon */
  kind: string
  active?: boolean
  /** clip the children to the inside of the frame, for parts that slide out of view */
  clipped?: boolean
  dashed?: boolean
  children?: ReactNode
}

export function GlyphSvg({ kind, active = false, clipped = false, dashed = false, children }: GlyphSvgProps) {
  // Each instance needs its own clip id, or two copies of a glyph would share (and fight over) one.
  const clipId = useId()
  return (
    <svg
      width={12} height={12} viewBox="0 0 12 12" aria-hidden
      className="gl" data-glyph={kind} data-active={String(active)}
    >
      {clipped && (
        <clipPath id={clipId}>
          <rect x="1.2" y="1.2" width="9.6" height="9.6" rx="2" />
        </clipPath>
      )}
      <GlyphFrame dashed={dashed} />
      {clipped ? <g clipPath={`url(#${clipId})`}>{children}</g> : children}
    </svg>
  )
}

export function IndexGlyph({ active }: GlyphProps) {
  return (
    <GlyphSvg kind="index" active={active}>
      <rect x="3" y="3.2" width="6" height="1.1" rx=".55" fill="currentColor" />
      <rect x="3" y="5.5" width="4.5" height="1.1" rx=".55" fill="currentColor" opacity=".6" />
      <rect x="3" y="7.8" width="5.5" height="1.1" rx=".55" fill="currentColor" opacity=".6" />
    </GlyphSvg>
  )
}

/** For written terms that don't have their own glyph yet. Never moves. */
export function GenericGlyph({ active }: GlyphProps) {
  return (
    <GlyphSvg kind="generic" active={active}>
      <rect x="3" y="3.5" width="6" height="1" rx=".5" fill="currentColor" opacity=".5" />
      <rect x="3" y="5.5" width="6" height="1" rx=".5" fill="currentColor" opacity=".5" />
      <rect x="3" y="7.5" width="3.5" height="1" rx=".5" fill="currentColor" opacity=".5" />
    </GlyphSvg>
  )
}

/** Drafts: an empty dashed frame. */
export function SoonGlyph() {
  return <GlyphSvg kind="soon" dashed />
}
