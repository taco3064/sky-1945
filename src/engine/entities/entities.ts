import { Bodies } from 'matter-js';
import type { Body } from 'matter-js';

import type { BulletSpawn, PatternKind } from '../patterns';

/* ---------------------------------------------------------------- player */

/** The player's collision circle, in world units. A dot, not the sprite: see #6. */
export const PLAYER_HIT_RADIUS = 3;

/** World units per second at 100% speed — before the loadout's multiplier. */
export const PLAYER_BASE_SPEED = 300;

/** How close to the field edge the player may get. Roughly half a sprite. */
export const PLAYER_BOUNDS_INSET = 24;

/** Where the player flies to and holds station, measured up from the bottom. */
export const PLAYER_START_INSET = 160;

/** Where the aircraft comes in from, fully below the bottom edge. */
export const PLAYER_ENTRY_INSET = -60;

/** How fast it flies in. Brisker than the player's own speed — it is a cue. */
export const PLAYER_ENTRY_SPEED = 620;

/** The player's body: a sensor with no air friction, driven straight from input. */
export function createPlayer(x: number, y: number): Body {
  return Bodies.circle(x, y, PLAYER_HIT_RADIUS, {
    label: 'player',
    isSensor: true,
    frictionAir: 0,
  });
}

/* --------------------------------------------------------------- bullets */

/** Bullets are small, and generous to hit with. */
export const BULLET_HIT_RADIUS = 4;

/** World units per second. Fast enough to feel instant across a 960-unit field. */
export const BULLET_SPEED = 780;

/** The floor on enemy fire — slower than the player's, so it can be read. */
export const ENEMY_BULLET_SPEED = 260;

/** How much faster than its shooter a bullet must travel. */
export const ENEMY_BULLET_LEAD = 1.5;

/** Damage before the loadout's power multiplier. */
export const BULLET_BASE_DAMAGE = 7.5;

/** How many volleys a second the player throws. The guns never stop. */
const PLAYER_VOLLEYS_PER_SECOND = 7.5;

/** Seconds between the player's volleys. Two shots leave on each one. */
export const PLAYER_FIRE_INTERVAL = 1 / PLAYER_VOLLEYS_PER_SECOND;

/** How far ahead of the player's centre a shot appears. */
export const PLAYER_MUZZLE_OFFSET = 26;

/** How far either side of centre the two cannons sit. They fire parallel. */
export const PLAYER_WING_SPAN = 13;

/** What a bullet carries beyond its position. */
interface BulletPayload {
  damage: number;
  vx: number;
  vy: number;
}

/** A bullet, with its damage and velocity baked in at spawn. */
export function createBullet(spawn: BulletSpawn): Body {
  const bullet = Bodies.circle(spawn.x, spawn.y, BULLET_HIT_RADIUS, {
    label: spawn.side === 'player' ? 'player-bullet' : 'enemy-bullet',
    isSensor: true,
    frictionAir: 0,
  });

  // Matter carries arbitrary data on `plugin`: where game values go, not physics.
  const payload: BulletPayload = {
    damage: spawn.damage,
    vx: spawn.vx,
    vy: spawn.vy,
  };

  bullet.plugin = payload;

  return bullet;
}

/** Reads back what {@link createBullet} baked in. */
export function damageOf(body: Body): number {
  return (body.plugin as Partial<BulletPayload>).damage ?? 0;
}

/** The velocity a pattern gave this bullet, in world units per second. */
export function velocityOf(body: Body): { vx: number; vy: number } {
  const payload = body.plugin as Partial<BulletPayload>;

  return { vx: payload.vx ?? 0, vy: payload.vy ?? 0 };
}

/* --------------------------------------------------------------- enemies */

export type EnemyKind = 'small' | 'medium' | 'large';

