import type { Body } from 'matter-js';

import type { EnemyKind } from '../entities';
import type { Point } from '../field';
import type { Edge, PathKind } from '../paths';
import type { BulletSpawn } from '../patterns';

/** One craft to put on the field. The director produces these; this side flies them. */
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
export interface Flight {
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
export interface Tick {
  elapsed: number;
  boosts: EnemyBoosts;
}

/** What one enemy did with a frame. */
export interface Step {
  gone: boolean;
  shots: BulletSpawn[];
}

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
  /** Subtract hit points. Returns the wreck if that killed it; an unknown id is null. */
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
