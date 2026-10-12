'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

const ORDER = ['system', 'light', 'dark'] as const
type Mode = (typeof ORDER)[number]
const LABEL: Record<Mode, string> = { system: 'System', light: 'Light', dark: 'Dark' }

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const current: Mode = mounted && ORDER.includes(theme as Mode) ? (theme as Mode) : 'system'
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${LABEL[current]}. Switch to ${LABEL[next]}.`}
      className="press inline-grid min-h-11 items-center rounded-md px-3 text-sm text-ink-muted hover:text-ink pointer-fine:min-h-0 pointer-fine:py-1.5"
    >
      {/* All labels share one grid cell, so the button keeps the width of the longest label. */}
      {ORDER.map((mode) => (
        <span key={mode} aria-hidden className={`[grid-area:1/1] ${mounted && mode === current ? '' : 'invisible'}`}>
          {LABEL[mode]}
        </span>
      ))}
    </button>
  )
}
