import { spring } from 'motion/react'
import { describe, expect, test } from 'vitest'
import { BACK_SPRING, decide, DISTANCE, EXIT_SPRING, MIN_SPAN_MS, VELOCITY, velocityOf, WINDOW_MS, type Sample } from '@/terms/swipe-to-dismiss'

const WIDTH = 300

describe('velocityOf', () => {
  test('is Δx / Δt over the samples inside the window, in px/ms', () => {
    const samples: Sample[] = [
      { t: 0, x: 0 },
      { t: 50, x: 10 },
      { t: 100, x: 25 },
    ]
    expect(velocityOf(samples, 100)).toBeCloseTo(0.25, 6)
  })

  test('ignores samples older than the window: a drag that stopped before the release has no velocity', () => {
    const samples: Sample[] = [
      { t: 0, x: 0 },
      { t: 40, x: 60 },
      { t: 80, x: 90 },
    ]
    // Released 200ms after the last move: nothing inside the last WINDOW_MS, so the speed is 0.
    expect(velocityOf(samples, 80 + WINDOW_MS + 100)).toBe(0)
    // Released 60ms after the last move: the first sample has aged out and the slope is read from the last two.
    expect(velocityOf(samples, 40 + WINDOW_MS)).toBeCloseTo(30 / 40, 6)
  })

  test('is 0 with fewer than two samples or no time between them', () => {
    expect(velocityOf([], 0)).toBe(0)
    expect(velocityOf([{ t: 10, x: 5 }], 10)).toBe(0)
    expect(velocityOf([{ t: 10, x: 5 }, { t: 10, x: 9 }], 10)).toBe(0)
  })

  test('is 0 when the samples span less than MIN_SPAN_MS: bunched events cannot read as a 100px/ms flick', () => {
    // Three events delivered in a burst, 1ms apart, 60px in all: no velocity, not 30px/ms.
    expect(velocityOf([{ t: 100, x: 0 }, { t: 101, x: 30 }, { t: 102, x: 60 }], 102)).toBe(0)
    // Spaced out to the minimum span, the same movement reads as its slope.
    expect(velocityOf([{ t: 100, x: 0 }, { t: 100 + MIN_SPAN_MS, x: 8 }], 100 + MIN_SPAN_MS)).toBeCloseTo(1, 6)
  })

  test('is signed with the direction of travel', () => {
    expect(velocityOf([{ t: 0, x: 40 }, { t: 20, x: 20 }], 20)).toBeCloseTo(-1, 6)
  })
})

describe('decide', () => {
  test('past a third of the width it leaves toward the sign of x, whatever the speed', () => {
    const third = WIDTH * DISTANCE
    expect(decide(third, 0, WIDTH, 'both')).toBe(1)
    expect(decide(-third, 0, WIDTH, 'both')).toBe(-1)
    expect(decide(third, 0, WIDTH, 'distance')).toBe(1)
    expect(decide(third - 1, 0, WIDTH, 'both')).toBe(0)
  })

  test('a flick at the velocity threshold in the direction of the drag leaves, with distance or velocity', () => {
    expect(decide(WIDTH / 5, VELOCITY, WIDTH, 'both')).toBe(1)
    expect(decide(-WIDTH / 5, -VELOCITY, WIDTH, 'both')).toBe(-1)
    expect(decide(WIDTH / 5, VELOCITY * 0.9, WIDTH, 'both')).toBe(0)
  })

  test('the same flick goes back with distance only', () => {
    expect(decide(WIDTH / 5, VELOCITY * 3, WIDTH, 'distance')).toBe(0)
  })

  test('a fast move back toward rest does not count as a flick', () => {
    expect(decide(WIDTH / 5, -VELOCITY * 3, WIDTH, 'both')).toBe(0)
  })
})

// The exit and the way back ship in physics form so the release velocity carries (Motion 14 drops it on
// duration/bounce springs). These hold the hand-rounded numbers to Motion's own conversion of the named springs.
const sample = (opts: Record<string, number>, ms: number) => {
  const gen = spring({ keyframes: [0, 1], ...opts })
  return Array.from({ length: Math.round(ms) + 1 }, (_, t) => gen.next(t).value)
}

describe('springs', () => {
  for (const { name, physics, duration } of [
    { name: 'exit', physics: EXIT_SPRING, duration: 0.3 },
    { name: 'back', physics: BACK_SPRING, duration: 0.5 },
  ]) {
    test(`${name}: the physics form traces { duration: ${duration}, bounce: 0 }`, () => {
      const ms = duration * 1000
      const timed = sample({ duration: ms, bounce: 0 }, ms)
      const traced = sample(physics, ms)
      const worst = Math.max(...timed.map((v, t) => Math.abs(v - traced[t])))
      expect(worst).toBeLessThan(0.005)
      // Bounce 0: never past the target.
      expect(Math.max(...traced)).toBeLessThanOrEqual(1.0001)
    })
  }
})
