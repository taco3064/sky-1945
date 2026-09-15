import { expect, it } from 'vitest'
import { FIELD_HEIGHT, FIELD_WIDTH, isOutsideBy } from './field'

it('is 540 × 960 u', () => {
  expect([FIELD_WIDTH, FIELD_HEIGHT]).toEqual([540, 960])
})

it.each([
  [{ x: -24, y: 0 }, false],
  [{ x: -24.01, y: 0 }, true],
  [{ x: 564, y: 0 }, false],
  [{ x: 564.01, y: 0 }, true],
  [{ x: 0, y: -24 }, false],
  [{ x: 0, y: -24.01 }, true],
  [{ x: 0, y: 984 }, false],
  [{ x: 0, y: 984.01 }, true],
])('%o is outside by 24 u: %s', (point, outside) => {
  expect(isOutsideBy(point, 24)).toBe(outside)
})
