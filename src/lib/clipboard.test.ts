import { afterEach, describe, expect, test, vi } from 'vitest'
import { copyText } from './clipboard'

afterEach(() => vi.unstubAllGlobals())

describe('copyText', () => {
  test('returns true when the clipboard accepts the text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    expect(await copyText('hi')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('hi')
  })
  test('returns false when there is no clipboard API', async () => {
    vi.stubGlobal('navigator', {})
    expect(await copyText('hi')).toBe(false)
  })
  test('returns false when the browser refuses', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    expect(await copyText('hi')).toBe(false)
  })
})
