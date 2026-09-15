import { describe, expect, it } from 'vitest';
import { ENEMY_ANGLE, createEnemy, damageEnemy, updateEnemy } from './enemy';
import type { Squad } from './waves';

const PASS = 1 / 240;

function squad(overrides: Partial<Squad>): Squad {
  return {
    slot: 0,
    time: 0,
    kind: 'small',
    path: 'dive',
    edge: 'top',
    lanes: [0.5],
    entries: [{ x: 270, y: -40 }],
    ...overrides,
  };
}

function ids() {
  let id = 0;

  return () => ++id;
}

it('is turned over by 180°', () => {
  expect(ENEMY_ANGLE).toBe(180);
});

describe('appearing', () => {
  it('starts at its lane entry with full HP and clocks at 0', () => {
    const enemy = createEnemy(5, squad({ kind: 'medium', lanes: [0.2, 0.4], entries: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }), 1);

    expect(enemy).toEqual({
      id: 5,
      kind: 'medium',
      path: 'dive',
      edge: 'top',
      entry: { x: 3, y: 4 },
      x: 3,
      y: 4,
      hp: 60,
      age: 0,
      travelled: 0,
      fireTimer: 0,
    });
  });
});

describe('moving', () => {
  it('advances age and travels speed × m × dt along its path', () => {
    const enemy = createEnemy(1, squad({ kind: 'large' }), 0);

    updateEnemy(enemy, 0.5, 1.5, ids());

    expect(enemy.age).toBe(0.5);
    expect(enemy.travelled).toBeCloseTo(72 * 1.5 * 0.5, 9);
    expect([enemy.x, enemy.y]).toEqual([270, -40 + 54]);
  });
});

describe('leaving', () => {
  it('is removed once outside by more than 60 u, without firing', () => {
    const enemy = createEnemy(1, squad({}), 0);

    enemy.travelled = 1059;

    expect(updateEnemy(enemy, PASS, 1, ids()).left).toBe(false);
    expect(enemy.y).toBeLessThanOrEqual(1020);
    enemy.fireTimer = 5;
    const pass = updateEnemy(enemy, 0.1, 1, ids());

    expect(enemy.y).toBeGreaterThan(1020);
    expect(pass).toEqual({ left: true, bullets: [] });
  });
});

describe('firing', () => {
  it('runs the timer only while y > 0', () => {
    const enemy = createEnemy(1, squad({}), 0);

    updateEnemy(enemy, 0.2, 1, ids());

    expect(enemy.y).toBeLessThan(0);
    expect(enemy.fireTimer).toBe(0);
  });

  it('flies speed × interval inside the field before its first volley, whatever the round', () => {
    for (const m of [1, 1.3, 2]) {
      const enemy = createEnemy(1, squad({ edge: 'left', entries: [{ x: -40, y: 300 }] }), 0);
      let travelledAtFire = 0;

      for (let pass = 0; pass < 2000 && !travelledAtFire; pass++) {
        if (updateEnemy(enemy, PASS, m, ids()).bullets.length) {
          travelledAtFire = enemy.travelled;
        }
      }

      expect(travelledAtFire).toBeGreaterThanOrEqual(181.5);
      expect(travelledAtFire).toBeLessThan(181.5 + 165 * m * PASS * 1.01);
    }
  });

  it('resets the timer to 0 after a volley, dropping the remainder', () => {
    const enemy = createEnemy(1, squad({ edge: 'left', entries: [{ x: -40, y: 300 }] }), 0);

    updateEnemy(enemy, 1.25, 1, ids());

    expect(enemy.fireTimer).toBe(0);
  });

  it('fires ENEMY-S straight from its nose, 19 u ahead', () => {
    const enemy = createEnemy(1, squad({ kind: 'small', edge: 'left', entries: [{ x: -40, y: 300 }] }), 0);

    const { bullets } = updateEnemy(enemy, 1.1, 1.1, ids());

    expect(bullets.length).toBe(1);
    expect(bullets[0]).toMatchObject({ side: 'enemy', x: enemy.x, y: enemy.y + 19, damage: 8.8 });
    expect(bullets[0].vy).toBeCloseTo(272.25, 9);
  });

  it('fires an ENEMY-M spread from its nose, 26 u ahead', () => {
    const enemy = createEnemy(1, squad({ kind: 'medium', edge: 'left', entries: [{ x: -40, y: 300 }] }), 0);

    const { bullets } = updateEnemy(enemy, 1.6, 1, ids());

    expect(bullets.length).toBe(5);
    expect(bullets.every((bullet) => bullet.y === enemy.y + 26 && bullet.damage === 10)).toBe(true);
    expect(Math.hypot(bullets[0].vx, bullets[0].vy)).toBeCloseTo(260, 9);
  });

  it('fires an ENEMY-L radial ring from its centre', () => {
    const enemy = createEnemy(1, squad({ kind: 'large', edge: 'left', entries: [{ x: -40, y: 300 }] }), 0);

    const { bullets } = updateEnemy(enemy, 2.2, 1, ids());

    expect(bullets.length).toBe(10);
    expect(bullets.every((bullet) => bullet.x === enemy.x && bullet.y === enemy.y && bullet.damage === 12)).toBe(true);
  });
});

describe('hits', () => {
  it('is destroyed once HP reaches 0 or below', () => {
    const enemy = createEnemy(1, squad({}), 0);

    expect(damageEnemy(enemy, 11.25)).toBe(false);
    expect(damageEnemy(enemy, 8.75)).toBe(true);
    expect(enemy.hp).toBe(0);
  });
});
