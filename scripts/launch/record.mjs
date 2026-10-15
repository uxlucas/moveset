// Records /launch frame by frame: the page's clock is stepped 1/60s at a time, every CSS animation and transition is
// paused and placed at the same virtual time, and a screenshot is taken per frame. Deterministic, no dropped frames.
// Needs the dev server on :3100 (NEXT_PUBLIC_SHOW_REVIEW=1, as .env.development sets). Then:
//   node scripts/launch/record.mjs out/frames 15 60
//   ffmpeg -framerate 60 -i out/frames/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 17 -movflags +faststart launch.mp4
import { chromium } from '@playwright/test'
import { mkdirSync, rmSync } from 'node:fs'

const out = process.argv[2]
const SECONDS = Number(process.argv[3] ?? 15)
const FPS = Number(process.argv[4] ?? 60)
const DT = 1000 / FPS
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH })
const ctx = await browser.newContext({ viewport: { width: 540, height: 540 }, deviceScaleFactor: 2, colorScheme: 'light' })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

await page.clock.install()
await page.goto('http://localhost:3100/launch')
await page.waitForFunction(() => document.fonts.status === 'loaded' && typeof window.__launchStart === 'function')
await page.waitForTimeout(800)
// Freeze time, then start the story: from here every timer, rAF and performance.now() moves only with runFor.
await page.clock.pauseAt(Date.now() + 2000)
await page.evaluate(() => window.__launchStart())

// Every animation the document is running, placed at the virtual time it has had since it was first seen.
const step = (vnow) => {
  const seen = (window.__seen ??= new Map())
  for (const a of document.getAnimations()) {
    if (!seen.has(a)) {
      seen.set(a, vnow)
      a.pause()
    }
    const t = vnow - seen.get(a)
    const end = a.effect.getComputedTiming().endTime
    if (Number.isFinite(end) && t >= end) {
      if (a.playState !== 'finished') a.finish()
    } else {
      a.currentTime = t
    }
  }
}

const total = Math.round(SECONDS * FPS)
const t0 = Date.now()
// The clock steps whole milliseconds, so a frame is 16 or 17 ms, whichever keeps the running total exact.
for (let f = 0; f < total; f++) {
  const vnow = Math.round(f * DT)
  await page.evaluate(step, vnow)
  await page.screenshot({ path: `${out}/f${String(f).padStart(4, '0')}.png`, animations: 'allow', caret: 'hide' })
  await page.clock.runFor(Math.round((f + 1) * DT) - vnow)
  if (f % 120 === 0) console.log(`frame ${f}/${total} (${((Date.now() - t0) / 1000).toFixed(0)}s)`)
}
await browser.close()
if (errors.length) console.log('ERRORS', errors)
console.log('done', total, 'frames')
