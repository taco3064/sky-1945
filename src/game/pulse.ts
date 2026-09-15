import { ENEMY_BULLET_RADIUS } from './enemies.ts'
import { PLAYER_HIT_RADIUS } from './player.ts'

export const PULSE_MAX = 100
export const PULSE_DURATION = 0.6
/** Fixed damage, whatever the loadout, round or target size. */
export const PULSE_ENEMY_DAMAGE = 50
export const PULSE_BOSS_DAMAGE = 120

const PULSE_REACH = 180
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

export type PulseDrive = {
  startedAt: number
  /** When the drive, and the protection it gives, ends. */
  endsAt: number
  /** Enemy aircraft and bosses this activation has already hit; each is hit at most once. */
  touched: Set<object>
}

export function startPulseDrive(time: number): PulseDrive {
  return { startedAt: time, endsAt: time + PULSE_DURATION, touched: new Set() }
}

/** 0 at activation, 1 once the drive has run its 0.6 s. */
export function pulseProgress(elapsed: number): number {
  return Math.min(Math.max(elapsed / PULSE_DURATION, 0), 1)
}

/** The radius of the filled Pulse area: 0 u at activation, growing linearly to 180 u at 0.6 s. */
export function pulseRadius(elapsed: number): number {
  return PULSE_REACH * pulseProgress(elapsed)
}

/** Whether a body of `bodyRadius` whose centre is `distance` from the aircraft's is reached by the Pulse. */
export function inPulse(distance: number, radius: number, bodyRadius = 0): boolean {
  return distance <= radius + bodyRadius
}
