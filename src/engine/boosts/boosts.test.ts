import { describe, expect, it } from 'vitest';

import {
  BOOST_MAX_PERCENT,
  BOOST_MIN_PERCENT,
  DEFAULT_POINTS,
  LOADOUT_POINTS,
  boostsForRound,
  boostsFromPoints,
  toPoints,
} from './boosts';
import type { LoadoutPoints } from './boosts';

// Every member of the union, restated. A twelfth point added to the type
// without a line here would go untested by all four sweeps below.
const ALL_POINTS: LoadoutPoints[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

describe('boosts · the range is a property of the rule, not a guard', () => {
  it('has a point worth exactly a tenth of the span', () => {
    expect(BOOST_MAX_PERCENT - BOOST_MIN_PERCENT).toBe(LOADOUT_POINTS * 10);
  });

  it.each(ALL_POINTS)('%i points keeps both stats inside 100–200', (points) => {
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
  // `1 + 7 * 0.1` is 1.7000000000000002, which renders as 170.00000000000003%
  // and fails this assertion. Whole-percent arithmetic is why it passes.
  //
  // Seven points is the one allocation that breaks naive arithmetic at ten
  // percent a point, and both derivations are checked against it: seven spent
  // on speed, and the seven `power` gets back as the remainder of three.
  it('lands on the literal at the allocation that breaks naive arithmetic', () => {
    expect(boostsFromPoints(7).speed.multiplier).toBe(1.7);
    expect(boostsFromPoints(3).power.multiplier).toBe(1.7);
  });

  it.each(ALL_POINTS)('%i points keeps multiplier and percent agreeing', (points) => {
    const { speed, power } = boostsFromPoints(points);

    expect(speed.multiplier * 100).toBeCloseTo(speed.percent, 10);
    expect(power.multiplier * 100).toBeCloseTo(power.percent, 10);
  });

  it('starts a run at even odds', () => {
    const { speed, power } = boostsFromPoints(DEFAULT_POINTS);

    expect(speed.percent).toBe(150);
    expect(power.percent).toBe(150);
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

describe('boostsForRound · difficulty is a function, not a table', () => {
  it('leaves round one at full strength on both stats', () => {
    const { speed, power } = boostsForRound(1);

    expect(speed.percent).toBe(BOOST_MIN_PERCENT);
    expect(power.percent).toBe(BOOST_MIN_PERCENT);
  });

  // Deliberately NOT zero-sum, unlike the player's allocation: a harder round
  // is faster *and* hits harder. Same shape, different arithmetic — which is
  // why this is a second function rather than a reused one.
  it('raises both stats together, where a loadout trades one for the other', () => {
    const { speed, power } = boostsForRound(5);

    expect(speed.percent).toBeGreaterThan(BOOST_MIN_PERCENT);
    expect(power.percent).toBe(speed.percent);
  });

  it('climbs one point per round', () => {
    expect(boostsForRound(3).speed.percent - boostsForRound(2).speed.percent)
      .toBe(boostsForRound(2).speed.percent - boostsForRound(1).speed.percent);
  });

  it('stops at the same ceiling the player has', () => {
    expect(boostsForRound(11).speed.percent).toBe(BOOST_MAX_PERCENT);
    expect(boostsForRound(500).speed.percent).toBe(BOOST_MAX_PERCENT);
  });

  it('treats a round below one as round one, rather than going negative', () => {
    expect(boostsForRound(0).speed.percent).toBe(BOOST_MIN_PERCENT);
  });
});
