import { spring } from 'motion/react'
import { describe, expect, test } from 'vitest'
import { AMOUNTS, ENTER_MS, springPoints } from '@/terms/overshoot'

// The prompt promises each amount from both sources. These hold the hand-picked y1 and bounce values to the math.

/** The highest point of cubic-bezier(x1, y1, x2, 1), in percent past the end. The peak depends only on the y values. */
function bezierPeak(y1: number): number {
  let peak = 0
  for (let i = 0; i <= 10_000; i++) {
    const t = i / 10_000
    peak = Math.max(peak, 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t ** 2 + t ** 3)
  }
  return (peak - 1) * 100
}

describe('AMOUNTS', () => {
  for (const [amount, a] of Object.entries(AMOUNTS)) {
    test(`${amount}%: the back curve peaks at ${amount}% (±0.1)`, () => {
      // Amount 0 is the house ease-out, cubic-bezier(0.23, 1, 0.32, 1): y1 of 1 never passes the end.
      expect(Math.abs(bezierPeak(a.y1 ?? 1) - Number(amount))).toBeLessThan(0.1)
    })

    test(`${amount}%: bounce ${a.bounce} peaks at ${a.springPeak}%, within 1% of ${amount}%, and settles by ${ENTER_MS}ms`, () => {
      const gen = spring({ keyframes: [0, 1], duration: ENTER_MS, bounce: a.bounce })
      const values = Array.from({ length: ENTER_MS + 1 }, (_, t) => gen.next(t).value)
      const peak = (Math.max(...values) - 1) * 100
      expect(Math.abs(peak - a.springPeak)).toBeLessThan(0.05)
      expect(Math.abs(peak - Number(amount))).toBeLessThan(1)
      expect(Math.abs(values[ENTER_MS] - 1)).toBeLessThan(0.005)
    })

    test(`${amount}%: the sampled linear() keeps the spring's peak (±0.15) and ends on 1`, () => {
      const points = springPoints(amount as keyof typeof AMOUNTS).map(Number)
      expect(points[0]).toBe(0)
      expect(points.at(-1)).toBe(1)
      expect(Math.abs((Math.max(...points) - 1) * 100 - a.springPeak)).toBeLessThan(0.15)
    })
  }
})
