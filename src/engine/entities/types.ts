import type { PatternKind } from '../patterns';

/** What a bullet carries beyond its position. */
export interface BulletPayload {
  damage: number;
  vx: number;
  vy: number;
}

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
