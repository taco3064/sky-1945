import { Engine } from 'matter-js';
import { beforeEach, describe, expect, it } from 'vitest';

import { createEnemyField } from './enemies';
import type { EnemyField } from './enemies';
import { ENEMY_BULLET_LEAD, ENEMY_STATS } from '../entities';
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
    field.spawn('small', 'dive', { x: 200, y: -40 });

    expect(field.bodies()[0].position.y).toBeLessThan(0);
  });

  it('is on the physics world, ready for #6 to collide with', () => {
    field.spawn('medium', 'dive', { x: 200, y: -40 });

    expect(engine.world.bodies).toHaveLength(1);
  });

  it('reports its kind, so the roster knows which silhouette to draw', () => {
    field.spawn('large', 'dive', { x: 100, y: -40 });

    expect(field.records()).toEqual([{ id: field.bodies()[0].id, kind: 'large' }]);
  });
});

describe('enemies · movement', () => {
  it('flies down the field', () => {
    field.spawn('small', 'dive', { x: 200, y: -40 });

    const before = field.bodies()[0].position.y;

    run(0.5);

    expect(field.bodies()[0].position.y).toBeGreaterThan(before);
  });

  it('flies straight on a dive', () => {
    field.spawn('small', 'dive', { x: 200, y: -40 });
    run(1);

    expect(field.bodies()[0].position.x).toBe(200);
  });

  // Trajectory belongs to the path now, not to the kind — so the same
  // silhouette flies straight or weaves depending only on what it was given.
  it('follows the path it was given, not its kind', () => {
    field.spawn('medium', 'weave', { x: 200, y: -40 });
    run(1);

    expect(field.bodies()[0].position.x).not.toBe(200);
  });

  it('flies any kind on any path', () => {
    field.spawn('large', 'weave', { x: 200, y: -40 });
    run(1);

    expect(field.bodies()[0].position.x).not.toBe(200);
  });

  it('goes faster when the round says so', () => {
    field.spawn('small', 'dive', { x: 100, y: -40 });
    run(0.5);

    const even = field.bodies()[0].position.y;

    field.clear();
    field.spawn('small', 'dive', { x: 100, y: -40 });
    run(0.5, { speed: 3, power: 1 });

    expect(field.bodies()[0].position.y).toBeGreaterThan(even * 2);
  });
});

describe('enemies · leaving', () => {
  it('is culled once it passes the bottom edge', () => {
    field.spawn('small', 'dive', { x: 200, y: -40 });

    let changed = false;

    for (let tick = 0; tick < 60 * 12; tick += 1) {
      changed = field.advance(1 / 60, EVEN).changed || changed;
    }

    expect(changed).toBe(true);
    expect(field.count()).toBe(0);
  });

  it('takes its body out of the physics world with it', () => {
    field.spawn('small', 'dive', { x: 200, y: -40 });

    for (let tick = 0; tick < 60 * 12; tick += 1) {
      field.advance(1 / 60, EVEN);
    }

    expect(engine.world.bodies).toHaveLength(0);
  });

  it('reports no change on a frame where nobody left', () => {
    field.spawn('small', 'dive', { x: 200, y: -40 });

    expect(field.advance(1 / 60, EVEN).changed).toBe(false);
  });
});

describe('enemies · firing', () => {
  // The cadence starts on arrival, so a craft cannot show up with its first
  // volley already charged.
  it('does not charge its cadence while still above the field', () => {
    field.spawn('small', 'dive', { x: 200, y: -40 });

    // Long enough to have earned a shot, if it had been counting.
    field.advance(ENEMY_STATS.small.fireInterval, EVEN);

    expect(field.bodies()[0].position.y).toBeGreaterThan(0);
    expect(field.advance(1 / 60, EVEN).shots).toHaveLength(0);
  });

  it('fires once it is on the field and the interval has passed', () => {
    field.spawn('small', 'dive', { x: 200, y: -40 });
    run(1);

    let fired = 0;

    for (let tick = 0; tick < 60 * 3; tick += 1) {
      fired += field.advance(1 / 60, EVEN).shots.length;
    }

    expect(fired).toBeGreaterThan(0);
  });

  it('fires the pattern its kind carries', () => {
    field.spawn('large', 'dive', { x: 200, y: -40 });
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
    field.spawn('small', 'dive', { x: 200, y: -40 });
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
    field.spawn('small', 'dive', { x: 200, y: -40 });
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
    field.spawn('small', 'dive', { x: 100, y: -40 });
    field.spawn('large', 'dive', { x: 300, y: -40 });
    field.clear();

    expect(field.count()).toBe(0);
    expect(field.records()).toHaveLength(0);
  });
});

