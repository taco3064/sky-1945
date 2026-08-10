import { describe, expect, it } from 'vitest';

import { entryFor, pathFor, positionOn } from './paths';
import type { PathKind } from './paths';
import { FIELD_HEIGHT, FIELD_WIDTH, isOutside } from '../field';

const ALL_PATHS: PathKind[] = ['dive', 'weave', 'arc', 'hover', 'sweep', 'feint'];

/** Walk a path in small steps, as the enemy field does. */
function walk(path: PathKind, lane: number, steps: number) {
  const entry = entryFor(path, lane);
  const trail = [];

  for (let step = 0; step <= steps; step += 1) {
    const travelled = step * 8;

    trail.push({ travelled, ...positionOn(path, { entry, travelled, age: step / 60 }) });
  }

  return { entry, trail };
}

describe('paths · every path eventually leaves the field', () => {
  // The load-bearing invariant. A round ends when the field is clear, so a
  // craft that parks anywhere is not a hard enemy — it is a run that cannot
  // finish.
  it.each(ALL_PATHS)('%s exits', (path) => {
    for (const lane of [0.1, 0.5, 0.9]) {
      const entry = entryFor(path, lane);
      let left = false;

      for (let step = 0; step < 5000 && !left; step += 1) {
        const at = positionOn(path, { entry, travelled: step * 4, age: step / 60 });

        left = isOutside(at.x, at.y, 60);
      }

      expect(left).toBe(true);
    }
  });

  it.each(ALL_PATHS)('%s starts near the field, not far outside it', (path) => {
    for (const lane of [0, 0.5, 1]) {
      const entry = entryFor(path, lane);

      expect(isOutside(entry.x, entry.y, 80)).toBe(false);
    }
  });
});

describe('paths · dive', () => {
  it('holds its column and only descends', () => {
    const { entry, trail } = walk('dive', 0.5, 20);

    for (const at of trail) {
      expect(at.x).toBe(entry.x);
    }

    expect(trail.at(-1)?.y).toBeGreaterThan(trail[0].y);
  });
});

describe('paths · weave', () => {
  it('leaves its column', () => {
    const { entry, trail } = walk('weave', 0.5, 120);

    expect(trail.some((at) => Math.abs(at.x - entry.x) > 20)).toBe(true);
  });

  // Absolute rather than accumulated, so it oscillates around the column it
  // entered on instead of wandering off it over a long descent.
  it('never drifts off the column it entered on', () => {
    const { entry, trail } = walk('weave', 0.5, 400);
    const furthest = Math.max(...trail.map((at) => Math.abs(at.x - entry.x)));

    expect(furthest).toBeLessThan(100);
  });

  it('comes back through its column rather than staying to one side', () => {
    const { entry, trail } = walk('weave', 0.5, 400);
    const sides = new Set(trail.map((at) => Math.sign(Math.round(at.x - entry.x))));

    expect(sides.has(1) && sides.has(-1)).toBe(true);
  });
});

describe('paths · arc', () => {
  it('bows towards the middle from whichever corner it entered', () => {
    const fromLeft = walk('arc', 0.1, 60);
    const fromRight = walk('arc', 0.9, 60);
    const leftMost = Math.max(...fromLeft.trail.map((at) => at.x - fromLeft.entry.x));
    const rightMost = Math.min(...fromRight.trail.map((at) => at.x - fromRight.entry.x));

    expect(leftMost).toBeGreaterThan(50);
    expect(rightMost).toBeLessThan(-50);
  });

  // Half a sine, so it leans out and straightens. A full turn would send the
  // craft back up the screen.
  it('straightens rather than curling back', () => {
    const { entry, trail } = walk('arc', 0.1, 200);

    expect(trail.at(-1)?.x).toBeCloseTo(entry.x, 0);
  });

  it('descends throughout', () => {
    const { trail } = walk('arc', 0.1, 60);

    for (const [index, at] of trail.slice(1).entries()) {
      expect(at.y).toBeGreaterThan(trail[index].y);
    }
  });
});

