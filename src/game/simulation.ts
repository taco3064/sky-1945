import {
  BEAM_HEIGHT,
  BEAM_WIDTH,
  advanceBossStance,
  bossHitRadius,
  bossMuzzleY,
  createBoss,
  moveBoss,
  type Boss,
} from './boss.ts'
import { ENEMY_BULLET_RADIUS, ENEMY_STATS, createEnemy, fireEnemy, moveEnemy, type Enemy } from './enemies.ts'
import { isOutside } from './field.ts'
import { powerMultiplier, speedMultiplier } from './loadout.ts'
import { Physics, type Body } from './physics.ts'
import {
  PLAYER_BULLET_RADIUS,
  PLAYER_HIT_RADIUS,
  createPlayer,
  isProtected,
  relaunchPlayer,
  setPlayerDirection,
  tryRoll,
  updatePlayer,
  type Player,
} from './player.ts'
import { grazePulse, isGraze } from './pulse.ts'
import { roundMultiplier, roundSchedule, type Squad } from './rounds.ts'
import { shotVelocity, type Shot } from './shots.ts'

export const STARTING_LIVES = 3

const PASSES_PER_STEP = 4
const BULLET_MARGIN = 24
const BURST_LIFETIME = 0.6

export type Bullet = {
  side: 'player' | 'enemy'
  x: number
  y: number
  vx: number
  vy: number
  damage: number
  /** An enemy bullet grants PULSE for a graze once in its lifetime. */
  grazed: boolean
}

export type Beam = { x: number; y: number }

export type Burst = {
  x: number
  y: number
  tone: 'ally' | 'enemy'
  size: 'small' | 'large'
  age: number
}

type Owner =
  | { type: 'player' }
  | { type: 'bullet'; bullet: Bullet }
  | { type: 'enemy'; enemy: Enemy }
  | { type: 'boss'; boss: Boss }
  | { type: 'beam'; beam: Beam }

/**
 * One run of the game: round 1, 3 lives, no enemies. Entities are exposed for drawing and are
 * listed in order of creation.
 */
export class Simulation {
  /** Simulated seconds since the run started. */
  time = 0
  round = 1
  lives = STARTING_LIVES
  /** PULSE energy, 0–100. Kept through deaths and rounds; only a new run starts it at 0. */
  pulse = 0
  readonly player: Player = createPlayer(0)
  bullets: Bullet[] = []
  enemies: Enemy[] = []
  boss: Boss | null = null
  beam: Beam | null = null
  bursts: Burst[] = []

  readonly #speedMultiplier: number
  readonly #powerMultiplier: number
  readonly #random: () => number
  readonly #physics = new Physics()
  readonly #bodies = new Map<object, Body>()
  readonly #owners = new Map<number, Owner>()
  /** Entities removed by contacts in the current pass, dropped from their lists once contacts are resolved. */
  readonly #removed = new Set<object>()

  #phase: 'waves' | 'boss' = 'waves'
  #roundClock = 0
  #schedule: Squad[] = roundSchedule(1)
  #nextSquad = 0

  constructor(speedPoints: number, random: () => number = Math.random) {
    this.#speedMultiplier = speedMultiplier(speedPoints)
    this.#powerMultiplier = powerMultiplier(speedPoints)
    this.#random = random
    this.#attach(this.player, { type: 'player' }, this.#physics.addCircle(this.player.x, this.player.y, PLAYER_HIT_RADIUS))
  }

  setDirection(x: number, y: number): void {
    setPlayerDirection(this.player, x, y)
  }

  /** Attempts a barrel roll at the current simulated time. */
  tryRoll(): boolean {
    return tryRoll(this.player, this.time)
  }

  /** One simulation step: `dt` seconds split into 4 equal passes. */
  step(dt: number): void {
    const passDt = dt / PASSES_PER_STEP
    for (let i = 0; i < PASSES_PER_STEP; i++) this.#pass(passDt)
  }

  #pass(dt: number): void {
    this.time += dt
    const m = roundMultiplier(this.round)

