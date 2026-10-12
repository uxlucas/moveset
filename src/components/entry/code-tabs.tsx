'use client'

import { useState, type KeyboardEvent } from 'react'
import { CopyButton } from '@/components/copy-button'
import { CODE_APPROACHES } from '@/lib/prompt'
import type { CodeRef } from '@/lib/term-types'

export function CodeTabs({ code }: { code: CodeRef }) {
  const available = CODE_APPROACHES.filter((a) => code[a.key])
  const [active, setActive] = useState(available[0]?.key)
  const current = available.find((a) => a.key === active) ?? available[0]
  if (!current) return null
  const src = code[current.key] ?? ''

  function onKeyDown(e: KeyboardEvent, i: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + available.length) % available.length
    setActive(available[n].key)
    document.getElementById(`tab-${available[n].key}`)?.focus()
  }

  return (
    <div className="mt-3 rounded-2xl bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-line px-2">
        <div role="tablist" aria-label="Code approach" className="flex">
          {available.map((a, i) => {
            const selected = a.key === current.key
            return (
              <button
                key={a.key}
                id={`tab-${a.key}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`panel-${a.key}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(a.key)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={`hit px-3 py-2.5 text-sm ${selected ? 'text-ink shadow-[inset_0_-1px_0_var(--ink)]' : 'text-ink-muted hover:text-ink'}`}
              >
                {a.label}
              </button>
            )
          })}
        </div>
        <CopyButton text={src} label={`Copy ${current.label} code`} className="hit size-8 justify-center rounded-lg text-ink-muted hover:text-ink" />
      </div>
      {/* Every panel is in the server HTML so agents and no-JS readers get all approaches. Tailwind's
          preflight hides [hidden] with !important inside @layer base; an important rule only beats it
          from an earlier layer, hence @layer theme. */}
      <noscript>
        <style>{'@layer theme{[role=tabpanel][hidden]{display:block!important}}'}</style>
      </noscript>
      {available.map((a) => (
        <pre
          key={a.key}
          id={`panel-${a.key}`}
          role="tabpanel"
          aria-labelledby={`tab-${a.key}`}
          hidden={a.key !== current.key}
          tabIndex={0}
          className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-ink"
        >
          <code>{code[a.key]}</code>
        </pre>
      ))}
    </div>
  )
}
