import { spring } from 'motion/react'
import { describe, expect, test } from 'vitest'
import { OVERSHOOT, PHYSICS } from '@/terms/spring'

// The demo, prompt and code use the physics form of each duration/bounce spring, so a redirect can carry velocity.
// These hold the hand-rounded table to Motion's own spring math.
const sample = (opts: Record<string, number>, ms: number) => {
  const gen = spring({ keyframes: [0, 1], ...opts })
  return Array.from({ length: Math.round(ms) + 1 }, (_, t) => gen.next(t).value)
}

describe('PHYSICS', () => {
  for (const [duration, bounces] of Object.entries(PHYSICS)) {
    for (const [bounce, p] of Object.entries(bounces)) {
      const ms = Number(duration) * 1000
      const timed = sample({ duration: ms, bounce: Number(bounce) }, ms)
      const physics = sample({ stiffness: p.stiffness, damping: p.damping, mass: 1 }, 3 * ms)

      test(`duration ${duration}, bounce ${bounce}: the physics form traces the duration/bounce spring`, () => {
        const worst = Math.max(...timed.map((v, t) => Math.abs(v - physics[t])))
        expect(worst).toBeLessThan(0.005)
      })

      test(`duration ${duration}, bounce ${bounce}: 40% of the way at ${p.at40}ms, overshoot ${OVERSHOOT[bounce as '0']}%`, () => {
        expect(physics[p.at40 - 2]).toBeLessThan(0.4)
        expect(physics[p.at40 + 2]).toBeGreaterThan(0.4)
        const peak = (Math.max(...physics) - 1) * 100
        if (bounce === '0') expect(peak).toBeLessThan(0.01)
        else expect(Math.abs(peak - OVERSHOOT[bounce as '0'])).toBeLessThan(0.3)
      })
    }
  }
})
