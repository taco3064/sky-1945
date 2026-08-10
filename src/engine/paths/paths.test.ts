import { describe, expect, it } from 'vitest';

import { ALL_EDGES, ALL_PATHS, edgeFor, entryFor, pathFor, positionOn } from './paths';
import type { Edge, PathKind } from './paths';
import { FIELD_HEIGHT, FIELD_WIDTH, isOutside } from '../field';

/** Every edge paired with every shape — the whole product, since it is now free. */
const COMBINATIONS = ALL_EDGES.flatMap(
  (edge) => ALL_PATHS.map((path): [Edge, PathKind] => [edge, path]),
);

/** Walk a path in small steps, as the enemy field does. */
function walk(path: PathKind, lane: number, steps: number, edge: Edge = 'top') {
  const entry = entryFor(edge, path, lane);
  const trail = [];

  for (let step = 0; step <= steps; step += 1) {
    const travelled = step * 8;

    trail.push({
      travelled,
      ...positionOn(path, { edge, entry, travelled, age: step / 60 }),
    });
  }

  return { entry, trail };
}

/** The axis a shape must not drift along, given the edge it came from. */
function sideways(edge: Edge, at: { x: number; y: number }): number {
  return edge === 'top' ? at.x : at.y;
}

/** How far the field extends along that axis. */
function sidewaysLimit(edge: Edge): number {
  return edge === 'top' ? FIELD_WIDTH : FIELD_HEIGHT;
}

describe('paths · every path eventually leaves the field', () => {
  // The load-bearing invariant. A round ends when the field is clear, so a craft
  // that parks anywhere is not a hard enemy — it is a run that cannot finish.
  // Checked across every edge now, because a shape that exits downward says
  // nothing about the same shape flying sideways.
  it.each(COMBINATIONS)('%s · %s exits', (edge, path) => {
    for (const lane of [0, 0.5, 1]) {
      const entry = entryFor(edge, path, lane);
      let left = false;

      for (let step = 0; step < 5000 && !left; step += 1) {
        const at = positionOn(path, { edge, entry, travelled: step * 4, age: step / 60 });

        left = isOutside(at.x, at.y, 60);
      }

      expect(left).toBe(true);
    }
  });

  /*
   * A path must stay *on* the field for as long as it is crossing it.
   *
   * Leaving by the far side is the point; drifting off sideways halfway across is
   * a craft the player never got to shoot, culled by the margin. It shipped that
   * way and only showed up when the enemy count doubled: at four per wave no lane
   * was ever near an edge, and at sixteen the outermost `weave` swung 38 units
   * past the left edge on its first oscillation.
   *
   * "Sideways" is relative to the heading, which is why it is read through a
   * helper: entering from the top the constraint is on x, and from a side, on y.
   */
  it.each(COMBINATIONS)('%s · %s does not drift off the sides', (edge, path) => {
    for (const lane of [0, 0.25, 0.5, 0.75, 1]) {
      const entry = entryFor(edge, path, lane);

      for (let step = 0; step < 400; step += 1) {
        const at = positionOn(path, { edge, entry, travelled: step * 6, age: step / 60 });
        const along = edge === 'top' ? at.y : at.x;
        const alongLimit = edge === 'top' ? FIELD_HEIGHT : FIELD_WIDTH;

        if (along > 0 && along < alongLimit) {
          expect(sideways(edge, at)).toBeGreaterThanOrEqual(0);
          expect(sideways(edge, at)).toBeLessThanOrEqual(sidewaysLimit(edge));
        }
      }
    }
  });

  it.each(COMBINATIONS)('%s · %s starts just outside, not far away', (edge, path) => {
    for (const lane of [0, 0.5, 1]) {
      const entry = entryFor(edge, path, lane);

      expect(isOutside(entry.x, entry.y, 80)).toBe(false);
    }
  });
});