export interface EnemyStats {
  /** Collision radius, in world units. */
  radius: number;
  /** How much damage it takes to kill. Never leaves the engine. */
  hp: number;
  /** Downward speed at 100%, world units per second. */
  speed: number;
  /** Bullet damage at 100%. */
  damage: number;
  /** Seconds between volleys at 100%. Divided by the round's speed boost. */
  fireInterval: number;
  /** Which trajectory its fire takes. */
  pattern: PatternKind;
}

/** The three silhouettes. Where each one flies is a path, not a stat. */
export const ENEMY_STATS: Record<EnemyKind, EnemyStats> = {
  small: {
    hp: 20,
    radius: 13,
    speed: 165,
    damage: 8,
    fireInterval: 1.1,
    pattern: 'straight',
  },
  medium: {
    hp: 60,
    radius: 20,
    speed: 115,
    damage: 10,
    fireInterval: 1.6,
    pattern: 'spread',
  },
  large: {
    hp: 160,
    radius: 32,
    speed: 72,
    damage: 12,
    fireInterval: 2.2,
    pattern: 'radial',
  },
};

/** Where a volley leaves an enemy — its nose, which points down the screen. */
export function enemyMuzzleOffset(kind: EnemyKind): number {
  return ENEMY_STATS[kind].radius + 6;
}

/** An enemy body. A sensor, like everything else here. */
export function createEnemy(kind: EnemyKind, x: number, y: number): Body {
  return Bodies.circle(x, y, ENEMY_STATS[kind].radius, {
    label: `enemy-${kind}`,
    isSensor: true,
    frictionAir: 0,
    // Nose down. On the body, so drawing it costs no wrapper node.
    angle: Math.PI,
  });
}

/* ------------------------------------------------------------------- boss */

/** The boss's numbers. Not a fourth `ENEMY_STATS`: every field would differ. */
export const BOSS_STATS = {
  /** Collision radius. Large, and honestly so — there is no dodging past it. */
  radius: 52,
  /** Hit points in round 1. `../boss` scales this with the round. */
  hp: 900,
  /** World units per second while patrolling. Flying in is `BOSS_ENTRY_SPEED`. */
  speed: 90,
  /** Damage per bullet at 100%. */
  damage: 14,
};

/** How large a boss can be rolled, as a multiple of `BOSS_STATS`. */
export const BOSS_SCALE_MIN = 0.8;
export const BOSS_SCALE_MAX = 2;

/** A size for a fresh boss. Randomness at the boundary, arithmetic inside. */
export function rollBossScale(): number {
  return BOSS_SCALE_MIN + Math.random() * (BOSS_SCALE_MAX - BOSS_SCALE_MIN);
}

/** The altitude it settles at: high enough to leave the player room to work. */
export const BOSS_ALTITUDE = 150;

/** How fast the boss flies in. Deliberately quick — the arrival is a cue. */
export const BOSS_ENTRY_SPEED = 420;

/** The beam's footprint. Long enough to reach past the bottom edge. */
export const BEAM_WIDTH = 88;
export const BEAM_LENGTH = 1000;

/** The boss's body, at the size it was rolled. A sensor and nose-down. */
export function createBoss(x: number, y: number, scale: number): Body {
  return Bodies.circle(x, y, BOSS_STATS.radius * scale, {
    label: 'enemy-boss',
    isSensor: true,
    frictionAir: 0,
    angle: Math.PI,
  });
}

/** How far ahead of the boss's centre its aimed fire appears, at scale 1. */
const BOSS_MUZZLE_REACH = 66;

export function bossMuzzleOffset(scale: number): number {
  return BOSS_MUZZLE_REACH * scale;
}

/** The beam's body: one rectangle hanging from the nose, not a wall of bullets. */
export function createBeam(x: number, y: number): Body {
  return Bodies.rectangle(x, y + BEAM_LENGTH / 2, BEAM_WIDTH, BEAM_LENGTH, {
    label: 'enemy-beam',
    isSensor: true,
    frictionAir: 0,
  });
}
