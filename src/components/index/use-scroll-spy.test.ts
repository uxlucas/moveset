import { describe, expect, test } from 'vitest'
import { pickCurrent } from './use-scroll-spy'

// A card at a given viewport position (top, height 300).
const card = (slug: string, top: number, height = 300) => ({
  dataset: { slug } as DOMStringMap,
  getBoundingClientRect: () => ({ top, bottom: top + height }) as DOMRect,
})

const tall = { viewportHeight: 800, scrollY: 1000, scrollHeight: 5000 }

describe('pickCurrent', () => {
  test('takes the lowest card above the 42% line', () => {
    const cards = [card('a', -400), card('b', 100), card('c', 500)]
    expect(pickCurrent(cards, tall, null)?.dataset.slug).toBe('b')
  })

  test('nothing above the line means none (the sidebar shows Index)', () => {
    expect(pickCurrent([card('a', 500)], tall, null)).toBeNull()
  })

  test('two cards on one row: the left one, unless the right one is already current', () => {
    const cards = [card('left', 100), card('right', 100)]
    expect(pickCurrent(cards, tall, null)?.dataset.slug).toBe('left')
    expect(pickCurrent(cards, tall, 'right')?.dataset.slug).toBe('right')
  })

  test('at the bottom, the last fully visible card wins (left of a shared row)', () => {
    const bottom = { viewportHeight: 800, scrollY: 4200, scrollHeight: 5000 }
    const cards = [card('a', -200), card('b', 150), card('c', 480), card('d', 480)]
    expect(pickCurrent(cards, bottom, 'a')?.dataset.slug).toBe('c')
    expect(pickCurrent(cards, bottom, 'b')?.dataset.slug).toBe('b')
  })

  test('a page that does not scroll never applies the bottom rule', () => {
    const short = { viewportHeight: 800, scrollY: 0, scrollHeight: 800 }
    expect(pickCurrent([card('a', 450), card('b', 450)], short, null)).toBeNull()
  })

  test('no cards, no pick', () => {
    expect(pickCurrent([], tall, null)).toBeNull()
  })
})
