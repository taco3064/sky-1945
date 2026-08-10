import { Engine } from 'matter-js';
import { beforeEach, describe, expect, it } from 'vitest';

import { createEnemyField } from './enemies';
import type { EnemyField } from './enemies';
import { ENEMY_STATS } from '../entities';
import { FIELD_HEIGHT } from '../field';

const EVEN = { speed: 1, power: 1 };

let engine: Engine;
let field: EnemyField;

beforeEach(() => {
  engine = Engine.create({ gravity: { x: 0, y: 0 } });
  field = createEnemyField(engine);
});

/** Run a number of 60Hz frames. */
function run(seconds: number, boosts = EVEN): void {
  const step = 1 / 60;

  for (let elapsed = 0; elapsed < seconds; elapsed += step) {
    field.advance(step, boosts);
  }
}

describe('enemies · arriving', () => {
  it('enters above the top edge, so it flies in rather than appearing', () => {
    field.spawn('small', 200);

    expect(field.bodies()[0].position.y).toBeLessThan(0);
  });

  it('is on the physics world, ready for #6 to collide with', () => {
    field.spawn('medium', 200);

    expect(engine.world.bodies).toHaveLength(1);
  });

  it('reports its kind, so the roster knows which silhouette to draw', () => {
    field.spawn('large', 100);

    expect(field.records()).toEqual([{ id: field.bodies()[0].id, kind: 'large' }]);
  });
});

describe('enemies · movement', () => {
  it('flies down the field', () => {
    field.spawn('small', 200);

    const before = field.bodies()[0].position.y;

    run(0.5);

    expect(field.bodies()[0].position.y).toBeGreaterThan(before);
  });

  it('flies straight when its kind has no sway', () => {
    field.spawn('small', 200);
    run(1);

    expect(field.bodies()[0].position.x).toBe(200);
  });

  // Sway is a function of age rather than an accumulation, so a swaying enemy
  // oscillates around where it entered instead of drifting off course.
  it('sways around its entry point when its kind does', () => {
    field.spawn('medium', 200);
    run(1);

    const swung = field.bodies()[0].position.x;

    expect(swung).not.toBe(200);
    expect(Math.abs(swung - 200)).toBeLessThanOrEqual(ENEMY_STATS.medium.sway);
  });

  it('goes faster when the round says so', () => {
    field.spawn('small', 100);
    run(0.5);

    const even = field.bodies()[0].position.y;

    field.clear();
    field.spawn('small', 100);
    run(0.5, { speed: 3, power: 1 });

    expect(field.bodies()[0].position.y).toBeGreaterThan(even * 2);
  });
});

describe('enemies · leaving', () => {
  it('is culled once it passes the bottom edge', () => {
    field.spawn('small', 200);

    let changed = false;

    for (let tick = 0; tick < 60 * 12; tick += 1) {
      changed = field.advance(1 / 60, EVEN).changed || changed;
    }

    expect(changed).toBe(true);
    expect(field.count()).toBe(0);
  });

  it('takes its body out of the physics world with it', () => {
    field.spawn('small', 200);

    for (let tick = 0; tick < 60 * 12; tick += 1) {
      field.advance(1 / 60, EVEN);
    }

    expect(engine.world.bodies).toHaveLength(0);
  });

  it('reports no change on a frame where nobody left', () => {
    field.spawn('small', 200);

    expect(field.advance(1 / 60, EVEN).changed).toBe(false);
  });
});

describe('enemies · firing', () => {
  // The cadence starts on arrival, so a craft cannot show up with its first
  // volley already charged.
  it('does not charge its cadence while still above the field', () => {
    field.spawn('small', 200);

    // Long enough to have earned a shot, if it had been counting.
    field.advance(ENEMY_STATS.small.fireInterval, EVEN);

    expect(field.bodies()[0].position.y).toBeGreaterThan(0);
    expect(field.advance(1 / 60, EVEN).shots).toHaveLength(0);
  });

  it('fires once it is on the field and the interval has passed', () => {
    field.spawn('small', 200);
    run(1);

    let fired = 0;

    for (let tick = 0; tick < 60 * 3; tick += 1) {
      fired += field.advance(1 / 60, EVEN).shots.length;
    }

    expect(fired).toBeGreaterThan(0);
  });

  it('fires the pattern its kind carries', () => {
    field.spawn('large', 200);
    run(2);

    let volley: number[] = [];

    for (let tick = 0; tick < 60 * 4 && volley.length === 0; tick += 1) {
      volley = field.advance(1 / 60, EVEN).shots.map((shot) => shot.vx);
    }

    // The large enemy fires radially, so its volley has bullets going sideways
    // — a straight shot never would.
    expect(volley.some((vx) => Math.abs(vx) > 1)).toBe(true);
  });

  it('hits harder when the round says so', () => {
    field.spawn('small', 200);
    run(1);

    const collect = (power: number): number => {
      for (let tick = 0; tick < 60 * 3; tick += 1) {
        const [shot] = field.advance(1 / 60, { speed: 1, power }).shots;

        if (shot) {
          return shot.damage;
        }
      }

      return 0;
    };

    expect(collect(3)).toBeCloseTo(ENEMY_STATS.small.damage * 3, 6);
  });

  it('aims its fire down the screen', () => {
    field.spawn('small', 200);
    run(1);

    for (let tick = 0; tick < 60 * 3; tick += 1) {
      const [shot] = field.advance(1 / 60, EVEN).shots;

      if (shot) {
        expect(shot.vy).toBeGreaterThan(0);
        expect(shot.side).toBe('enemy');

        return;
      }
    }
  });
});

describe('enemies · clear', () => {
  it('forgets everyone', () => {
    field.spawn('small', 100);
    field.spawn('large', 300);
    field.clear();

    expect(field.count()).toBe(0);
    expect(field.records()).toHaveLength(0);
  });
});

describe('enemies · the field stays inside its bounds', () => {
  it('never carries an enemy past the bottom without culling it', () => {
    field.spawn('large', 270);

    for (let tick = 0; tick < 60 * 30; tick += 1) {
      field.advance(1 / 60, EVEN);

      for (const body of field.bodies()) {
        expect(body.position.y).toBeLessThan(FIELD_HEIGHT + 100);
      }
    }
  });
});
