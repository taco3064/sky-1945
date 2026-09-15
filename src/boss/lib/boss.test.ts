import { describe, expect, it } from 'vitest'
import type { BossAttack } from './attackOrder'
import {
  BEAM_LENGTH,
  BEAM_WIDTH,
  BOSS_ANGLE,
  type Boss,
  ENTRY_DURATION,
  bossHitRadius,
  bossMaxHp,
  bossMuzzleOffset,
  createBoss,
  damageBoss,
  rollBoss,
  updateBoss,
} from './boss'

/** One pass at a steady 60 Hz. */
const PASS = 1 / 60 / 4

function ids() {
  let id = 500
  return () => ++id
}

/** A boss that has just arrived and starts winding up `attack`. */
function windingBoss(attack: BossAttack, size = 1): Boss {
  const boss = createBoss(1, 1, { size, seed: 0 })
  Object.assign(boss, { pose: 'winding', attack, age: ENTRY_DURATION, x: 270, y: 150 })
  return boss
}

function runUntil(boss: Boss, done: (boss: Boss) => boolean, playerX = 270) {
  const next = ids()
  const passes = []
  for (let guard = 0; guard < 10000 && !done(boss); guard++) {
    passes.push(updateBoss(boss, PASS, 1, playerX, next))
  }
  return passes
}

describe('roll', () => {
  it('draws the size first, then the seed', () => {
    const draws = [0.5, 0.25]

    expect(rollBoss(() => draws.shift() as number)).toEqual({ size: 1.4, seed: Math.floor(0.25 * 0xffffffff) })
  })

  it('covers sizes 0.8–2.0 and seeds 0 … 4,294,967,294', () => {
    expect(rollBoss(() => 0)).toEqual({ size: 0.8, seed: 0 })
    const top = rollBoss(() => 0.9999999999)
    expect(top.size).toBeLessThan(2)
    expect(top.seed).toBe(4294967294)
  })
})

describe('size', () => {
  // game-spec 14.3: round → hit points for s = 0.8, 1, 1.5, 2
  it.each([
    [1, [720, 900, 1350, 1800]],
    [2, [1240, 1550, 2325, 3100]],
    [3, [1760, 2200, 3300, 4400]],
    [4, [2280, 2850, 4275, 5700]],
    [5, [2800, 3500, 5250, 7000]],
    [6, [3320, 4150, 6225, 8300]],
    [7, [3840, 4800, 7200, 9600]],
    [8, [4360, 5450, 8175, 10900]],
  ])('round %i hit points follow game-spec 14.3', (round, hitPoints) => {
    ;[0.8, 1, 1.5, 2].forEach((size, index) => expect(bossMaxHp(round, size)).toBeCloseTo(hitPoints[index], 9))
  })

  it.each([
    [0.8, 41.6, 52.8],
    [1, 52, 66],
    [2, 104, 132],
  ])('at s = %f the hit radius is %f and the muzzle %f below the centre', (size, radius, muzzle) => {
    const boss = createBoss(1, 1, { size, seed: 0 })

    expect(bossHitRadius(boss)).toBeCloseTo(radius, 9)
    expect(bossMuzzleOffset(boss)).toBeCloseTo(muzzle, 9)
  })

  it('draws with the enemies turned over, beam 88 × 1000 u', () => {
    expect(BOSS_ANGLE).toBe(180)
    expect([BEAM_WIDTH, BEAM_LENGTH]).toEqual([88, 1000])
  })
})

describe('entry', () => {
  it('appears 52 u above the top edge with full hit points', () => {
    const boss = createBoss(9, 2, { size: 1.5, seed: 42 })

    expect(boss).toMatchObject({ id: 9, x: 270, y: -52, hp: 2325, maxHp: 2325, pose: 'entering', attackIndex: 0, attack: 'straight' })
  })

  it('flies down at 420 u/s and starts winding up once it reaches y = 150', () => {
    const boss = createBoss(1, 1, { size: 2, seed: 0 })

    updateBoss(boss, 0.25, 1, 270, ids())
    expect([boss.x, boss.y, boss.pose]).toEqual([270, 53, 'entering'])

    runUntil(boss, (current) => current.pose !== 'entering')
    expect(ENTRY_DURATION).toBeCloseTo(0.48095, 5)
    expect(boss.age).toBeCloseTo(ENTRY_DURATION, 2)
    expect([boss.y, boss.pose, boss.stanceTime]).toEqual([150, 'winding', 0])
  })

  it('is shielded while entering: damage is discarded', () => {
    const boss = createBoss(1, 1, { size: 1, seed: 0 })

    expect(damageBoss(boss, 500)).toBe('shielded')
    expect(boss.hp).toBe(900)
  })
})

