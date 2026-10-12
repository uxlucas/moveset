/** How long a looping card demo holds its end state before replaying. */
export const HOLD_MS = 1200

export function isPlaying(s: { inView: boolean; pageVisible: boolean; reducedMotion: boolean; requested: boolean }): boolean {
  return s.inView && s.pageVisible && (!s.reducedMotion || s.requested)
}

export function scaled(ms: number, timeScale: number): number {
  return ms / Math.max(timeScale, 0.01)
}