describe('paths · hover', () => {
  it('holds one altitude for a stretch, then carries on down', () => {
    const { trail } = walk('hover', 0.5, 200);
    const heights = trail.map((at) => Math.round(at.y));
    const held = heights.filter((y, index) => index > 0 && y === heights[index - 1]);

    expect(held.length).toBeGreaterThan(5);
    expect(heights.at(-1)).toBeGreaterThan(Math.max(...held));
  });

  // The hold is measured in distance, so a faster craft holds for less *time* —
  // a harder round should not hand the player a longer stationary target.
  it('never holds forever', () => {
    const { trail } = walk('hover', 0.5, 400);

    expect(trail.at(-1)?.y).toBeGreaterThan(FIELD_HEIGHT);
  });
});

describe('paths · sweep', () => {
  it('enters from a side edge, not from the top', () => {
    expect(entryFor('sweep', 0.1).x).toBeLessThan(0);
    expect(entryFor('sweep', 0.9).x).toBeGreaterThan(FIELD_WIDTH);
  });

  // Never across the bottom: that is the one altitude the player cannot leave.
  it('enters in the upper half', () => {
    for (const lane of [0, 0.5, 1]) {
      expect(entryFor('sweep', lane).y).toBeLessThan(FIELD_HEIGHT / 2);
    }
  });

  it('crosses inward from whichever side it came', () => {
    const fromLeft = walk('sweep', 0.1, 40);
    const fromRight = walk('sweep', 0.9, 40);

    expect(fromLeft.trail.at(-1)?.x).toBeGreaterThan(fromLeft.entry.x);
    expect(fromRight.trail.at(-1)?.x).toBeLessThan(fromRight.entry.x);
  });

  it('drifts down as it goes, so it does not hold one row', () => {
    const { entry, trail } = walk('sweep', 0.1, 40);

    expect(trail.at(-1)?.y).toBeGreaterThan(entry.y);
  });
});

describe('paths · feint', () => {
  it('dips, pulls back up, then commits', () => {
    const { trail } = walk('feint', 0.5, 120);
    const heights = trail.map((at) => at.y);
    const deepest = Math.max(...heights.slice(0, 60));
    const afterPull = heights[65];

    expect(afterPull).toBeLessThan(deepest);
    expect(heights.at(-1)).toBeGreaterThan(deepest);
  });

  // The recovery is deliberately partial. A feint that returned to its entry
  // would leave through the top and never threaten anything.
  it('stays below where it entered', () => {
    const { entry, trail } = walk('feint', 0.5, 200);

    for (const at of trail.slice(1)) {
      expect(at.y).toBeGreaterThan(entry.y);
    }
  });
});

describe('pathFor · variation without randomness', () => {
  // The reason it is not Math.random: a player clears round four on the third
  // attempt *because they remember what comes next*.
  it('gives the same answer for the same wave, every time', () => {
    for (const round of [1, 2, 5, 9]) {
      for (const wave of [0, 1, 2, 3]) {
        expect(pathFor(round, wave)).toBe(pathFor(round, wave));
      }
    }
  });

  it('keeps the first round to straight lines and swings', () => {
    const opening = [0, 1, 2, 3].map((wave) => pathFor(1, wave));

    expect(new Set(opening).size).toBeGreaterThan(1);

    for (const path of opening) {
      expect(['dive', 'weave']).toContain(path);
    }
  });

  it('brings in the awkward paths once the player knows normal', () => {
    const later = [0, 1, 2, 3]
      .flatMap((wave) => [4, 5, 6, 7].map((round) => pathFor(round, wave)));

    expect(new Set(later).size).toBeGreaterThan(3);
  });

  it('only ever names a real path', () => {
    for (let round = 1; round <= 20; round += 1) {
      for (let wave = 0; wave < 4; wave += 1) {
        expect(ALL_PATHS).toContain(pathFor(round, wave));
      }
    }
  });
});
