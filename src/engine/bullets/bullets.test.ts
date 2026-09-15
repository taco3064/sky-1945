import { Engine } from 'matter-js';
import { beforeEach, describe, expect, it } from 'vitest';

import { createBulletField } from './bullets';
import { damageOf } from '../entities';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import type { BulletSpawn } from '../patterns';
import type { BulletField } from './types';

/** One bullet heading straight up from mid-field. */
function upward(overrides: Partial<BulletSpawn> = {}): BulletSpawn {
  return { x: 270, y: 800, vx: 0, vy: -600, damage: 25, side: 'player', ...overrides };
}

let engine: Engine;
let field: BulletField;

beforeEach(() => {
  engine = Engine.create({ gravity: { x: 0, y: 0 } });
  field = createBulletField(engine);
});

describe('bullets · adding', () => {
  it('takes a volley and reports that something arrived', () => {
    expect(field.add([upward(), upward()])).toBe(true);
    expect(field.records()).toHaveLength(2);
  });

  it('reports nothing for an empty volley', () => {
    expect(field.add([])).toBe(false);
  });

  it('carries the damage the pattern gave each bullet', () => {
    field.add([upward({ damage: 42 })]);

    expect(damageOf(field.bodies()[0])).toBe(42);
  });

  it('adds every bullet to the physics world, so collisions can see them', () => {
    field.add([upward(), upward(), upward()]);

    expect(engine.world.bodies).toHaveLength(3);
  });

  it('marks enemy fire as hostile and the player\'s as not', () => {
    field.add([upward(), upward({ side: 'enemy', vy: 260 })]);

    expect(field.records().map((record) => record.hostile)).toEqual([false, true]);
  });
});

describe('bullets · flight follows the velocity it was given', () => {
  it('carries a bullet along its own vector, not a fixed direction', () => {
    field.add([upward({ x: 100, y: 500, vx: 300, vy: 400 })]);
    field.advance(0.1);

    const [bullet] = field.bodies();

    expect(bullet.position.x).toBeCloseTo(130, 5);
    expect(bullet.position.y).toBeCloseTo(540, 5);
  });

  // A radial burst sends ten bullets on ten vectors through this same code.
  it('advances a whole burst independently', () => {
    field.add([
      upward({ vx: 0, vy: -600 }),
      upward({ vx: 600, vy: 0 }),
      upward({ vx: -600, vy: 0 }),
    ]);

    field.advance(0.05);

    const xs = field.bodies().map((bullet) => Math.round(bullet.position.x));

    expect(xs).toEqual([270, 300, 240]);
  });

  it('keeps flying while on the field', () => {
    field.add([upward()]);

    expect(field.advance(0.1)).toBe(false);
    expect(field.records()).toHaveLength(1);
  });
});

describe('bullets · leaving the field', () => {
  // Enemy fire exits the bottom, the player's the top, and a radial burst
  // leaves through all four — so the cull cannot be a single edge test.
  it.each([
    ['top', { x: 270, y: 20, vx: 0, vy: -600 }],
    ['bottom', { x: 270, y: FIELD_HEIGHT - 20, vx: 0, vy: 600 }],
    ['left', { x: 20, y: 500, vx: -600, vy: 0 }],
    ['right', { x: FIELD_WIDTH - 20, y: 500, vx: 600, vy: 0 }],
  ])('drops a bullet that exits by the %s', (_edge, spawn) => {
    field.add([upward(spawn)]);

    expect(field.advance(0.5)).toBe(true);
    expect(field.records()).toHaveLength(0);
  });

  // A body left behind is a leak the collision phase pays for every frame.
  it('removes the body from the physics world too', () => {
    field.add([upward()]);
    field.advance(2);

    expect(engine.world.bodies).toHaveLength(0);
  });

  // The assertion is stability, not smallness. A leak shows up as a count
  // that keeps climbing for as long as the game runs, and "under N" would
  // pass right up until it did not.
  it('holds a steady population over a long run', () => {
    const samples: number[] = [];

    for (let tick = 0; tick < 900; tick += 1) {
      field.add([upward()]);
      field.advance(1 / 60);

      if (tick % 150 === 149) {
        samples.push(field.records().length);
      }
    }

    // Bullets leave as fast as they arrive, so every sample past the first
    // fill-up is the same number.
    expect(new Set(samples.slice(1)).size).toBe(1);
  });
});

describe('bullets · clear', () => {
  it('forgets everything', () => {
    field.add([upward(), upward()]);
    field.clear();

    expect(field.records()).toHaveLength(0);
    expect(field.bodies()).toHaveLength(0);
  });
});

describe('bullets · removing on impact', () => {
  it('takes the bullet out of both the map and the physics world', () => {
    field.add([upward()]);

    const [bullet] = field.bodies();

    field.remove(bullet.id);

    expect(field.records()).toHaveLength(0);
    expect(engine.world.bodies).toHaveLength(0);
  });

  // A bullet can hit an enemy on the same frame it leaves the field, so the
  // id it reports may already be gone.
  it('ignores an id it does not know', () => {
    expect(() => field.remove(9999)).not.toThrow();
  });
});
