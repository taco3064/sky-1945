import type { BulletSpawn, PatternKind, PatternOptions } from './types';

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

/** A fan centred on the heading. Read as a threat, it says "move sideways". */
function spread(options: PatternOptions): BulletSpawn[] {
  const step = SPREAD_ARC / (SPREAD_COUNT - 1);
  const first = options.heading - SPREAD_ARC / 2;

  return Array.from(
    { length: SPREAD_COUNT },
    (_unused, index) => shotAt(options, first + step * index),
  );
}

/** The full circle, evenly divided. Says "there is no sideways": see #10. */
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
