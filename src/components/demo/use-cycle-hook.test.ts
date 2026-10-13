// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { useCycle, type Cycle } from './use-cycle'

type Props = { playing: boolean; replayKey: number; timeScale: number; restartKey: string }
const base: Props = { playing: true, replayKey: 0, timeScale: 1, restartKey: 'a' }

// Mounts a component that only calls useCycle, so the hook runs in real React effects.
async function mount(initial: Props) {
  const log: string[] = []
  const onCycleEnd = vi.fn()
  const plan = (): Cycle => ({
    steps: [
      [0, () => log.push('start')],
      [100, () => log.push('step')],
    ],
    endMs: 200,
    still: () => log.push('still'),
  })
  function Probe(p: Props) {
    useCycle(plan, { ...p, onCycleEnd }, p.restartKey)
    return null
  }
  const root = createRoot(document.createElement('div'))
  const render = (p: Props) => act(async () => root.render(createElement(Probe, p)))
  await render(initial)
  return { log, onCycleEnd, render, unmount: () => act(async () => root.unmount()) }
}

describe('useCycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  })
  afterEach(() => vi.useRealTimers())

  test('playing runs one cycle and ends once', async () => {
    const { log, onCycleEnd } = await mount(base)
    expect(log).toEqual(['start'])
    vi.advanceTimersByTime(100)
    expect(log).toEqual(['start', 'step'])
    vi.advanceTimersByTime(100)
    expect(onCycleEnd).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  test('not playing paints the still frame and schedules nothing', async () => {
    const { log, onCycleEnd } = await mount({ ...base, playing: false })
    expect(log).toEqual(['still'])
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(1000)
    expect(onCycleEnd).not.toHaveBeenCalled()
  })

  test('a replay mid-cycle restarts it, and the old cycle never ends', async () => {
    const { log, onCycleEnd, render } = await mount(base)
    vi.advanceTimersByTime(50)
    await render({ ...base, replayKey: 1 })
    expect(log).toEqual(['start', 'start'])
    vi.advanceTimersByTime(175) // past the old cycle's end (200), before the new one's (250)
    expect(onCycleEnd).not.toHaveBeenCalled()
    expect(log).toEqual(['start', 'start', 'step'])
    vi.advanceTimersByTime(25)
    expect(onCycleEnd).toHaveBeenCalledOnce()
  })

  test('a new restartKey or timeScale restarts the cycle', async () => {
    const { log, render } = await mount(base)
    await render({ ...base, restartKey: 'b' })
    await render({ ...base, restartKey: 'b', timeScale: 0.25 })
    expect(log).toEqual(['start', 'start', 'start'])
    vi.advanceTimersByTime(399)
    expect(log).not.toContain('step')
    vi.advanceTimersByTime(1)
    expect(log).toContain('step')
  })

  test('pausing mid-cycle paints the still frame and cancels the rest', async () => {
    const { log, onCycleEnd, render } = await mount(base)
    vi.advanceTimersByTime(50)
    await render({ ...base, playing: false })
    expect(log).toEqual(['start', 'still'])
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(1000)
    expect(onCycleEnd).not.toHaveBeenCalled()
  })

  test('unmounting mid-cycle leaves no timers behind', async () => {
    const { onCycleEnd, unmount } = await mount(base)
    vi.advanceTimersByTime(50)
    await unmount()
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(1000)
    expect(onCycleEnd).not.toHaveBeenCalled()
  })
})
