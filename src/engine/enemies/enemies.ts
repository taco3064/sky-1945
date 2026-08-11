import { Body, Composite } from 'matter-js';
import type { Engine } from 'matter-js';

import {
  ENEMY_BULLET_LEAD,
  ENEMY_BULLET_SPEED,
  ENEMY_STATS,
  createEnemy,
  enemyMuzzleOffset,
} from '../entities';
import type { EnemyKind } from '../entities';
import { isOutside } from '../field';
import type { Point } from '../field';
import { shotsFor } from '../patterns';
import type { BulletSpawn } from '../patterns';
import { positionOn } from '../paths';
import type { Edge, PathKind } from '../paths';

/**
 * Every enemy on the field: how far along its path it is, when it fires, and
 * when it is gone.
 *
 * Where a craft flies is not this module's business — it hands its entry point,
 * distance covered and age to `../paths` and puts the body wherever that says.
 * That split is what lets any silhouette arrive on any trajectory.
 */

/** Enemies drift this far outside the field before being culled. */
const CULL_MARGIN = 60;

/** Down the screen, in the degrees `patterns` speaks. */
const DOWNWARD = 90;

/**
 * One craft to put on the field.
 *
 * Defined here rather than by the director because this is the side that has to
 * be able to fly it — the scheduler produces these, and a structurally identical
 * type on that side would be the same contract written twice.
 */
export interface EnemySpec {
  kind: EnemyKind;
  /** Which shape it flies. */
  path: PathKind;
  /** Which edge it came in from, which sets its direction of travel. */
  edge: Edge;
  /** Where it entered, which its path measures from. */
  entry: Point;
}

/** Per-enemy state the physics body has no place for. */
interface Flight {
  kind: EnemyKind;
  /** Remaining hit points. Never leaves the engine — see EnemyStats.hp. */
  hp: number;
  path: PathKind;
  edge: Edge;
  /** Where it came in, which its path measures from. */
  entry: Point;
  /** Distance covered along the path, in world units. */
  travelled: number;
  /** Seconds since it entered — what an oscillating path is a function of. */
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
  /** Put one on the field, entering where its edge and path say it starts. */
  spawn: (spec: EnemySpec) => void;
  /**
   * Subtract hit points.
   *
   * Returns where the wreck was if that killed it, and null otherwise — so the
   * caller can put a burst there without asking a second question. An unknown
   * id is null too: a bullet can reach an enemy that left the field on the same
   * frame.
   */
  damage: (id: number, amount: number) => Point | null;
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

/**
 * A volley, with its speed tied to the shooter's.
 *
 * Always at least ENEMY_BULLET_LEAD times faster than the craft that fired it,
 * so no amount of difficulty scaling lets an enemy overtake its own shot.
 */
function volleyFrom(flight: Flight, body: Body, boosts: EnemyBoosts): BulletSpawn[] {
  const stats = ENEMY_STATS[flight.kind];
  const travel = stats.speed * boosts.speed;

  // A radial burst leaves the centre; an aimed shape leaves the nose. Same rule as
  // the boss, and it was wrong here for the same reason — a ring centred on the
  // muzzle sits below the craft that threw it. Far less visible on a 78-unit
  // silhouette than on one rolled to twice that, which is why the boss found it.
  const reach = stats.pattern === 'radial' ? 0 : enemyMuzzleOffset(flight.kind);

  return shotsFor({
    kind: stats.pattern,
    x: body.position.x,
    y: body.position.y + reach,
    speed: Math.max(ENEMY_BULLET_SPEED, travel * ENEMY_BULLET_LEAD),
    damage: stats.damage * boosts.power,
    side: 'enemy',
    heading: DOWNWARD,
  });
}

export function createEnemyField(engine: Engine): EnemyField {
  const live = new Map<number, Body>();
  const flights = new Map<number, Flight>();

  /** One enemy, one frame: move along its path, cull if gone, fire if due. */
  const advanceOne = (body: Body, tick: Tick): Step => {
    const flight = flights.get(body.id) as Flight;
    const stats = ENEMY_STATS[flight.kind];

    flight.age += tick.elapsed;
    flight.travelled += stats.speed * tick.boosts.speed * tick.elapsed;

    const next = positionOn(flight.path, flight);

    if (isOutside(next.x, next.y, CULL_MARGIN)) {
      return { gone: true, shots: [] };
    }

    Body.setPosition(body, next);

    // The cadence starts when the enemy reaches the field, not when it spawns
    // outside it — otherwise its first volley is already part-way charged on
    // arrival, and a bullet can appear from a craft nobody has seen yet.
    if (next.y <= 0) {
      return IDLE;
    }

    flight.sinceShot += tick.elapsed;

    // Scaled by the round's speed, so a faster craft fires proportionally more
    // often — otherwise going faster means applying *less* pressure, because it
    // leaves the field sooner.
    if (flight.sinceShot < stats.fireInterval / tick.boosts.speed) {
      return IDLE;
    }

    flight.sinceShot = 0;

    return { gone: false, shots: volleyFrom(flight, body, tick.boosts) };
  };

  const cull = (ids: number[]): void => {
    for (const id of ids) {
      Composite.remove(engine.world, live.get(id) as Body);
      live.delete(id);
      flights.delete(id);
    }
  };

  return {
    spawn({ kind, path, edge, entry }) {
      const enemy = createEnemy(kind, entry.x, entry.y);

      live.set(enemy.id, enemy);

      flights.set(enemy.id, {
        kind,
        hp: ENEMY_STATS[kind].hp,
        path,
        edge,
        entry,
        travelled: 0,
        age: 0,
        sinceShot: 0,
      });

      Composite.add(engine.world, enemy);
    },

    damage(id, amount) {
      const flight = flights.get(id);
      const body = live.get(id);

      if (!flight || !body) {
        return null;
      }

      flight.hp -= amount;

      if (flight.hp > 0) {
        return null;
      }

      const wreck = { x: body.position.x, y: body.position.y };

      cull([id]);

      return wreck;
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
      for (const body of live.values()) {
        Composite.remove(engine.world, body);
      }

      live.clear();
      flights.clear();
    },
  };
}
