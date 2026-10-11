import { expect, test } from 'vitest'
import { terms } from '@/generated/registry'
import { lintTerms } from '@/lib/lint'
import { loadReviews } from '@/lib/reviews'
import config from '../content-lint.config'

test('every term passes the content lint', () => {
  expect(lintTerms(terms, loadReviews('reviews'), config)).toEqual([])
})
