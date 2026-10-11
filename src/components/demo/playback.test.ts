import { describe, expect, test } from 'vitest'
import { isPlaying, scaled } from './playback'

describe('isPlaying', () => {
  const base = { inView: true, pageVisible: true, reducedMotion: false, requested: false }
  test('plays when visible on screen', () => expect(isPlaying(base)).toBe(true))
  test('pauses off screen', () => expect(isPlaying({ ...base, inView: false })).toBe(false))
  test('pauses when the tab is hidden', () => expect(isPlaying({ ...base, pageVisible: false })).toBe(false))
  test('reduced motion waits for an explicit play', () => {
    expect(isPlaying({ ...base, reducedMotion: true })).toBe(false)
    expect(isPlaying({ ...base, reducedMotion: true, requested: true })).toBe(true)
  })
  test('an explicit play still pauses off screen', () => {
    expect(isPlaying({ ...base, reducedMotion: true, requested: true, inView: false })).toBe(false)
  })
})

describe('scaled', () => {
  test('slow motion stretches durations', () => expect(scaled(300, 0.25)).toBe(1200))
  test('never divides by zero', () => expect(Number.isFinite(scaled(300, 0))).toBe(true))
})
