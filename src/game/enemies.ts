import { isOutside, type Point } from './field.ts'
import { inwardSign, pathPosition, type Edge, type PathName } from './paths.ts'
import type { EnemyKind, Squad } from './rounds.ts'
import { volley, type FirePattern, type Shot } from './shots.ts'

type EnemyStats = {
  hp: number
  radius: number
  /** u/s before the round multiplier. */
  speed: number
  damage: number
  /** s before the round multiplier. */
  interval: number
  pattern: FirePattern
}

export const ENEMY_STATS: Record<EnemyKind, EnemyStats> = {
  small: { hp: 20, radius: 13, speed: 165, damage: 8, interval: 1.1, pattern: 'straight' },
  medium: { hp: 60, radius: 20, speed: 115, damage: 10, interval: 1.6, pattern: 'spread' },
  large: { hp: 160, radius: 32, speed: 72, damage: 12, interval: 2.2, pattern: 'radial' },
}

export const ENEMY_BULLET_RADIUS = 4

const LEAVE_MARGIN = 60
const MIN_BULLET_SPEED = 260
const BULLET_SPEED_FACTOR = 1.5
const MUZZLE_GAP = 6
const FIRE_HEADING = 90

export type Enemy = {
  kind: EnemyKind
  path: PathName
  edge: Edge
  entry: Point
  inward: number
  travelled: number
  age: number
  x: number
  y: number
  hp: number
  fireTimer: number
}

/** Craft `index` of a squad, at its entry point with full HP. */
export function createEnemy(squad: Squad, index: number): Enemy {
  const entry = squad.entries[index]
  return {
    kind: squad.kind,
    path: squad.path,
    edge: squad.edge,
    entry,
    inward: inwardSign(squad.edge, entry),
    travelled: 0,
    age: 0,
    x: entry.x,
    y: entry.y,
    hp: ENEMY_STATS[squad.kind].hp,
    fireTimer: 0,
  }
}

/** Moves along the path. Returns false once the craft is outside the field by more than 60 u. */
export function moveEnemy(enemy: Enemy, dt: number, m: number): boolean {
  enemy.age += dt
  enemy.travelled += ENEMY_STATS[enemy.kind].speed * m * dt

  const { x, y } = pathPosition(
    enemy.path,
    enemy.edge,
    enemy.entry,
    enemy.travelled,
    enemy.age,
    enemy.inward,
  )
  enemy.x = x
  enemy.y = y
  return !isOutside(x, y, LEAVE_MARGIN)
}

/** Runs the fire timer while the craft is below the top edge and fires a volley when it is due. */
export function fireEnemy(enemy: Enemy, dt: number, m: number): Shot[] {
  const stats = ENEMY_STATS[enemy.kind]
  if (enemy.y > 0) enemy.fireTimer += dt
  if (enemy.fireTimer < stats.interval / m) return []

  enemy.fireTimer = 0
  const muzzleY = stats.pattern === 'radial' ? enemy.y : enemy.y + stats.radius + MUZZLE_GAP
  return volley(
    stats.pattern,
    enemy.x,
    muzzleY,
    FIRE_HEADING,
    Math.max(MIN_BULLET_SPEED, stats.speed * m * BULLET_SPEED_FACTOR),
    stats.damage * m,
  )
}