    this.#spawnSquads(dt)
    const enemyShots = this.#updateEnemies(dt, m)
    const bossShots = this.#updateBoss(dt, m)
    const playerShots = updatePlayer(this.player, dt, this.time, this.#speedMultiplier, this.#powerMultiplier)

    for (const shot of playerShots) this.#addBullet('player', shot)
    for (const shot of enemyShots) this.#addBullet('enemy', shot)
    for (const shot of bossShots) this.#addBullet('enemy', shot)

    this.#moveBullets(dt)
    this.#ageBursts(dt)
    this.#resolveContacts(this.#detectContacts(dt))
    this.#graze()
    this.#advanceRound()
  }

  #spawnSquads(dt: number): void {
    if (this.#phase !== 'waves') return

    this.#roundClock += dt
    while (this.#nextSquad < this.#schedule.length && this.#schedule[this.#nextSquad].time <= this.#roundClock) {
      const squad = this.#schedule[this.#nextSquad++]
      squad.entries.forEach((_, index) => {
        const enemy = createEnemy(squad, index)
        const body = this.#physics.addCircle(enemy.x, enemy.y, ENEMY_STATS[enemy.kind].radius, Math.PI)
        this.enemies.push(enemy)
        this.#attach(enemy, { type: 'enemy', enemy }, body)
      })
    }
  }

