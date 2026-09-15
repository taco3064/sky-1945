import type { FirePattern } from '~app/bullets/lib/patterns'

export type EnemyKind = 'small' | 'medium' | 'large'

export interface EnemyKindStats {
  hp: number
  radius: number
  /** u/s before the round multiplier. */
  speed: number
  /** Per bullet, before the round multiplier. */
  damage: number
  /** Seconds between volleys, before the round multiplier. */
  interval: number
  pattern: FirePattern
}

/** ENEMY-S / M / L (game-spec 12.8). */
export const ENEMY_KINDS: Record<EnemyKind, EnemyKindStats> = {
  small: { hp: 20, radius: 13, speed: 165, damage: 8, interval: 1.1, pattern: 'straight' },
  medium: { hp: 60, radius: 20, speed: 115, damage: 10, interval: 1.6, pattern: 'spread' },
  large: { hp: 160, radius: 32, speed: 72, damage: 12, interval: 2.2, pattern: 'radial' },
}

const MIN_BULLET_SPEED = 260
const BULLET_SPEED_FACTOR = 1.5

/** Movement speed × m. */
export function enemyMoveSpeed(kind: EnemyKind, m: number): number {
  return ENEMY_KINDS[kind].speed * m
}

/** Fire interval ÷ m. */
export function enemyFireInterval(kind: EnemyKind, m: number): number {
  return ENEMY_KINDS[kind].interval / m
}

/** `max(260, speed × m × 1.5)`. */
export function enemyBulletSpeed(kind: EnemyKind, m: number): number {
  return Math.max(MIN_BULLET_SPEED, ENEMY_KINDS[kind].speed * m * BULLET_SPEED_FACTOR)
}

/** Bullet damage × m. */
export function enemyBulletDamage(kind: EnemyKind, m: number): number {
  return ENEMY_KINDS[kind].damage * m
}
