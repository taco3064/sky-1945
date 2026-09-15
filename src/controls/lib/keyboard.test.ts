import { expect, it } from 'vitest'
import { arrowDirection, isArrowKey } from './keyboard'

it('recognises the four arrow keys only', () => {
  expect(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].every(isArrowKey)).toBe(true)
  expect([' ', 'Escape', 'w', 'toString'].some(isArrowKey)).toBe(false)
})

it.each([
  [[], { x: 0, y: 0 }],
  [['ArrowUp'], { x: 0, y: -1 }],
  [['ArrowDown'], { x: 0, y: 1 }],
  [['ArrowLeft'], { x: -1, y: 0 }],
  [['ArrowRight'], { x: 1, y: 0 }],
  [['ArrowUp', 'ArrowRight'], { x: 1, y: -1 }],
  [['ArrowLeft', 'ArrowRight', 'ArrowDown'], { x: 0, y: 1 }],
])('%o held steers %o', (held, direction) => {
  expect(arrowDirection(held)).toEqual(direction)
})
