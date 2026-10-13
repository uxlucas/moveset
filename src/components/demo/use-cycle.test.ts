import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { runCycle } from './use-cycle'

describe('runCycle', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  test('runs each step at its time, then ends', () => {
    const log: string[] = []
    runCycle(
      [
        [100, () => log.push('a')],
        [300, () => log.push('b')],
      ],
      500,
      1,
      () => log.push('end'),
    )
    vi.advanceTimersByTime(99)
    expect(log).toEqual([])
    vi.advanceTimersByTime(1)
    expect(log).toEqual(['a'])
    vi.advanceTimersByTime(400)
    expect(log).toEqual(['a', 'b', 'end'])
  })

  test('a step at 0 runs right away', () => {
    const first = vi.fn()
    runCycle([[0, first]], 100, 1, () => {})
    expect(first).toHaveBeenCalledOnce()
  })

  test('slow motion stretches the timeline', () => {
    const step = vi.fn()
    const end = vi.fn()
    runCycle([[100, step]], 200, 0.25, end)
    vi.advanceTimersByTime(399)
    expect(step).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(step).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(400)
    expect(end).toHaveBeenCalledOnce()
  })

  test('cancelling stops the steps and the end that have not run', () => {
    const step = vi.fn()
    const end = vi.fn()
    const cancel = runCycle([[100, step]], 200, 1, end)
    vi.advanceTimersByTime(50)
    cancel()
    vi.advanceTimersByTime(1000)
    expect(step).not.toHaveBeenCalled()
    expect(end).not.toHaveBeenCalled()
  })
})
