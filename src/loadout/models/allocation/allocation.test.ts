import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SPEED_POINTS,
  TOTAL_POINTS,
  clampPoints,
  powerMultiplier,
  powerPercent,
  speedMultiplier,
  speedPercent,
} from './allocation';

// game-spec 14.1: speed points → SPEED %, POWER %
const LOADOUT_TABLE: [number, number, number][] = [
  [0, 100, 200],
  [1, 110, 190],
  [2, 120, 180],
  [3, 130, 170],
  [4, 140, 160],
  [5, 150, 150],
  [6, 160, 140],
  [7, 170, 130],
  [8, 180, 120],
  [9, 190, 110],
  [10, 200, 100],
];

describe('allocation', () => {
  it('shares 10 points and defaults to 5', () => {
    expect(TOTAL_POINTS).toBe(10);
    expect(DEFAULT_SPEED_POINTS).toBe(5);
  });

  it.each(LOADOUT_TABLE)('%i speed points give SPEED %i%% and POWER %i%%', (points, speed, power) => {
    expect(speedPercent(points)).toBe(speed);
    expect(powerPercent(points)).toBe(power);
    expect(speedMultiplier(points)).toBeCloseTo(speed / 100, 12);
    expect(powerMultiplier(points)).toBeCloseTo(power / 100, 12);
  });

  it('rounds and clamps points to 0–10', () => {
    expect(clampPoints(-1)).toBe(0);
    expect(clampPoints(11)).toBe(10);
    expect(clampPoints(3.4)).toBe(3);
    expect(clampPoints(3.5)).toBe(4);
  });
});
