import { type Boss, damageBoss } from '../boss'
import type { Bullet } from '../bullets'
import { createBurst } from '../bursts'
import { type Enemy, damageEnemy } from '../enemies'
import { isProtected, launchPlayer } from '../player'
import { type Collider, type World, nextId, removeCollider } from './world'

interface Resolution {
  /** Entities removed this pass. */
  removed: Set<number>
  /** At most one death is taken per pass. */
  deathTaken: boolean
}

/** Applies the contact starts of one pass, in the order matter-js reported them (game-spec 12.11). */
export function resolveContacts(world: World, contacts: [Collider, Collider][]): void {
  const resolution: Resolution = { removed: new Set(), deathTaken: false }

  for (const [first, second] of contacts) {
    if (!resolvePair(world, first, second, resolution)) {
      resolvePair(world, second, first, resolution)
    }
  }

  if (resolution.removed.size > 0) {
    world.bullets = world.bullets.filter((bullet) => !resolution.removed.has(bullet.id))
    world.enemies = world.enemies.filter((enemy) => !resolution.removed.has(enemy.id))
  }
}

/** Resolves the pair when `a` is the side that acts; returns false to try the other way round. */
function resolvePair(world: World, a: Collider, b: Collider, resolution: Resolution): boolean {
  if (a.kind === 'bullet' && a.bullet.side === 'player') {
    if (b.kind === 'enemy') {
      hitEnemy(world, a.bullet, b.enemy, resolution)
      return true
    }
    if (b.kind === 'boss') {
      hitBoss(world, a.bullet, b.boss, resolution)
      return true
    }
    return false
  }
  if (a.kind === 'player') {
    if (isHostilePresent(world, b, resolution)) {
      killPlayer(world, resolution)
    }
    return true
  }
  return false
}

/** Enemy aircraft, the boss, enemy bullets and the beam, unless already removed this pass. */
function isHostilePresent(world: World, collider: Collider, resolution: Resolution): boolean {
  if (collider.kind === 'bullet') {
    return collider.bullet.side === 'enemy'
  }
  if (collider.kind === 'enemy') {
    return !resolution.removed.has(collider.enemy.id)
  }
  if (collider.kind === 'boss') {
    return world.boss === collider.boss
  }
  return collider.kind === 'beam' && world.boss?.beam === collider.beam
}

/** A player bullet is used up by its first hit but still damages every enemy it starts touching this pass. */
function spendBullet(world: World, bullet: Bullet, resolution: Resolution): void {
  if (!resolution.removed.has(bullet.id)) {
    resolution.removed.add(bullet.id)
    removeCollider(world, bullet.id)
  }
}

function hitEnemy(world: World, bullet: Bullet, enemy: Enemy, resolution: Resolution): void {
  spendBullet(world, bullet, resolution)
  if (resolution.removed.has(enemy.id) || !damageEnemy(enemy, bullet.damage)) {
    return
  }
  resolution.removed.add(enemy.id)
  removeCollider(world, enemy.id)
  world.bursts.push(createBurst(nextId(world), enemy.x, enemy.y, 'enemy', 'small'))
}

function hitBoss(world: World, bullet: Bullet, boss: Boss, resolution: Resolution): void {
  spendBullet(world, bullet, resolution)
  if (world.boss !== boss || damageBoss(boss, bullet.damage) !== 'destroyed') {
    return
  }
  removeCollider(world, boss.id)
  if (boss.beam) {
    removeCollider(world, boss.beam.id)
    boss.beam = null
  }
  world.boss = null
  world.bursts.push(createBurst(nextId(world), boss.x, boss.y, 'enemy', 'large'))
}

function killPlayer(world: World, resolution: Resolution): void {
  const { player } = world
  if (resolution.deathTaken || isProtected(player, world.time)) {
    return
  }
  resolution.deathTaken = true
  world.bursts.push(createBurst(nextId(world), player.x, player.y, 'ally', 'large'))
  launchPlayer(player, world.time)
  world.lives = Math.max(0, world.lives - 1)
  if (world.lives === 0) {
    world.gameOver = true
  }
}