  #updateEnemies(dt: number, m: number): Shot[] {
    const shots: Shot[] = []
    this.enemies = this.enemies.filter((enemy) => {
      if (!moveEnemy(enemy, dt, m)) {
        this.#detach(enemy)
        return false
      }
      shots.push(...fireEnemy(enemy, dt, m))
      return true
    })
    return shots
  }

  #updateBoss(dt: number, m: number): Shot[] {
    const boss = this.boss
    if (!boss) return []

    moveBoss(boss, dt)
    if (this.beam) this.#placeBeam(this.beam, boss)

    const { shots, beam } = advanceBossStance(boss, this.player.x, m)
    if (beam === 'open') {
      const opened: Beam = { x: 0, y: 0 }
      this.#placeBeam(opened, boss)
      this.beam = opened
      this.#attach(opened, { type: 'beam', beam: opened }, this.#physics.addRectangle(opened.x, opened.y, BEAM_WIDTH, BEAM_HEIGHT))
    } else if (beam === 'close') {
      this.#closeBeam()
    }
    return shots
  }

  #placeBeam(beam: Beam, boss: Boss): void {
    beam.x = boss.x
    beam.y = bossMuzzleY(boss) + BEAM_HEIGHT / 2
  }

  #closeBeam(): void {
    if (!this.beam) return
    this.#detach(this.beam)
    this.beam = null
  }

  #addBullet(side: Bullet['side'], shot: Shot): void {
    const { vx, vy } = shotVelocity(shot)
    const bullet: Bullet = { side, x: shot.x, y: shot.y, vx, vy, damage: shot.damage, grazed: false }
    const radius = side === 'player' ? PLAYER_BULLET_RADIUS : ENEMY_BULLET_RADIUS
    this.bullets.push(bullet)
    this.#attach(bullet, { type: 'bullet', bullet }, this.#physics.addCircle(bullet.x, bullet.y, radius))
  }

  #moveBullets(dt: number): void {
    this.bullets = this.bullets.filter((bullet) => {
      bullet.x += bullet.vx * dt
      bullet.y += bullet.vy * dt
      if (!isOutside(bullet.x, bullet.y, BULLET_MARGIN)) return true
      this.#detach(bullet)
      return false
    })
  }

  #ageBursts(dt: number): void {
    this.bursts = this.bursts.filter((burst) => {
      burst.age += dt
      return burst.age < BURST_LIFETIME
    })
  }

  #detectContacts(dt: number): [Body, Body][] {
    const place = (entity: { x: number; y: number }) => {
      this.#physics.place(this.#bodies.get(entity) as Body, entity.x, entity.y)
    }
    place(this.player)
    this.bullets.forEach(place)
    this.enemies.forEach(place)
    if (this.boss) place(this.boss)
    if (this.beam) place(this.beam)

    return this.#physics.update(dt * 1000)
  }

  #resolveContacts(contacts: [Body, Body][]): void {
    for (const [bodyA, bodyB] of contacts) {
      const a = this.#owners.get(bodyA.id)
      const b = this.#owners.get(bodyB.id)
      if (a && b && !this.#contact(a, b)) this.#contact(b, a)
    }

    if (this.#removed.size === 0) return
    this.bullets = this.bullets.filter((bullet) => !this.#removed.has(bullet))
    this.enemies = this.enemies.filter((enemy) => !this.#removed.has(enemy))
    for (const entity of this.#removed) this.#detach(entity)
    this.#removed.clear()
  }

  /** Applies a contact start seen from `first`'s side. Returns false when the pair means nothing that way round. */
  #contact(first: Owner, second: Owner): boolean {
    if (first.type === 'bullet' && first.bullet.side === 'player') {
      if (second.type === 'enemy') {
        if (this.#removed.has(second.enemy)) return true
        this.#removed.add(first.bullet)
        this.#damageEnemy(second.enemy, first.bullet.damage)
        return true
      }
      if (second.type === 'boss') {
        this.#removed.add(first.bullet)
        this.#damageBoss(second.boss, first.bullet.damage)
        return true
      }
      return false
    }

    if (first.type !== 'player') return false
    if (second.type === 'enemy' && this.#removed.has(second.enemy)) return true
    if (second.type === 'bullet' && second.bullet.side === 'player') return true
    this.#hitPlayer()
    return true
  }

  #damageEnemy(enemy: Enemy, damage: number): void {
    enemy.hp -= damage
    if (enemy.hp > 0) return
    this.#removed.add(enemy)
    this.bursts.push({ x: enemy.x, y: enemy.y, tone: 'enemy', size: 'small', age: 0 })
  }

  /** The boss is detached the moment it dies, so a later contact in the same pass never reaches it. */
  #damageBoss(boss: Boss, damage: number): void {
    if (boss.stance === 'entering') return

    boss.hp -= damage
    if (boss.hp > 0) return
    this.#closeBeam()
    this.#detach(boss)
    this.boss = null
    this.bursts.push({ x: boss.x, y: boss.y, tone: 'enemy', size: 'large', age: 0 })
  }

  #hitPlayer(): void {
    const { player } = this
    if (isProtected(player, this.time)) return

    this.bursts.push({ x: player.x, y: player.y, tone: 'ally', size: 'large', age: 0 })
    relaunchPlayer(player, this.time)
    this.lives -= 1
  }

  /**
   * Grants PULSE for every enemy bullet grazing a vulnerable aircraft that has flown in. A hit needs the
   * bodies to overlap, within 7 u, so a hitting bullet is never also grazing. Running after contacts means
   * an aircraft shot down in this pass is already relaunched and protected, so that pass grants nothing.
   */
  #graze(): void {
    const { player } = this
    if (player.flyingIn || isProtected(player, this.time)) return

    for (const bullet of this.bullets) {
      if (bullet.side !== 'enemy' || bullet.grazed) continue
      if (!isGraze(Math.hypot(bullet.x - player.x, bullet.y - player.y))) continue
      bullet.grazed = true
      this.pulse = grazePulse(this.pulse)
    }
  }

  #advanceRound(): void {
    if (this.#phase === 'waves') {
      if (this.#nextSquad < this.#schedule.length || this.enemies.length > 0) return

      const boss = createBoss(this.round, this.#random)
      this.boss = boss
      this.#phase = 'boss'
      this.#attach(boss, { type: 'boss', boss }, this.#physics.addCircle(boss.x, boss.y, bossHitRadius(boss.size), Math.PI))
      return
    }

    if (this.boss) return
    this.round += 1
    this.#phase = 'waves'
    this.#roundClock = 0
    this.#schedule = roundSchedule(this.round)
    this.#nextSquad = 0
  }

  #attach(entity: object, owner: Owner, body: Body): void {
    this.#bodies.set(entity, body)
    this.#owners.set(body.id, owner)
  }

  #detach(entity: object): void {
    const body = this.#bodies.get(entity) as Body
    this.#physics.remove(body)
    this.#bodies.delete(entity)
    this.#owners.delete(body.id)
  }
}
