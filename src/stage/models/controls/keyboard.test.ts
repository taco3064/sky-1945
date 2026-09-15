import { expect, it } from 'vitest';
import { arrowDirection, isArrowKey, isPulseKey } from './keyboard';

it('recognises the four arrow keys only', () => {
  const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

  expect(arrows.every(isArrowKey)).toBe(true);
  expect([' ', 'Escape', 'w', 'toString'].some(isArrowKey)).toBe(false);
});

it('recognises X, either case, as the PULSE key', () => {
  expect(['x', 'X'].every(isPulseKey)).toBe(true);
  expect([' ', 'Escape', 'z', 'KeyX'].some(isPulseKey)).toBe(false);
});

it.each([
  [[], { x: 0, y: 0 }],
  [['ArrowUp'], { x: 0, y: -1 }],
  [['ArrowDown'], { x: 0, y: 1 }],
  [['ArrowLeft'], { x: -1, y: 0 }],
  [['ArrowRight'], { x: 1, y: 0 }],
  [['ArrowUp', 'ArrowRight'], { x: 1, y: -1 }],
  [['ArrowLeft', 'ArrowRight', 'ArrowDown'], { x: 0, y: 1 }],
])('%o held steers %o', (held, direction) => {
  expect(arrowDirection(held)).toEqual(direction);
});
