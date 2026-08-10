import { describe, expect, it } from 'vitest';

import {
  BOOST_MAX_PERCENT,
  BOOST_MIN_PERCENT,
  DEFAULT_POINTS,
  LOADOUT_POINTS,
  boostsFromPoints,
  toPoints,
} from './boosts';
import type { LoadoutPoints } from './boosts';

// Every member of the union, restated. A twelfth point added to the type
// without a line here would go untested by all four sweeps below.
const ALL_POINTS: LoadoutPoints[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

describe('boosts · the range is a property of the rule, not a guard', () => {
  it('has a point worth exactly a tenth of the span', () => {
    expect(BOOST_MAX_PERCENT - BOOST_MIN_PERCENT).toBe(LOADOUT_POINTS * 20);
  });

  it.each(ALL_POINTS)('%i points keeps both stats inside 100–300', (points) => {
    const { speed, power } = boostsFromPoints(points);

    for (const percent of [speed.percent, power.percent]) {
      expect(percent).toBeGreaterThanOrEqual(BOOST_MIN_PERCENT);
      expect(percent).toBeLessThanOrEqual(BOOST_MAX_PERCENT);
    }
  });

  it('reaches both ends exactly, so neither needs clamping', () => {
    expect(boostsFromPoints(0).speed.percent).toBe(BOOST_MIN_PERCENT);
    expect(boostsFromPoints(0).power.percent).toBe(BOOST_MAX_PERCENT);
    expect(boostsFromPoints(LOADOUT_POINTS).speed.percent).toBe(BOOST_MAX_PERCENT);
    expect(boostsFromPoints(LOADOUT_POINTS).power.percent).toBe(BOOST_MIN_PERCENT);
  });

  // What makes it one pool rather than two independent stats: whatever one
  // gains, the other loses, at every allocation.
  it.each(ALL_POINTS)('%i points spends the same total either way', (points) => {
    const { speed, power } = boostsFromPoints(points);

    expect(speed.percent + power.percent).toBe(BOOST_MIN_PERCENT + BOOST_MAX_PERCENT);
  });
});

describe('boosts · the multiplier is exact, not merely close', () => {
  // `1 + 3 * 0.2` is 1.6000000000000001, which renders as 160.00000000000003%
  // and fails this assertion. Whole-percent arithmetic is why it passes.
  it('lands on the literal at the allocation that breaks naive arithmetic', () => {
    expect(boostsFromPoints(3).speed.multiplier).toBe(1.6);
    expect(boostsFromPoints(7).speed.multiplier).toBe(2.4);
  });

  it.each(ALL_POINTS)('%i points keeps multiplier and percent agreeing', (points) => {
    const { speed, power } = boostsFromPoints(points);

    expect(speed.multiplier * 100).toBeCloseTo(speed.percent, 10);
    expect(power.multiplier * 100).toBeCloseTo(power.percent, 10);
  });

  it('starts a run at even odds', () => {
    const { speed, power } = boostsFromPoints(DEFAULT_POINTS);

    expect(speed.percent).toBe(200);
    expect(power.percent).toBe(200);
  });
});

describe('toPoints · the one door a raw number comes through', () => {
  it.each(ALL_POINTS)('passes %i through untouched', (points) => {
    expect(toPoints(points)).toBe(points);
  });

  it('rounds a fractional slider value to the nearest point', () => {
    expect(toPoints(4.4)).toBe(4);
    expect(toPoints(4.5)).toBe(5);
    expect(toPoints(4.6)).toBe(5);
  });

  it('stops at the ends instead of wrapping or throwing', () => {
    expect(toPoints(-1)).toBe(0);
    expect(toPoints(-999)).toBe(0);
    expect(toPoints(LOADOUT_POINTS + 1)).toBe(LOADOUT_POINTS);
    expect(toPoints(999)).toBe(LOADOUT_POINTS);
  });
});
