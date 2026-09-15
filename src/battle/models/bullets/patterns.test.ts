import { expect, it } from 'vitest';
import { fireVolley, patternHeadings } from './patterns';

it('fires straight along the heading', () => {
  expect(patternHeadings('straight', 90)).toEqual([90]);
});

it('fires a five-bullet spread around the heading', () => {
  expect(patternHeadings('spread', 90)).toEqual([60, 75, 90, 105, 120]);
});

it('fires ten radial bullets whatever the heading', () => {
  expect(patternHeadings('radial', 90)).toEqual([0, 36, 72, 108, 144, 180, 216, 252, 288, 324]);
});

it('creates one enemy bullet per heading from the origin with fresh ids', () => {
  let id = 40;
  const bullets = fireVolley({ pattern: 'spread', x: 100, y: 226, heading: 90, speed: 260, damage: 10 }, () => ++id);

  expect(bullets.map((bullet) => bullet.id)).toEqual([41, 42, 43, 44, 45]);
  expect(bullets.every((bullet) => bullet.side === 'enemy' && bullet.x === 100 && bullet.y === 226)).toBe(true);
  expect(bullets.every((bullet) => bullet.damage === 10)).toBe(true);
  expect(bullets[0].vx).toBeCloseTo(Math.cos(Math.PI / 3) * 260, 9);
  expect(bullets[0].vy).toBeCloseTo(Math.sin(Math.PI / 3) * 260, 9);
});
