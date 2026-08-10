import { describe, expect, it } from 'vitest';

import { FIELD_HEIGHT, FIELD_WIDTH, isOutside } from './field';

describe('field · dimensions', () => {
  it('is taller than it is wide — the game is portrait', () => {
    expect(FIELD_HEIGHT).toBeGreaterThan(FIELD_WIDTH);
  });

  it('is 9:16, which is what the stage scales to', () => {
    expect(FIELD_WIDTH / FIELD_HEIGHT).toBeCloseTo(9 / 16, 6);
  });
});

describe('isOutside · without a margin', () => {
  it.each([
    ['top left', 0, 0],
    ['bottom right', FIELD_WIDTH, FIELD_HEIGHT],
    ['middle', FIELD_WIDTH / 2, FIELD_HEIGHT / 2],
  ])('counts the %s corner as inside', (_where, x, y) => {
    expect(isOutside(x, y)).toBe(false);
  });

  it.each([
    ['above', 270, -1],
    ['below', 270, FIELD_HEIGHT + 1],
    ['left of', -1, 480],
    ['right of', FIELD_WIDTH + 1, 480],
  ])('counts a point %s the field as outside', (_where, x, y) => {
    expect(isOutside(x, y)).toBe(true);
  });
});

describe('isOutside · with a margin', () => {
  // An enemy spawns above the top edge and is outside the field for its first
  // second. Culling it on the frame it appears would mean no enemies at all.
  it('keeps a point within the margin', () => {
    expect(isOutside(270, -20, 24)).toBe(false);
  });

  it('drops a point past the margin', () => {
    expect(isOutside(270, -25, 24)).toBe(true);
  });

  it('extends every edge, not just the top', () => {
    expect(isOutside(-20, 480, 24)).toBe(false);
    expect(isOutside(FIELD_WIDTH + 20, 480, 24)).toBe(false);
    expect(isOutside(270, FIELD_HEIGHT + 20, 24)).toBe(false);
  });
});