describe('patrol', () => {
  it('sweeps x 120 … 420 and dips y 150 … 240 with size-scaled periods', () => {
    const size = 1.5
    const boss = windingBoss('straight', size)
    const quarterX = size / 0.09 / 4
    boss.age = ENTRY_DURATION + quarterX - PASS

    updateBoss(boss, PASS, 1, 270, ids())

    expect(boss.x).toBeCloseTo(420, 6)
    expect(boss.y).toBeCloseTo(150 + (1 - Math.cos((2 * Math.PI * quarterX * 0.14) / size)) * 45, 6)
  })
})

describe('stance machine', () => {
  it('winds up, fires, recovers 0.4 s, then winds up the next attack', () => {
    const boss = createBoss(1, 1, { size: 1, seed: 0 })
    runUntil(boss, (current) => current.pose === 'winding')

    const windUp = runUntil(boss, (current) => current.pose === 'firing').length
    const firing = runUntil(boss, (current) => current.pose === 'recovering').length
    const recovery = runUntil(boss, (current) => current.pose === 'winding').length

    expect([windUp * PASS, firing * PASS, recovery * PASS].map((seconds) => Number(seconds.toFixed(2)))).toEqual([0.45, 1.5, 0.4])
    expect([boss.attackIndex, boss.attack]).toEqual([1, 'straight'])
    runUntil(boss, (current) => current.attackIndex === 2)
    expect(boss.attack).toBe('ram')
  })

  it.each<[BossAttack, number, number]>([
    ['radial', 0.7, 1.2],
    ['beam', 1.4, 1.1],
    ['ram', 1.0, 1.3],
    ['spread', 0.6, 1.4],
  ])('%s winds up %f s and lasts %f s', (attack, windUp, duration) => {
    const boss = windingBoss(attack)

    const windUpPasses = runUntil(boss, (current) => current.pose === 'firing').length
    const firingPasses = runUntil(boss, (current) => current.pose === 'recovering').length

    expect(windUpPasses * PASS).toBeCloseTo(windUp, 2)
    expect(firingPasses * PASS).toBeCloseTo(duration, 2)
  })
})

describe('volleys', () => {
  // game-spec 12.9.8: volleys (bullets) per attack at a steady 60 Hz for s = 0.8, 1, 1.25, 1.5, 2
  it.each<[BossAttack, [number, number][]]>([
    ['straight', [[15, 15], [18, 18], [23, 23], [28, 28], [36, 36]]],
    ['spread', [[5, 25], [6, 30], [7, 35], [9, 45], [11, 55]]],
    ['radial', [[4, 40], [5, 50], [6, 60], [7, 70], [9, 90]]],
  ])('%s emits the game-spec 12.9.8 counts', (attack, counts) => {
    ;[0.8, 1, 1.25, 1.5, 2].forEach((size, index) => {
      const boss = windingBoss(attack, size)
      const passes = runUntil(boss, (current) => current.pose === 'recovering')
      const volleys = passes.filter((pass) => pass.bullets.length > 0)

      expect([volleys.length, volleys.flatMap((pass) => pass.bullets).length]).toEqual(counts[index])
    })
  })

  it('fires nothing on the pass that switches to firing, then fires on the next', () => {
    const boss = windingBoss('straight')

    const passes = runUntil(boss, (current) => current.pose === 'firing')
    expect(passes.at(-1)?.bullets).toEqual([])

    expect(updateBoss(boss, PASS, 1, 270, ids()).bullets.length).toBe(1)
  })

  it('fires straight and spread from the muzzle and radial from the centre, at 320 u/s for 14 × m', () => {
    const straight = windingBoss('straight', 2)
    runUntil(straight, (current) => current.pose === 'firing')
    const [shot] = updateBoss(straight, PASS, 1.5, 270, ids()).bullets

    expect(shot).toMatchObject({ side: 'enemy', x: straight.x, y: straight.y + 132, damage: 21 })
    expect(Math.hypot(shot.vx, shot.vy)).toBeCloseTo(320, 9)

    const radial = windingBoss('radial', 2)
    runUntil(radial, (current) => current.pose === 'firing')
    const ring = updateBoss(radial, PASS, 1, 270, ids()).bullets

    expect(ring.every((bullet) => bullet.x === radial.x && bullet.y === radial.y)).toBe(true)
  })
})

