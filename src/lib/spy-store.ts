import { useSyncExternalStore } from 'react'

// The index card the reader is looking at, shared between the index (which measures it)
// and the sidebar (which highlights it). null means none: the sidebar marks "Index" instead.

let current: string | null = null
const listeners = new Set<() => void>()

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getSnapshot(): string | null {
  return current
}

export function setCurrent(slug: string | null): void {
  if (slug === current) return
  current = slug
  for (const listener of listeners) listener()
}

const getServerSnapshot = () => null

export function useSpy(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