describe('enemies · the field stays inside its bounds', () => {
  it('never carries an enemy past the bottom without culling it', () => {
    field.spawn('large', 'dive', { x: 270, y: -40 });

    for (let tick = 0; tick < 60 * 30; tick += 1) {
      field.advance(1 / 60, EVEN);

      for (const body of field.bodies()) {
        expect(body.position.y).toBeLessThan(FIELD_HEIGHT + 100);
      }
    }
  });
});

describe('enemies · taking damage', () => {
  it('survives a hit that does not finish it', () => {
    field.spawn('large', 'dive', { x: 200, y: -40 });

    const [enemy] = field.bodies();

    expect(field.damage(enemy.id, 1)).toBeNull();
    expect(field.count()).toBe(1);
  });

  it('reports where the wreck was when the hit kills it', () => {
    field.spawn('small', 'dive', { x: 200, y: -40 });

    const [enemy] = field.bodies();
    const wreck = field.damage(enemy.id, ENEMY_STATS.small.hp);

    expect(wreck).toEqual({ x: enemy.position.x, y: enemy.position.y });
    expect(field.count()).toBe(0);
  });

  it('takes the body out of the physics world with it', () => {
    field.spawn('small', 'dive', { x: 200, y: -40 });
    field.damage(field.bodies()[0].id, 999);

    expect(engine.world.bodies).toHaveLength(0);
  });

  // A bullet can reach an enemy that left the field on the same frame.
  it('ignores an id it does not know', () => {
    expect(field.damage(9999, 10)).toBeNull();
  });

  it('accumulates damage across hits', () => {
    field.spawn('medium', 'dive', { x: 200, y: -40 });

    const id = field.bodies()[0].id;
    const half = ENEMY_STATS.medium.hp / 2;

    expect(field.damage(id, half)).toBeNull();
    expect(field.damage(id, half)).not.toBeNull();
  });
});

describe('enemies · fire keeps up with the round', () => {
  /** Collect the first volley an enemy of this kind fires under these boosts. */
  function firstVolley(kind: 'small' | 'medium' | 'large', speed: number) {
    field.spawn(kind, 'dive', { x: 200, y: -40 });

    for (let tick = 0; tick < 60 * 20; tick += 1) {
      const { shots } = field.advance(1 / 60, { speed, power: 1 });

      if (shots.length > 0) {
        return shots;
      }
    }

    return [];
  }

  // Bullet speed was a constant while enemy speed scaled with the round, so a
  // late-round enemy overtook its own fire — a broken enemy, not a hard one.
  it.each(['small', 'medium', 'large'] as const)(
    'never lets a %s enemy outrun its own bullets',
    (kind) => {
      for (const speed of [1, 2, 3]) {
        const [shot] = firstVolley(kind, speed);
        const craft = ENEMY_STATS[kind].speed * speed;

        expect(Math.hypot(shot.vx, shot.vy))
          .toBeGreaterThanOrEqual(craft * ENEMY_BULLET_LEAD);

        field.clear();
      }
    },
  );

  // A faster craft crosses the field sooner, so a fixed cadence means fewer
  // volleys — scaling speed would *reduce* the pressure it applies.
  it('fires as many times on a fast pass as on a slow one', () => {
    const passes = (speed: number): number => {
      field.clear();
      field.spawn('small', 'dive', { x: 200, y: -40 });

      let volleys = 0;

      for (let tick = 0; tick < 60 * 30 && field.count() > 0; tick += 1) {
        volleys += field.advance(1 / 60, { speed, power: 1 }).shots.length > 0 ? 1 : 0;
      }

      return volleys;
    };

    const slow = passes(1);
    const fast = passes(3);

    expect(slow).toBeGreaterThan(1);
    expect(fast).toBeGreaterThanOrEqual(slow - 1);
  });
});
