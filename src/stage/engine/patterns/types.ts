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
