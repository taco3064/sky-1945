import { expect, it } from 'vitest';
import { roundMultiplier } from './rounds';

// game-spec 14.2: round → m
it.each([
  [1, 1.0],
  [2, 1.1],
  [3, 1.2],
  [4, 1.3],
  [5, 1.4],
  [6, 1.5],
  [7, 1.6],
  [8, 1.7],
  [9, 1.8],
  [10, 1.9],
  [11, 2.0],
  [30, 2.0],
])('round %i has m = %f', (round, m) => {
  expect(roundMultiplier(round)).toBeCloseTo(m, 12);
});
