import { createBoss, rollBoss, updateBoss } from '../boss'
import { hasBulletLeft, moveBullet } from '../bullets'
import type { Bullet } from '../bullets'
import { ageBurst } from '../bursts'
import { createEnemy, updateEnemy } from '../enemies'
import { roundSchedule } from '../enemies'
import { updatePlayer } from '../player'
import { detectContacts, moveBody } from './collisions'
import { resolveContacts } from './contacts'
import { roundMultiplier } from './rounds'
import { type World, addBeam, addBoss, addBullet, addEnemy, nextId, removeCollider } from './world'

/** Each step is split into this many equal passes (game-spec 13.2). */
export const PASSES_PER_STEP = 4

/** Frames slower than 60 Hz are not caught up. */
const MAX_STEP = 1 / 60

/** `dt = clamp(frameMs / 1000, 0, 1/60)`. */
export function stepDuration(frameMs: number): number {
  return Math.min(MAX_STEP, Math.max(0, frameMs / 1000))
}

/** One simulation step: four passes of `dt / 4`. */
export function stepWorld(world: World, dt: number): void {
  for (let pass = 0; pass < PASSES_PER_STEP; pass++) {
    runPass(world, dt / PASSES_PER_STEP)
  }
}

export function runPass(world: World, dt: number): void {
  world.time += dt
  const next = () => nextId(world)
  const m = roundMultiplier(world.round)

  spawnSquads(world, dt)
  const enemyBullets = updateEnemies(world, dt, m, next)
  const bossBullets = updateBossPass(world, dt, m, next)
  const playerBullets = updatePlayer(world.player, dt, world.time, next)
  for (const bullet of [...playerBullets, ...enemyBullets, ...bossBullets]) {
    addBullet(world, bullet)
  }
  moveBullets(world, dt)
  world.bursts = world.bursts.filter((burst) => !ageBurst(burst, dt))
  syncBodies(world)
  resolveContacts(world, detectContacts(world.collisions, dt))
  advanceRound(world)
}

function spawnSquads(world: World, dt: number): void {
  if (world.phase !== 'waves') {
    return
  }
  world.roundClock += dt
  while (world.nextSquad < world.schedule.length && world.schedule[world.nextSquad].time <= world.roundClock) {
    const squad = world.schedule[world.nextSquad]
    world.nextSquad += 1
    squad.lanes.forEach((_, lane) => addEnemy(world, createEnemy(nextId(world), squad, lane)))
  }
}

function updateEnemies(world: World, dt: number, m: number, next: () => number): Bullet[] {
  const bullets: Bullet[] = []
  world.enemies = world.enemies.filter((enemy) => {
    const pass = updateEnemy(enemy, dt, m, next)
    if (pass.left) {
      removeCollider(world, enemy.id)
      return false
    }
    bullets.push(...pass.bullets)
    return true
  })
  return bullets
}

function updateBossPass(world: World, dt: number, m: number, next: () => number): Bullet[] {
  if (!world.boss) {
    return []
  }
  const pass = updateBoss(world.boss, dt, m, world.player.x, next)
  if (pass.beamOpened) {
    addBeam(world, pass.beamOpened)
  }
  if (pass.beamClosed) {
    removeCollider(world, pass.beamClosed.id)
  }
  return pass.bullets
}

function moveBullets(world: World, dt: number): void {
  world.bullets = world.bullets.filter((bullet) => {
    moveBullet(bullet, dt)
    if (hasBulletLeft(bullet)) {
      removeCollider(world, bullet.id)
      return false
    }
    return true
  })
}

function syncBodies(world: World): void {
  const { collisions, player, boss } = world
  moveBody(collisions, player.id, player.x, player.y)
  for (const entity of [...world.bullets, ...world.enemies]) {
    moveBody(collisions, entity.id, entity.x, entity.y)
  }
  if (boss) {
    moveBody(collisions, boss.id, boss.x, boss.y)
    if (boss.beam) {
      moveBody(collisions, boss.beam.id, boss.beam.x, boss.beam.y)
    }
  }
}

/** Summon the boss once the field is clear of the round's squads; start the next round once it is killed. */
function advanceRound(world: World): void {
  if (world.phase === 'waves') {
    if (world.nextSquad === world.schedule.length && world.enemies.length === 0) {
      world.phase = 'boss'
      addBoss(world, createBoss(nextId(world), world.round, rollBoss(world.random)))
    }
  } else if (!world.boss) {
    world.round += 1
    world.phase = 'waves'
    world.roundClock = 0
    world.schedule = roundSchedule(world.round)
    world.nextSquad = 0
  }
}
