import { Engine } from 'matter-js';
import { beforeEach, describe, expect, it } from 'vitest';

import { createBulletField } from './bullets';
import type { BulletField, Shot } from './bullets';
import { BULLET_SPEED, PLAYER_FIRE_INTERVAL, damageOf } from '../entities';

const SHOT: Shot = { allowed: true, x: 270, y: 800, damage: 25 };

let engine: Engine;
let field: BulletField;

beforeEach(() => {
  engine = Engine.create({ gravity: { x: 0, y: 0 } });
  field = createBulletField(engine);
});

describe('bullets · the cadence', () => {
  it('holds fire until an interval has passed', () => {
    expect(field.fire(PLAYER_FIRE_INTERVAL / 2, SHOT)).toBe(false);
    expect(field.ids()).toHaveLength(0);
  });

  it('fires on the interval', () => {
    expect(field.fire(PLAYER_FIRE_INTERVAL, SHOT)).toBe(true);
    expect(field.ids()).toHaveLength(1);
  });

  it('fires as many times as the elapsed time earned', () => {
    field.fire(PLAYER_FIRE_INTERVAL * 3, SHOT);

    expect(field.ids()).toHaveLength(3);
  });

  it('spawns where it was told, with the damage it was given', () => {
    field.fire(PLAYER_FIRE_INTERVAL, SHOT);

    const [bullet] = field.bodies();

    expect(bullet.position.x).toBe(270);
    expect(bullet.position.y).toBe(800);
    expect(damageOf(bullet)).toBe(25);
  });

  it('adds every bullet to the physics world, so collisions can see them', () => {
    field.fire(PLAYER_FIRE_INTERVAL * 2, SHOT);

    expect(engine.world.bodies).toHaveLength(2);
  });
});

describe('bullets · silenced by a roll', () => {
  const silenced: Shot = { ...SHOT, allowed: false };

  it('spawns nothing while the guns are silent', () => {
    expect(field.fire(PLAYER_FIRE_INTERVAL * 5, silenced)).toBe(false);
    expect(field.ids()).toHaveLength(0);
  });

  // The cadence keeps running while silent, so the first shot after a roll is
  // immediate — the roll costs its own duration of fire, not more.
  it('fires immediately once the guns come back', () => {
    field.fire(PLAYER_FIRE_INTERVAL, silenced);

    expect(field.fire(0, SHOT)).toBe(true);
  });

  // ...but capped at one interval, so a 1.2s roll does not bank twelve shots
  // and dump them in a single frame.
  it('does not bank up a burst during a long silence', () => {
    field.fire(PLAYER_FIRE_INTERVAL * 20, silenced);
    field.fire(0, SHOT);

    expect(field.ids()).toHaveLength(1);
  });
});

describe('bullets · flight', () => {
  it('travels up the field', () => {
    field.fire(PLAYER_FIRE_INTERVAL, SHOT);
    field.advance(0.1);

    const [bullet] = field.bodies();

    expect(bullet.position.y).toBeCloseTo(800 - BULLET_SPEED * 0.1, 5);
    expect(bullet.position.x).toBe(270);
  });

  it('keeps flying while on the field', () => {
    field.fire(PLAYER_FIRE_INTERVAL, SHOT);

    expect(field.advance(0.1)).toBe(false);
    expect(field.ids()).toHaveLength(1);
  });

  it('is dropped once it leaves the top edge', () => {
    field.fire(PLAYER_FIRE_INTERVAL, SHOT);

    expect(field.advance(2)).toBe(true);
    expect(field.ids()).toHaveLength(0);
  });

  // A body left in the Matter world after its bullet is gone is a leak the
  // collision phase keeps paying for, every frame, forever.
  it('removes the body from the physics world too', () => {
    field.fire(PLAYER_FIRE_INTERVAL, SHOT);
    field.advance(2);

    expect(engine.world.bodies).toHaveLength(0);
  });

  it('holds a steady count over a long run', () => {
    for (let i = 0; i < 600; i += 1) {
      field.fire(1 / 60, SHOT);
      field.advance(1 / 60);
    }

    // Field height / bullet speed × fire rate — a stable population, not a
    // number that climbs for as long as the game runs.
    expect(field.ids().length).toBeLessThan(20);
  });
});

describe('bullets · clear', () => {
  it('forgets everything', () => {
    field.fire(PLAYER_FIRE_INTERVAL * 3, SHOT);
    field.clear();

    expect(field.ids()).toHaveLength(0);
    expect(field.bodies()).toHaveLength(0);
  });
});
