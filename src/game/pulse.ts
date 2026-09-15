import { ENEMY_BULLET_RADIUS } from './enemies.ts'
import { PLAYER_HIT_RADIUS } from './player.ts'

export const PULSE_MAX = 100

const GRAZE_GAIN = 8
const GRAZE_RADIUS = 28
/** Closer than this an enemy bullet hits the player instead of grazing it. */
const HIT_DISTANCE = PLAYER_HIT_RADIUS + ENEMY_BULLET_RADIUS

/** PULSE after one graze, never above 100. */
export function grazePulse(pulse: number): number {
  return Math.min(pulse + GRAZE_GAIN, PULSE_MAX)
}

/** An enemy bullet grazes when its centre is within 28 u of the player's but outside the 7 u hit distance. */
export function isGraze(distance: number): boolean {
  return distance > HIT_DISTANCE && distance <= GRAZE_RADIUS
}
