import type { Bullet } from '../bullets'
import { fireVolley } from '../bullets'
import { isOutsideBy, type Point } from '../field'
import {
  ENEMY_KINDS,
  type EnemyKind,
  enemyBulletDamage,
  enemyBulletSpeed,
  enemyFireInterval,
  enemyMoveSpeed,
} from './kinds'
import { type EnemyPath, type EntryEdge, pathPosition } from './paths'
import type { Squad } from './waves'

/** Enemies are drawn nose-up and turned over by this angle (game-spec 8.4). */
export const ENEMY_ANGLE = 180

/** A craft outside the field by more than this is removed, without a burst. */
const EXIT_MARGIN = 60
const FIRE_HEADING = 90
const MUZZLE_GAP = 6

export interface Enemy {
  readonly id: number
  readonly kind: EnemyKind
  readonly path: EnemyPath
  readonly edge: EntryEdge
  readonly entry: Point
  x: number
  y: number
  hp: number
  /** Seconds since it appeared. */
  age: number
  /** u travelled along its path. */
  travelled: number
  fireTimer: number
}

export interface EnemyPass {
  /** Left the field: removed at once. */
  left: boolean
  bullets: Bullet[]
}

/** A craft of `squad` on its lane `lane`: at its entry point, full HP, fire timer 0. */
export function createEnemy(id: number, squad: Squad, lane: number): Enemy {
  const entry = squad.entries[lane]
  return {
    id,
    kind: squad.kind,
    path: squad.path,
    edge: squad.edge,
    entry,
    x: entry.x,
    y: entry.y,
    hp: ENEMY_KINDS[squad.kind].hp,
    age: 0,
    travelled: 0,
    fireTimer: 0,
  }
}

/** One pass: move along the path, leave if far outside, then fire when due. */
export function updateEnemy(enemy: Enemy, dt: number, m: number, nextId: () => number): EnemyPass {
  enemy.age += dt
  enemy.travelled += enemyMoveSpeed(enemy.kind, m) * dt
  const position = pathPosition(enemy.path, enemy.edge, enemy.entry, enemy.travelled, enemy.age)
  enemy.x = position.x
  enemy.y = position.y

  if (isOutsideBy(enemy, EXIT_MARGIN)) {
    return { left: true, bullets: [] }
  }
  return { left: false, bullets: fire(enemy, dt, m, nextId) }
}

function fire(enemy: Enemy, dt: number, m: number, nextId: () => number): Bullet[] {
  if (enemy.y <= 0) {
    return []
  }
  enemy.fireTimer += dt
  if (enemy.fireTimer < enemyFireInterval(enemy.kind, m)) {
    return []
  }
  enemy.fireTimer = 0

  const { pattern, radius } = ENEMY_KINDS[enemy.kind]
  return fireVolley(
    {
      pattern,
      x: enemy.x,
      y: pattern === 'radial' ? enemy.y : enemy.y + radius + MUZZLE_GAP,
      heading: FIRE_HEADING,
      speed: enemyBulletSpeed(enemy.kind, m),
      damage: enemyBulletDamage(enemy.kind, m),
    },
    nextId,
  )
}

/** Takes a hit; returns true once HP is at or below 0. */
export function damageEnemy(enemy: Enemy, damage: number): boolean {
  enemy.hp -= damage
  return enemy.hp <= 0
}
