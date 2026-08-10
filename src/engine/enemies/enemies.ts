import { Body, Composite } from 'matter-js';
import type { Engine } from 'matter-js';

import {
  ENEMY_BULLET_SPEED,
  ENEMY_STATS,
  createEnemy,
  enemyMuzzleOffset,
} from '../entities';
import type { EnemyKind } from '../entities';
import { isOutside } from '../field';
import { shotsFor } from '../patterns';
import type { BulletSpawn } from '../patterns';

/**
 * Every enemy on the field: how it moves, when it fires, and when it is gone.
 *
 * Enemies cannot be killed yet — nothing collides with anything until #6.
 * They fly in, shoot, and leave through the bottom edge, which is enough to
 * judge wave rhythm and the difficulty curve on screen.
 */

/** Enemies drift this far below the field before being culled. */
const CULL_MARGIN = 60;

/** Down the screen, in the degrees `patterns` speaks. */
const DOWNWARD = 90;

/** Per-enemy state the physics body has no place for. */
interface Flight {
  kind: EnemyKind;
  /** Where it entered, which its sway oscillates around. */
  originX: number;
  /** Seconds since it appeared — drives both sway and cadence. */
  age: number;
  sinceShot: number;
}

export interface EnemyRecord {
  id: number;
  kind: EnemyKind;
}

/** One frame's worth of conditions, so a per-enemy step takes two arguments. */
interface Tick {
  elapsed: number;
  boosts: EnemyBoosts;
}

/** What one enemy did with a frame. */
interface Step {
  gone: boolean;
  shots: BulletSpawn[];
}

/** A point on the field. */
interface Vector {
  x: number;
  y: number;
}

/** Nothing happened: still on the field, nothing fired. */
const IDLE: Step = { gone: false, shots: [] };

export interface EnemyAdvance {
  /** True if any enemy left the field — the roster changed. */
  changed: boolean;
  /** Volleys fired this frame, for the bullet field to carry. */
  shots: BulletSpawn[];
}

export interface EnemyBoosts {
  /** Multiplies movement speed. From the round, not from a loadout. */
  speed: number;
  /** Multiplies bullet damage. */
  power: number;
}

export interface EnemyField {
  /** Put one on the field, entering above the top edge. */
  spawn: (kind: EnemyKind, x: number) => void;
  /** Move everyone, fire what is due, cull what has left. */
  advance: (elapsed: number, boosts: EnemyBoosts) => EnemyAdvance;
  /** Live bodies, for publishing transforms. */
  bodies: () => Body[];
  /** Live enemies and their kind, for the roster. */
  records: () => EnemyRecord[];
  /** How many are on the field. */
  count: () => number;
  /** Forget everyone. */
  clear: () => void;
}

export function createEnemyField(engine: Engine): EnemyField {
  const live = new Map<number, Body>();
  const flights = new Map<number, Flight>();

  /** Sway is a function of age, so an enemy never drifts off course. */
  const positionFor = (flight: Flight, body: Body, distance: number): Vector => {
    const stats = ENEMY_STATS[flight.kind];

    const offset = stats.sway === 0
      ? 0
      : Math.sin(flight.age * stats.swayRate * Math.PI * 2) * stats.sway;

    return { x: flight.originX + offset, y: body.position.y + distance };
  };

  const volleyFrom = (flight: Flight, body: Body, power: number): BulletSpawn[] => {
    const stats = ENEMY_STATS[flight.kind];

    return shotsFor({
      kind: stats.pattern,
      x: body.position.x,
      y: body.position.y + enemyMuzzleOffset(flight.kind),
      speed: ENEMY_BULLET_SPEED,
      damage: stats.damage * power,
      side: 'enemy',
      heading: DOWNWARD,
    });
  };

  /** One enemy, one frame: move, decide whether it is gone, fire if due. */
  const advanceOne = (body: Body, tick: Tick): Step => {
    const flight = flights.get(body.id) as Flight;
    const stats = ENEMY_STATS[flight.kind];
    const travel = stats.speed * tick.boosts.speed * tick.elapsed;

    flight.age += tick.elapsed;

    const next = positionFor(flight, body, travel);

    if (isOutside(next.x, next.y, CULL_MARGIN)) {
      return { gone: true, shots: [] };
    }

    Body.setPosition(body, next);

    // The cadence starts when the enemy reaches the field, not when it spawns
    // above it — otherwise its first volley is already part-way charged on
    // arrival, and a bullet can appear from a craft nobody has seen yet.
    if (next.y <= 0) {
      return IDLE;
    }

    flight.sinceShot += tick.elapsed;

    if (flight.sinceShot < stats.fireInterval) {
      return IDLE;
    }

    flight.sinceShot = 0;

    return { gone: false, shots: volleyFrom(flight, body, tick.boosts.power) };
  };

  const cull = (ids: number[]): void => {
    for (const id of ids) {
      Composite.remove(engine.world, live.get(id) as Body);
      live.delete(id);
      flights.delete(id);
    }
  };

  return {
    spawn(kind, x) {
      const enemy = createEnemy(kind, x, -ENEMY_STATS[kind].radius);

      live.set(enemy.id, enemy);
      flights.set(enemy.id, { kind, originX: x, age: 0, sinceShot: 0 });
      Composite.add(engine.world, enemy);
    },

    advance(elapsed, boosts) {
      const gone: number[] = [];
      const shots: BulletSpawn[] = [];
      const tick = { elapsed, boosts };

      for (const body of live.values()) {
        const step = advanceOne(body, tick);

        if (step.gone) {
          gone.push(body.id);
        }

        shots.push(...step.shots);
      }

      cull(gone);

      return { changed: gone.length > 0, shots };
    },

    bodies: () => [...live.values()],

    records: () => [...live.values()].map((body) => ({
      id: body.id,
      kind: (flights.get(body.id) as Flight).kind,
    })),

    count: () => live.size,

    clear() {
      live.clear();
      flights.clear();
    },
  };
}
