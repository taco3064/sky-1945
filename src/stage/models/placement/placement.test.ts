import { describe, expect, it } from 'vitest';
import { formatLean, formatRadius, nextLean, placementTransform } from './placement';

describe('nextLean', () => {
  it('stays level without sideways travel', () => {
    expect(nextLean(0, 0)).toBe(0);
  });

  it('eases 18% toward slide / 4', () => {
    expect(nextLean(0, 2)).toBeCloseTo(0.09, 12);
    expect(nextLean(0.5, -2)).toBeCloseTo(0.5 + (-0.5 - 0.5) * 0.18, 12);
  });

  it('caps the target at full lean', () => {
    expect(nextLean(0, 40)).toBeCloseTo(0.18, 12);
    expect(nextLean(0, -40)).toBeCloseTo(-0.18, 12);
  });
});

it('places the centre and turns by the angle', () => {
  expect(placementTransform(270, 800.5, 0))
    .toBe('translate3d(270px, 800.5px, 0) rotate(0deg)');

  expect(placementTransform(-40, 12, 180))
    .toBe('translate3d(-40px, 12px, 0) rotate(180deg)');
});

it('writes lean with 3 decimals', () => {
  expect(formatLean(0)).toBe('0.000');
  expect(formatLean(0.18765)).toBe('0.188');
});

it('writes a radius with 2 decimals', () => {
  expect(formatRadius(0)).toBe('0.00');
  expect(formatRadius(89.99999999999997)).toBe('90.00');
});
