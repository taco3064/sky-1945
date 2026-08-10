/**
 * Bullet trajectories, as pure arithmetic.
 *
 * This module builds no bodies and touches no physics — it turns "fire a
 * spread from here" into a list of positions and velocities. That is what
 * keeps it below `entities` in the engine's own dependency order: entities
 * needs these types to describe what it is creating, so this module must not
 * need entities back (`cycles` is an error, and rightly).
 */

/** Which shape a volley takes. */
export type PatternKind = 'straight' | 'spread' | 'radial';

/** Whose bullet it is — decides what it can hit (#6) and how it is drawn. */
export type Side = 'player' | 'enemy';

/** Everything needed to put one bullet into the world. */
export interface BulletSpawn {
  x: number;
  y: number;
  /** World units per second. */
  vx: number;
  vy: number;
  damage: number;
  side: Side;
}

export interface PatternOptions {
  kind: PatternKind;
  /** Muzzle position, in world units. */
  x: number;
  y: number;
  /** Bullet speed, world units per second. */
  speed: number;
  /** Damage per bullet, already multiplied by the power boost. */
  damage: number;
  side: Side;
  /** Which way the volley faces, in degrees. 90 is down the screen. */
  heading: number;
}

/** How many bullets a spread throws, and how wide it opens. */
const SPREAD_COUNT = 5;
const SPREAD_ARC = 60;

/** A radial burst covers the full circle. */
const RADIAL_COUNT = 10;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function shotAt(options: PatternOptions, degrees: number): BulletSpawn {
  const radians = toRadians(degrees);

  return {
    x: options.x,
    y: options.y,
    vx: Math.cos(radians) * options.speed,
    vy: Math.sin(radians) * options.speed,
    damage: options.damage,
    side: options.side,
  };
}

/** One bullet, straight along the heading. */
function straight(options: PatternOptions): BulletSpawn[] {
  return [shotAt(options, options.heading)];
}

/**
 * A fan centred on the heading.
 *
 * Read as a threat it says "move sideways", where a straight shot says "move
 * a little" — which is the point of having more than one pattern.
 */
function spread(options: PatternOptions): BulletSpawn[] {
  const step = SPREAD_ARC / (SPREAD_COUNT - 1);
  const first = options.heading - SPREAD_ARC / 2;

  return Array.from(
    { length: SPREAD_COUNT },
    (_unused, index) => shotAt(options, first + step * index),
  );
}

/**
 * The full circle, evenly divided.
 *
 * Says "there is no sideways" — the answer is the gap between two bullets, or
 * a roll (#10) straight through.
 */
function radial(options: PatternOptions): BulletSpawn[] {
  const step = 360 / RADIAL_COUNT;

  return Array.from(
    { length: RADIAL_COUNT },
    (_unused, index) => shotAt(options, step * index),
  );
}

const PATTERNS: Record<PatternKind, (options: PatternOptions) => BulletSpawn[]> = {
  straight,
  spread,
  radial,
};

/** Build a volley. The only entry — callers name a kind, not a function. */
export function shotsFor(options: PatternOptions): BulletSpawn[] {
  return PATTERNS[options.kind](options);
}

/** How many bullets a kind produces, for pricing a wave before it fires. */
export const PATTERN_SIZE: Record<PatternKind, number> = {
  straight: 1,
  spread: SPREAD_COUNT,
  radial: RADIAL_COUNT,
};
