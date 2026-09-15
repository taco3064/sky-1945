import { bossAttack, type BossAttack } from './bossAttacks.ts'
import { volley, type Shot } from './shots.ts'

export type BossStance = 'entering' | 'winding' | 'firing' | 'recovering'

type AttackTiming = {
  windUp: number
  duration: number
  /** Seconds between volleys at size 1; 0 for attacks that fire no bullets. */
  cadence: number
}

export const ATTACK_TIMING: Record<BossAttack, AttackTiming> = {
  straight: { windUp: 0.45, duration: 1.5, cadence: 0.08 },
  spread: { windUp: 0.6, duration: 1.4, cadence: 0.25 },
  radial: { windUp: 0.7, duration: 1.2, cadence: 0.28 },
  beam: { windUp: 1.4, duration: 1.1, cadence: 0 },
  ram: { windUp: 1.0, duration: 1.3, cadence: 0 },
}

export const BEAM_WIDTH = 88
export const BEAM_HEIGHT = 1000

const RECOVERY = 0.4

const ENTRY_X = 270
const ENTRY_Y = -52
const ENTRY_SPEED = 420
const ALTITUDE = 150
/** Age at which the boss reaches its altitude: (150 + 52) / 420 s. */
export const BOSS_ARRIVAL_AGE = (ALTITUDE - ENTRY_Y) / ENTRY_SPEED

const PATROL_CENTRE_X = 270
const PATROL_REACH_X = 150
const PATROL_RATE_X = 0.09
const PATROL_DIP_Y = 45
const PATROL_RATE_Y = 0.14

const RAM_RECOIL = 70
const RAM_DEPTH = 920

const BASE_HIT_POINTS = 900
const HIT_POINTS_PER_ROUND = 650
const HIT_RADIUS = 52
const MUZZLE_OFFSET = 66

const BULLET_SPEED = 320
const BULLET_DAMAGE = 14
const FIRE_HEADING = 90

export type Boss = {
  /** Rolled size multiplier `s`, 0.8–2.0. */
  size: number
  seed: number
  hp: number
  maxHp: number
  x: number
  y: number
  /** Seconds since the boss appeared. */
  age: number
  stance: BossStance
  attackIndex: number
  /** The current attack; null while entering. */
  attack: BossAttack | null
  stanceTime: number
  volleyTime: number
  volleys: number
  /** The player's x locked at the end of a ram wind-up; null outside a ram dive. */
  aimedX: number | null
}

export function bossHitPoints(round: number, size: number): number {
  return (BASE_HIT_POINTS + Math.max(round - 1, 0) * HIT_POINTS_PER_ROUND) * size
}

export function bossHitRadius(size: number): number {
  return HIT_RADIUS * size
}

/** y of the muzzle, where straight and spread volleys leave and the beam's top edge sits. */
export function bossMuzzleY(boss: Boss): number {
  return boss.y + MUZZLE_OFFSET * boss.size
}

/** Rolls the size, then the attack seed, and places the boss above the top edge. */
export function createBoss(round: number, random: () => number): Boss {
  const size = 0.8 + random() * 1.2
  const seed = Math.floor(random() * 0xffffffff)
  const hp = bossHitPoints(round, size)

  return {
    size,
    seed,
    hp,
    maxHp: hp,
    x: ENTRY_X,
    y: ENTRY_Y,
    age: 0,
    stance: 'entering',
    attackIndex: 0,
    attack: null,
    stanceTime: 0,
    volleyTime: 0,
    volleys: 0,
    aimedX: null,
  }
}

/** Advances the boss's timers and moves it: the entry dive, or the patrol plus any ram offset. */
export function moveBoss(boss: Boss, dt: number): void {
  boss.age += dt
  boss.stanceTime += dt
  boss.volleyTime += dt

  if (boss.stance === 'entering') {
    boss.y = ENTRY_Y + ENTRY_SPEED * boss.age
    return
  }

  const t = boss.age - BOSS_ARRIVAL_AGE
  const patrolX =
    PATROL_CENTRE_X + Math.sin((2 * Math.PI * t * PATROL_RATE_X) / boss.size) * PATROL_REACH_X
  const patrolY =
    ALTITUDE + (1 - Math.cos((2 * Math.PI * t * PATROL_RATE_Y) / boss.size)) * PATROL_DIP_Y

  let offsetX = 0
  let offsetY = 0
  if (boss.attack === 'ram' && boss.stance === 'winding') {
    offsetY = -RAM_RECOIL * Math.min(boss.stanceTime / ATTACK_TIMING.ram.windUp, 1)
  } else if (boss.attack === 'ram' && boss.stance === 'firing' && boss.aimedX !== null) {
    const p = Math.min(boss.stanceTime / ATTACK_TIMING.ram.duration, 1)
    const r = Math.sin(p * Math.PI)
    offsetX = (boss.aimedX - patrolX) * r
    offsetY = (RAM_DEPTH - patrolY) * r - RAM_RECOIL * (1 - p)
  }

  boss.x = patrolX + offsetX
  boss.y = patrolY + offsetY
}

export type BossStanceResult = {
  shots: Shot[]
  beam: 'open' | 'close' | null
}

const NOTHING: BossStanceResult = { shots: [], beam: null }

/** Runs the stance machine for one pass: stance changes, volleys, beam open/close and the ram lock. */
export function advanceBossStance(boss: Boss, playerX: number, m: number): BossStanceResult {
  switch (boss.stance) {
    case 'entering':
      if (boss.y < ALTITUDE) return NOTHING
      boss.y = ALTITUDE
      enterStance(boss, 'winding')
      boss.attack = bossAttack(boss.seed, boss.attackIndex)
      return NOTHING

    case 'winding': {
      const attack = boss.attack as BossAttack
      if (boss.stanceTime < ATTACK_TIMING[attack].windUp) return NOTHING
      if (attack === 'ram') boss.aimedX = playerX
      enterStance(boss, 'firing')
      return { shots: [], beam: attack === 'beam' ? 'open' : null }
    }

    case 'firing': {
      const attack = boss.attack as BossAttack
      const { duration, cadence } = ATTACK_TIMING[attack]
      if (boss.stanceTime >= duration) {
        boss.aimedX = null
        enterStance(boss, 'recovering')
        return { shots: [], beam: attack === 'beam' ? 'close' : null }
      }
      if (attack === 'beam' || attack === 'ram') return NOTHING
      if (boss.volleys > 0 && boss.volleyTime < cadence / boss.size) return NOTHING

      boss.volleyTime = 0
      boss.volleys += 1
      const muzzleY = attack === 'radial' ? boss.y : bossMuzzleY(boss)
      return {
        shots: volley(attack, boss.x, muzzleY, FIRE_HEADING, BULLET_SPEED, BULLET_DAMAGE * m),
        beam: null,
      }
    }

    case 'recovering':
      if (boss.stanceTime < RECOVERY) return NOTHING
      boss.attackIndex += 1
      boss.attack = bossAttack(boss.seed, boss.attackIndex)
      enterStance(boss, 'winding')
      return NOTHING
  }
}

function enterStance(boss: Boss, stance: BossStance): void {
  boss.stance = stance
  boss.stanceTime = 0
  boss.volleyTime = 0
  boss.volleys = 0
}
