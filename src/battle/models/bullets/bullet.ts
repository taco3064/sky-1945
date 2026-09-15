import { isOutsideBy } from '../field'
import { headingVelocity } from '../field'

export type BulletSide = 'player' | 'enemy'

/** Hit circle radius of every bullet, both sides (game-spec 10.1, 10.2). */
export const BULLET_HIT_RADIUS = 4

/** A bullet is removed once outside the field by more than this. */
export const BULLET_EXIT_MARGIN = 24

export interface Bullet {
  readonly id: number
  readonly side: BulletSide
  x: number
  y: number
  /** Fixed for the bullet's life. */
  readonly vx: number
  readonly vy: number
  readonly damage: number
}

export interface BulletLaunch {
  side: BulletSide
  x: number
  y: number
  heading: number
  speed: number
  damage: number
}

export function createBullet(id: number, { side, x, y, heading, speed, damage }: BulletLaunch): Bullet {
  const velocity = headingVelocity(heading, speed)
  return { id, side, x, y, vx: velocity.x, vy: velocity.y, damage }
}

/** Moves a bullet in a straight line at constant velocity. */
export function moveBullet(bullet: Bullet, dt: number): void {
  bullet.x += bullet.vx * dt
  bullet.y += bullet.vy * dt
}

export function hasBulletLeft(bullet: Bullet): boolean {
  return isOutsideBy(bullet, BULLET_EXIT_MARGIN)
}
