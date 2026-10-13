'use client'

import { Check, Copy } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { copyText } from '@/lib/clipboard'
import { usePrefersReducedMotion } from './demo/use-reduced-motion'

type Props = {
  text: string | (() => string)
  /** accessible name; also the visible text when no children are given */
  label: string
  children?: ReactNode
  className?: string
}

export function CopyButton({ text, label, children, className = '' }: Props) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const reduce = usePrefersReducedMotion()
  useEffect(() => () => clearTimeout(timer.current), [])

  async function onClick() {
    const ok = await copyText(typeof text === 'function' ? text() : text)
    setState(ok ? 'copied' : 'failed')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), ok ? 1500 : 2500)
  }

  const copied = state === 'copied'
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={onClick} aria-label={children ? undefined : label} className={`press inline-flex items-center gap-1.5 ${className}`}>
        <span className="relative inline-flex size-4 items-center justify-center">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={copied ? 'check' : 'copy'}
              className="inline-flex"
              initial={{ scale: 0.3, opacity: 0, filter: 'blur(3px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              exit={{ scale: 0.3, opacity: 0, filter: 'blur(3px)' }}
              transition={reduce ? { duration: 0 } : { type: 'spring', duration: 0.35, bounce: 0 }}
            >
              {copied ? <Check size={14} aria-hidden data-icon="check" className="text-accent" /> : <Copy size={14} aria-hidden data-icon="copy" />}
            </motion.span>
          </AnimatePresence>
        </span>
        {children}
      </button>
      <span role="status" className={state === 'failed' ? 'text-xs text-ink-muted' : 'sr-only'}>
        {state === 'copied' ? 'Copied' : state === 'failed' ? "Couldn't copy" : ''}
      </span>
    </span>
  )
}
