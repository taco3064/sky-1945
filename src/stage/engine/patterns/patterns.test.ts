import { describe, expect, it } from 'vitest';

import { PATTERN_SIZE, shotsFor } from './patterns';
import type { PatternKind, PatternOptions } from './types';

const ALL_KINDS: PatternKind[] = ['straight', 'spread', 'radial'];

/** Down the screen, which is where enemy fire goes. */
function volley(overrides: Partial<PatternOptions> = {}): PatternOptions {
  return {
    kind: 'straight',
    x: 270,
    y: 200,
    speed: 300,
    damage: 12,
    side: 'enemy',
    heading: 90,
    ...overrides,
  };
}

/** How fast a shot actually travels, regardless of direction. */
function speedOf(shot: { vx: number; vy: number }): number {
  return Math.hypot(shot.vx, shot.vy);
}

describe('patterns · every kind', () => {
  it.each(ALL_KINDS)('%s produces the count PATTERN_SIZE promises', (kind) => {
    expect(shotsFor(volley({ kind }))).toHaveLength(PATTERN_SIZE[kind]);
  });

  // A bullet that travels faster because of the angle it was fired at would
  // make the fan and the burst read as different weapons.
  it.each(ALL_KINDS)('%s gives every bullet the same speed', (kind) => {
    for (const shot of shotsFor(volley({ kind, speed: 250 }))) {
      expect(speedOf(shot)).toBeCloseTo(250, 6);
    }
  });

  it.each(ALL_KINDS)('%s starts every bullet at the muzzle', (kind) => {
    for (const shot of shotsFor(volley({ kind, x: 100, y: 50 }))) {
      expect(shot).toMatchObject({ x: 100, y: 50 });
    }
  });

  it.each(ALL_KINDS)('%s passes damage and side through untouched', (kind) => {
    for (const shot of shotsFor(volley({ kind, damage: 99, side: 'player' }))) {
      expect(shot).toMatchObject({ damage: 99, side: 'player' });
    }
  });
});

describe('patterns · straight', () => {
  it('fires one bullet along the heading', () => {
    const [down] = shotsFor(volley({ heading: 90, speed: 100 }));

    expect(down.vx).toBeCloseTo(0, 6);
    expect(down.vy).toBeCloseTo(100, 6);
  });

  it('fires upward when the heading says so — the player uses the same code', () => {
    const [up] = shotsFor(volley({ heading: -90, speed: 100, side: 'player' }));

    expect(up.vy).toBeCloseTo(-100, 6);
  });
});

describe('patterns · spread', () => {
  it('is symmetric about the heading', () => {
    const shots = shotsFor(volley({ kind: 'spread', heading: 90 }));
    const first = shots[0];
    const last = shots[shots.length - 1];

    expect(first.vx).toBeCloseTo(-last.vx, 6);
    expect(first.vy).toBeCloseTo(last.vy, 6);
  });

  it('puts its middle bullet exactly on the heading', () => {
    const shots = shotsFor(volley({ kind: 'spread', heading: 90, speed: 100 }));
    const middle = shots[(shots.length - 1) / 2];

    expect(middle.vx).toBeCloseTo(0, 6);
    expect(middle.vy).toBeCloseTo(100, 6);
  });

  it('opens wide enough to demand a sideways answer', () => {
    const shots = shotsFor(volley({ kind: 'spread', heading: 90 }));
    const angles = shots.map((shot) => (Math.atan2(shot.vy, shot.vx) * 180) / Math.PI);

    expect(Math.max(...angles) - Math.min(...angles)).toBeCloseTo(60, 6);
  });
});

describe('patterns · radial', () => {
  it('divides the full circle evenly', () => {
    const shots = shotsFor(volley({ kind: 'radial' }));

    const angles = shots
      .map((shot) => (Math.atan2(shot.vy, shot.vx) * 180) / Math.PI)
      .map((degrees) => (degrees + 360) % 360)
      .sort((a, b) => a - b);

    const gaps = angles.slice(1).map((angle, index) => angle - angles[index]);

    for (const gap of gaps) {
      expect(gap).toBeCloseTo(360 / shots.length, 4);
    }
  });

  // The burst covers every direction, so the heading it was fired at cannot
  // matter — which is what makes it "there is no sideways".
  it('ignores the heading', () => {
    const north = shotsFor(volley({ kind: 'radial', heading: -90 }));
    const south = shotsFor(volley({ kind: 'radial', heading: 90 }));

    expect(north).toEqual(south);
  });
});
