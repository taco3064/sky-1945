import type { Shot } from './shots.ts'

export const PLAYER_HIT_RADIUS = 3
export const PLAYER_BULLET_RADIUS = 4

const LAUNCH_X = 270
const LAUNCH_Y = 1020
const CONTROL_Y = 800
const FLY_IN_SPEED = 620
const LAUNCH_PROTECTION = 3

const BASE_SPEED = 300
const MIN_X = 24
const MAX_X = 516
const MIN_Y = 24
const MAX_Y = 936

const FIRE_INTERVAL = 1 / 7.5
const BULLET_SPEED = 780
const BULLET_DAMAGE = 7.5
const MUZZLE_SPREAD = 13
const MUZZLE_AHEAD = 26

const ROLL_DURATION = 1.2
const ROLL_COOLDOWN = 1.2

export type Player = {
  x: number
  y: number
  /** True from launch until the aircraft reaches y = 800 and control begins. */
  flyingIn: boolean
  /** Input direction, normalised to length 1 or zero. */
  directionX: number
  directionY: number
  invulnerableUntil: number
  rollEnd: number
  rollReadyAt: number
  fireTimer: number
}

/** A fresh aircraft at launch, invulnerable for 3 s. */
export function createPlayer(time: number): Player {
  return {
    x: LAUNCH_X,
    y: LAUNCH_Y,
    flyingIn: true,
    directionX: 0,
    directionY: 0,
    invulnerableUntil: time + LAUNCH_PROTECTION,
    rollEnd: 0,
    rollReadyAt: 0,
    fireTimer: 0,
  }
}

/** Back to launch after a death. The fire timer is kept. */
export function relaunchPlayer(player: Player, time: number): void {
  const { fireTimer } = player
  Object.assign(player, createPlayer(time), { fireTimer })
}

export function setPlayerDirection(player: Player, x: number, y: number): void {
  const length = Math.hypot(x, y)
  player.directionX = length > 0 ? x / length : 0
  player.directionY = length > 0 ? y / length : 0
}

export function isProtected(player: Player, time: number): boolean {
  return time < player.invulnerableUntil
}

export function isRolling(player: Player, time: number): boolean {
  return time < player.rollEnd
}

/** From a roll's start until the next roll is allowed. */
export function isSpent(player: Player, time: number): boolean {
  return time < player.rollReadyAt
}

/** Starts a barrel roll if one is allowed now. A roll never shortens existing protection. */
export function tryRoll(player: Player, time: number): boolean {
  if (time < player.rollReadyAt) return false

  player.rollEnd = time + ROLL_DURATION
  player.rollReadyAt = player.rollEnd + ROLL_COOLDOWN
  player.invulnerableUntil = Math.max(player.invulnerableUntil, player.rollEnd)
  return true
}

/** Flies in or steers, then fires every volley that is due. */
export function updatePlayer(
  player: Player,
  dt: number,
  time: number,
  speedMultiplier: number,
  powerMultiplier: number,
): Shot[] {
  if (player.flyingIn) {
    player.y -= FLY_IN_SPEED * dt
    if (player.y <= CONTROL_Y) {
      player.y = CONTROL_Y
      player.flyingIn = false
    }
  } else {
    const speed = BASE_SPEED * speedMultiplier
    player.x = clamp(player.x + player.directionX * speed * dt, MIN_X, MAX_X)
    player.y = clamp(player.y + player.directionY * speed * dt, MIN_Y, MAX_Y)
  }

  player.fireTimer += dt
  if (isRolling(player, time)) {
    player.fireTimer = Math.min(player.fireTimer, FIRE_INTERVAL)
    return []
  }

  const shots: Shot[] = []
  const damage = BULLET_DAMAGE * powerMultiplier
  while (player.fireTimer >= FIRE_INTERVAL) {
    player.fireTimer -= FIRE_INTERVAL
    for (const side of [-1, 1]) {
      shots.push({
        x: player.x + side * MUZZLE_SPREAD,
        y: player.y - MUZZLE_AHEAD,
        heading: -90,
        speed: BULLET_SPEED,
        damage,
      })
    }
  }
  return shots
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
