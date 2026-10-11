'use client'

import { RotateCcw } from 'lucide-react'
import type { Control, ControlValue, Values } from '@/lib/term-types'

type Props = {
  controls: readonly Control[]
  values: Values
  onChange: (id: string, value: ControlValue) => void
  onReplay: () => void
}

export function DemoControls({ controls, values, onChange, onReplay }: Props) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
      <button
        type="button"
        onClick={onReplay}
        className="press inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface px-3 text-ink shadow-card hover:shadow-card-hover"
      >
        <RotateCcw size={14} aria-hidden />
        Replay
      </button>
      {controls.map((c) => (
        <ControlField key={c.id} control={c} value={values[c.id]} onChange={(v) => onChange(c.id, v)} />
      ))}
    </div>
  )
}

function ControlField({ control, value, onChange }: { control: Control; value: ControlValue; onChange: (v: ControlValue) => void }) {
  const id = `control-${control.id}`

  if (control.type === 'range') {
    return (
      <div className="flex items-center gap-3">
        <label htmlFor={id} className="text-ink-muted">{control.label}</label>
        <input
          id={id}
          type="range"
          min={control.min}
          max={control.max}
          step={control.step}
          value={Number(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-28 accent-[var(--ink)]"
        />
        <output htmlFor={id} className="w-12 tabular-nums text-ink">{`${value}${control.unit ?? ''}`}</output>
      </div>
    )
  }

  if (control.type === 'toggle') {
    return (
      <div className="flex items-center gap-3">
        <span id={`${id}-label`} className="text-ink-muted">{control.label}</span>
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={Boolean(value)}
          aria-labelledby={`${id}-label`}
          onClick={() => onChange(!value)}
          className={`relative h-5 w-9 rounded-full transition-colors duration-150 ease-[ease] ${value ? 'bg-ink' : 'bg-demo-2'}`}
        >
          <span
            aria-hidden
            className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-surface transition-transform duration-150 ease-out ${value ? 'translate-x-4' : ''}`}
          />
        </button>
      </div>
    )
  }

  return (
    <div role="group" aria-label={control.label} className="flex items-center gap-3">
      <span aria-hidden className="text-ink-muted">{control.label}</span>
      <div className="flex rounded-full bg-surface p-0.5 shadow-card">
        {control.options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-full px-2.5 py-1 transition-colors duration-150 ease-[ease] ${value === o.value ? 'bg-ink text-canvas' : 'text-ink-muted hover:text-ink'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
