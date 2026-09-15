import { expect, it } from 'vitest';
import { headingVelocity } from './heading';

it.each([
  [0, 1, 0],
  [90, 0, 1],
  [180, -1, 0],
  [-90, 0, -1],
  [36, Math.cos(Math.PI / 5), Math.sin(Math.PI / 5)],
])('heading %i° points along (%f, %f)', (heading, x, y) => {
  const velocity = headingVelocity(heading, 320);

  expect(velocity.x).toBeCloseTo(x * 320, 9);
  expect(velocity.y).toBeCloseTo(y * 320, 9);
});