describe('entryFor · which edge a craft comes in from', () => {
  it('puts a top entry above the field', () => {
    expect(entryFor('top', 'dive', 0.5).y).toBeLessThan(0);
    expect(entryFor('top', 'dive', 0.5).x).toBeCloseTo(FIELD_WIDTH / 2, 0);
  });

  it('puts a left entry off the left edge, and a right one off the right', () => {
    expect(entryFor('left', 'dive', 0.5).x).toBeLessThan(0);
    expect(entryFor('right', 'dive', 0.5).x).toBeGreaterThan(FIELD_WIDTH);
  });

  // Never along the bottom: that is the one row the player cannot leave.
  it('brings side entries in above the halfway line', () => {
    for (const lane of [0, 0.5, 1]) {
      expect(entryFor('left', 'dive', lane).y).toBeLessThan(FIELD_HEIGHT / 2);
      expect(entryFor('right', 'dive', lane).y).toBeLessThan(FIELD_HEIGHT / 2);
    }
  });

  /*
   * The lane is inset by however far the shape swings, which is what stopped a
   * crowded wave throwing its outermost craft off the field. A weave therefore
   * gets a narrower band of columns than a dive does, from the same lane values.
   */
  it('gives a swinging shape a narrower band than a straight one', () => {
    expect(entryFor('top', 'weave', 0).x).toBeGreaterThan(entryFor('top', 'dive', 0).x);
    expect(entryFor('top', 'weave', 1).x).toBeLessThan(entryFor('top', 'dive', 1).x);
  });

  it('spreads lanes monotonically across the field', () => {
    const columns = [0, 0.25, 0.5, 0.75, 1]
      .map((lane) => entryFor('top', 'dive', lane).x);

    for (const [index, x] of columns.slice(1).entries()) {
      expect(x).toBeGreaterThan(columns[index]);
    }
  });
});

describe('paths · the heading rotates the shape', () => {
  // The single reason five definitions produce fifteen behaviours.
  it('advances down from the top, right from the left, and left from the right', () => {
    const down = walk('dive', 0.5, 20, 'top');
    const right = walk('dive', 0.5, 20, 'left');
    const left = walk('dive', 0.5, 20, 'right');

    expect(down.trail.at(-1)?.y).toBeGreaterThan(down.entry.y);
    expect(down.trail.at(-1)?.x).toBeCloseTo(down.entry.x, 5);

    expect(right.trail.at(-1)?.x).toBeGreaterThan(right.entry.x);
    expect(right.trail.at(-1)?.y).toBeCloseTo(right.entry.y, 5);

    expect(left.trail.at(-1)?.x).toBeLessThan(left.entry.x);
  });

  // A weave swings left/right coming down and up/down coming across, out of one
  // definition of weaving.
  it('turns a sideways swing into a vertical one when the heading turns', () => {
    const fromTop = walk('weave', 0.5, 200, 'top');
    const fromSide = walk('weave', 0.5, 200, 'left');

    const acrossTop = Math.max(
      ...fromTop.trail.map((at) => Math.abs(at.x - fromTop.entry.x)),
    );

    const acrossSide = Math.max(
      ...fromSide.trail.map((at) => Math.abs(at.y - fromSide.entry.y)),
    );

    expect(acrossTop).toBeGreaterThan(20);
    expect(acrossSide).toBeGreaterThan(20);
  });
});

