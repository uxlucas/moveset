import { afterEach, expect, test, vi } from 'vitest'
import { getSnapshot, setCurrent, subscribe } from './spy-store'

afterEach(() => setCurrent(null))

test('notifies subscribers when the current card changes, and only then', () => {
  const listener = vi.fn()
  const unsubscribe = subscribe(listener)
  setCurrent('sticky')
  setCurrent('sticky')
  expect(getSnapshot()).toBe('sticky')
  expect(listener).toHaveBeenCalledTimes(1)
  unsubscribe()
  setCurrent(null)
  expect(listener).toHaveBeenCalledTimes(1)
  expect(getSnapshot()).toBeNull()
})