describe('ram', () => {
  it('recoils up to 70 u while winding', () => {
    const boss = windingBoss('ram')
    boss.age = ENTRY_DURATION - PASS

    updateBoss(boss, PASS, 1, 270, ids())
    expect(boss.y).toBeCloseTo(150 - 70 * PASS, 6)

    runUntil(boss, (current) => current.stanceTime >= 0.5)
    const patrolY = 150 + (1 - Math.cos(2 * Math.PI * (boss.age - ENTRY_DURATION) * 0.14)) * 45
    expect(boss.y - patrolY).toBeCloseTo(-70 * boss.stanceTime, 9)

    runUntil(boss, (current) => current.stanceTime >= 0.99)
    updateBoss(boss, PASS * 2, 1, 270, ids())
    const lockedPatrolY = 150 + (1 - Math.cos(2 * Math.PI * (boss.age - ENTRY_DURATION) * 0.14)) * 45
    expect(boss.y - lockedPatrolY).toBeCloseTo(-70, 9)
  })

  it('locks the player column at the end of the wind-up and dives to (aimedX, 885) at mid-dive', () => {
    const boss = windingBoss('ram')

    runUntil(boss, (current) => current.pose === 'firing', 90)
    expect(boss.aimedX).toBe(90)

    runUntil(boss, (current) => current.stanceTime >= 0.65 - PASS / 2, 400)
    expect(boss.x).toBeCloseTo(90, 6)
    expect(boss.y).toBeCloseTo(885, 6)
    expect(boss.aimedX).toBe(90)
  })

  it('fires nothing and clears the aim when the dive ends', () => {
    const boss = windingBoss('ram')

    const passes = runUntil(boss, (current) => current.pose === 'recovering', 90)

    expect(passes.every((pass) => pass.bullets.length === 0)).toBe(true)
    expect(boss.aimedX).toBeNull()
  })

  it('flies the plain patrol line while recovering', () => {
    const boss = windingBoss('ram')
    runUntil(boss, (current) => current.pose === 'recovering', 90)

    updateBoss(boss, PASS, 1, 90, ids())

    const t = boss.age - ENTRY_DURATION
    expect(boss.x).toBeCloseTo(270 + Math.sin(2 * Math.PI * t * 0.09) * 150, 9)
    expect(boss.y).toBeCloseTo(150 + (1 - Math.cos(2 * Math.PI * t * 0.14)) * 45, 9)
  })
})

describe('beam', () => {
  it('opens on the pass the wind-up ends, top edge at the muzzle', () => {
    const boss = windingBoss('beam', 1.25)

    const passes = runUntil(boss, (current) => current.pose === 'firing')
    const opened = passes.at(-1)?.beamOpened

    expect(opened).toEqual({ id: 501, x: boss.x, y: boss.y + 66 * 1.25 + 500 })
    expect(boss.beam).toBe(opened)
  })

  it('follows the boss every pass and closes when firing ends', () => {
    const boss = windingBoss('beam')
    runUntil(boss, (current) => current.pose === 'firing')
    const beam = boss.beam as NonNullable<Boss['beam']>

    updateBoss(boss, PASS, 1, 270, ids())
    expect([beam.x, beam.y]).toEqual([boss.x, boss.y + 66 + 500])

    const passes = runUntil(boss, (current) => current.pose === 'recovering')
    expect(passes.at(-1)?.beamClosed).toBe(beam)
    expect(passes.every((pass) => pass.bullets.length === 0)).toBe(true)
    expect(boss.beam).toBeNull()
  })
})

describe('damage', () => {
  it('loses hit points once arrived and is destroyed at 0 or below', () => {
    const boss = windingBoss('straight')

    expect(damageBoss(boss, 899)).toBe('hit')
    expect(damageBoss(boss, 1)).toBe('destroyed')
    expect(boss.hp).toBe(0)
  })
})