describe('paths · dive', () => {
  it('holds its column and only descends', () => {
    const { entry, trail } = walk('dive', 0.5, 20);

    for (const at of trail) {
      expect(at.x).toBeCloseTo(entry.x, 5);
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
  it('bows towards the middle from whichever side it entered', () => {
    const fromLeft = walk('arc', 0, 60);
    const fromRight = walk('arc', 1, 60);
    const leftMost = Math.max(...fromLeft.trail.map((at) => at.x - fromLeft.entry.x));
    const rightMost = Math.min(...fromRight.trail.map((at) => at.x - fromRight.entry.x));

    expect(leftMost).toBeGreaterThan(50);
    expect(rightMost).toBeLessThan(-50);
  });

  // Bowing inward is what makes it safe from every edge — it never has to be
  // given room, because its entry is already the far side of its travel.
  it('bows towards the middle from a side entry too', () => {
    const { entry, trail } = walk('arc', 0, 60, 'left');
    const inward = Math.max(...trail.map((at) => at.y - entry.y));

    expect(inward).toBeGreaterThan(50);
  });

  // Half a sine, so it leans out and straightens. A full turn would send the
  // craft back the way it came.
  it('straightens rather than curling back', () => {
    const { entry, trail } = walk('arc', 0, 200);

    expect(trail.at(-1)?.x).toBeCloseTo(entry.x, 0);
  });

  it('advances throughout', () => {
    const { trail } = walk('arc', 0, 60);

    for (const [index, at] of trail.slice(1).entries()) {
      expect(at.y).toBeGreaterThan(trail[index].y);
    }
  });
});

describe('paths · hover', () => {
  it('holds one altitude for a stretch, then carries on', () => {
    const { trail } = walk('hover', 0.5, 200);
    const heights = trail.map((at) => Math.round(at.y));
    const held = heights.filter((y, index) => index > 0 && y === heights[index - 1]);

    expect(held.length).toBeGreaterThan(5);
    expect(heights.at(-1)).toBeGreaterThan(Math.max(...held));
  });

  // The hold is measured in distance, so a faster craft holds for less *time* — a
  // harder round should not hand the player a longer stationary target.
  it('never holds forever', () => {
    const { trail } = walk('hover', 0.5, 400);

    expect(trail.at(-1)?.y).toBeGreaterThan(FIELD_HEIGHT);
  });

  it('holds its position coming in from a side, too', () => {
    const { trail } = walk('hover', 0.5, 200, 'left');
    const columns = trail.map((at) => Math.round(at.x));
    const held = columns.filter((x, index) => index > 0 && x === columns[index - 1]);

    expect(held.length).toBeGreaterThan(5);
  });
});

describe('paths · feint', () => {
  it('presses in, pulls back, then commits', () => {
    const { trail } = walk('feint', 0.5, 120);
    const heights = trail.map((at) => at.y);
    const deepest = Math.max(...heights.slice(0, 60));
    const afterPull = heights[65];

    expect(afterPull).toBeLessThan(deepest);
    expect(heights.at(-1)).toBeGreaterThan(deepest);
  });

  // The recovery is deliberately partial. A feint that returned to its entry
  // would leave the way it came and never threaten anything.
  it('stays past where it entered', () => {
    const { entry, trail } = walk('feint', 0.5, 200);

    for (const at of trail.slice(1)) {
      expect(at.y).toBeGreaterThan(entry.y);
    }
  });
});

describe('pathFor · variation without randomness', () => {
  // The reason it is not Math.random: a player clears round four on the third
  // attempt *because they remember what comes next*.
  it('gives the same answer for the same slot, every time', () => {
    for (const round of [1, 2, 5, 9]) {
      for (const slot of [0, 1, 2, 3]) {
        expect(pathFor(round, slot)).toBe(pathFor(round, slot));
      }
    }
  });

  it('keeps the first round to straight lines and swings', () => {
    const opening = [0, 1, 2, 3].map((slot) => pathFor(1, slot));

    expect(new Set(opening).size).toBeGreaterThan(1);

    for (const path of opening) {
      expect(['dive', 'weave']).toContain(path);
    }
  });

  it('brings in the awkward shapes once the player knows normal', () => {
    const later = [0, 1, 2, 3]
      .flatMap((slot) => [4, 5, 6, 7].map((round) => pathFor(round, slot)));

    expect(new Set(later).size).toBeGreaterThan(3);
  });

  it('only ever names a real shape', () => {
    for (let round = 1; round <= 20; round += 1) {
      for (let slot = 0; slot < 8; slot += 1) {
        expect(ALL_PATHS).toContain(pathFor(round, slot));
      }
    }
  });
});

describe('edgeFor · where the threat comes from', () => {
  // A player has to learn where the threat normally comes from before an
  // exception can mean anything.
  it('is top-only for the first two rounds', () => {
    for (const round of [1, 2]) {
      for (let slot = 0; slot < 12; slot += 1) {
        expect(edgeFor(round, slot)).toBe('top');
      }
    }
  });

  it('brings in side entries from round three', () => {
    const edges = new Set(
      Array.from({ length: 12 }, (_unused, slot) => edgeFor(3, slot)),
    );

    expect(edges).toContain('left');
    expect(edges).toContain('right');
    expect(edges).toContain('top');
  });

  // Punctuation, not the rule. This is a vertical shooter and the top is where
  // the pressure is meant to live.
  it('keeps most squads coming from the top', () => {
    const edges = Array.from({ length: 30 }, (_unused, slot) => edgeFor(6, slot));
    const fromTop = edges.filter((edge) => edge === 'top').length;

    expect(fromTop / edges.length).toBeGreaterThan(0.5);
    expect(fromTop / edges.length).toBeLessThan(0.8);
  });

  it('alternates the side it uses, so it is not always the same flank', () => {
    const sides = Array.from({ length: 24 }, (_unused, slot) => edgeFor(5, slot))
      .filter((edge) => edge !== 'top');

    expect(new Set(sides)).toEqual(new Set(['left', 'right']));
  });

  it('is deterministic, like every other choice here', () => {
    for (const round of [1, 4, 8]) {
      for (let slot = 0; slot < 10; slot += 1) {
        expect(edgeFor(round, slot)).toBe(edgeFor(round, slot));
      }
    }
  });

  it('only ever names a real edge', () => {
    for (let round = 1; round <= 20; round += 1) {
      for (let slot = 0; slot < 10; slot += 1) {
        expect(ALL_EDGES).toContain(edgeFor(round, slot));
      }
    }
  });
});
