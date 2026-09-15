import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ATTACK_TIMING,
  BOSS_ARRIVAL_AGE,
  advanceBossStance,
  bossHitPoints,
  bossHitRadius,
  bossMuzzleY,
  createBoss,
  moveBoss,
  type Boss,
  type BossStance,
} from './boss.ts'
import { bossAttack, type BossAttack } from './bossAttacks.ts'

/** One pass at a steady 60 Hz. */
const PASS = 1 / 60 / 4

function sequence(values: number[]): () => number {
  let index = 0
  return () => values[index++]
}

function arrivedBoss(size: number, attack: BossAttack): Boss {
  const boss = createBoss(1, sequence([0, 0]))
  boss.size = size
  while (boss.stance === 'entering') {
    moveBoss(boss, PASS)
    advanceBossStance(boss, 270, 1)
  }
  boss.attack = attack
  return boss
}

/** Runs passes until the stance changes; returns the simulated seconds that took and what was fired. */
function runStance(boss: Boss, playerX = 270) {
  const from: BossStance = boss.stance
  let elapsed = 0
  let volleys = 0
  let bullets = 0
  const beams: string[] = []
  while (boss.stance === from) {
    moveBoss(boss, PASS)
    elapsed += PASS
    const { shots, beam } = advanceBossStance(boss, playerX, 1)
    if (shots.length > 0) volleys += 1
    bullets += shots.length
    if (beam) beams.push(beam)
  }
  return { elapsed, volleys, bullets, beams }
}

describe('boss size and hit points', () => {
  // §14.3
  const TABLE: [round: number, hp: number[]][] = [
    [1, [720, 900, 1350, 1800]],
    [2, [1240, 1550, 2325, 3100]],
    [3, [1760, 2200, 3300, 4400]],
    [4, [2280, 2850, 4275, 5700]],
    [5, [2800, 3500, 5250, 7000]],
    [6, [3320, 4150, 6225, 8300]],
    [7, [3840, 4800, 7200, 9600]],
    [8, [4360, 5450, 8175, 10900]],
  ]
  const SIZES = [0.8, 1, 1.5, 2]

  for (const [round, hps] of TABLE) {
    it(`round ${round} hit points match the reference`, () => {
      SIZES.forEach((size, i) => assert.ok(Math.abs(bossHitPoints(round, size) - hps[i]) < 1e-9))
    })
  }

  it('rolls the size first, then the seed', () => {
    const boss = createBoss(2, sequence([0.5, 0.25]))
    assert.ok(Math.abs(boss.size - 1.4) < 1e-12)
    assert.equal(boss.seed, Math.floor(0.25 * 0xffffffff))
    assert.equal(boss.hp, bossHitPoints(2, boss.size))
    assert.equal(boss.maxHp, boss.hp)
    assert.deepEqual([boss.x, boss.y, boss.stance, boss.attack], [270, -52, 'entering', null])
  })

  it('covers sizes 0.8 up to (not including) 2.0 and seeds 0 … 4,294,967,294', () => {
    const low = createBoss(1, sequence([0, 0]))
    const high = createBoss(1, sequence([0.9999999999, 0.9999999999]))
    assert.equal(low.size, 0.8)
    assert.equal(low.seed, 0)
    assert.ok(high.size < 2)
    assert.equal(high.seed, 4294967294)
  })

  it('scales the hit circle and the muzzle with size', () => {
    assert.equal(bossHitRadius(2), 104)
    const boss = createBoss(1, sequence([0, 0]))
    boss.size = 1.5
    boss.y = 100
    assert.equal(bossMuzzleY(boss), 199)
  })
})

describe('boss entry and patrol', () => {
  it('flies down at 420 u/s and arrives at y = 150 after 0.48095 s, then winds up its first attack', () => {
    const boss = createBoss(1, sequence([0.2, 0.5]))
    let passes = 0
    while (boss.stance === 'entering') {
      moveBoss(boss, PASS)
      advanceBossStance(boss, 270, 1)
      passes += 1
      if (boss.stance === 'entering') assert.ok(boss.y < 150)
    }
    assert.ok(Math.abs(BOSS_ARRIVAL_AGE - 0.48095) < 1e-5)
    assert.equal(passes, Math.ceil(BOSS_ARRIVAL_AGE / PASS))
    assert.equal(boss.y, 150)
    assert.equal(boss.x, 270)
    assert.equal(boss.stance, 'winding')
    assert.equal(boss.attack, bossAttack(boss.seed, 0))
  })

  it('patrols x across 120 … 420 and y across 150 … 240 with size-scaled periods', () => {
    for (const size of [0.8, 1, 2]) {
      const boss = arrivedBoss(size, 'straight')
      const t0 = boss.age - BOSS_ARRIVAL_AGE
      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity
      // Hold the stance so only the patrol moves the boss.
      for (let i = 0; i < (size / 0.09) * 240; i++) {
        moveBoss(boss, PASS)
        minX = Math.min(minX, boss.x)
        maxX = Math.max(maxX, boss.x)
        minY = Math.min(minY, boss.y)
        maxY = Math.max(maxY, boss.y)
      }
      assert.ok(Math.abs(minX - 120) < 0.01 && Math.abs(maxX - 420) < 0.01, `size ${size} x`)
      assert.ok(minY >= 150 - 1e-9 && Math.abs(maxY - 240) < 0.01, `size ${size} y`)

      const t = boss.age - BOSS_ARRIVAL_AGE
      assert.ok(t > t0)
      assert.ok(Math.abs(boss.x - (270 + Math.sin((2 * Math.PI * t * 0.09) / size) * 150)) < 1e-9)
    }
  })
})

describe('boss stance machine', () => {
  const CYCLES: [BossAttack, number, number][] = [
    ['straight', 0.45, 1.5],
    ['spread', 0.6, 1.4],
    ['radial', 0.7, 1.2],
    ['beam', 1.4, 1.1],
    ['ram', 1.0, 1.3],
  ]

  for (const [attack, windUp, duration] of CYCLES) {
    it(`${attack}: winds up ${windUp} s, fires ${duration} s, recovers 0.4 s`, () => {
      assert.deepEqual(
        [ATTACK_TIMING[attack].windUp, ATTACK_TIMING[attack].duration],
        [windUp, duration],
      )
      const boss = arrivedBoss(1, attack)
      const winding = runStance(boss)
      const firing = runStance(boss)
      const recovering = runStance(boss)

      assert.ok(winding.elapsed >= windUp && winding.elapsed < windUp + PASS * 1.5)
      assert.ok(firing.elapsed >= duration && firing.elapsed < duration + PASS * 1.5)
      assert.ok(recovering.elapsed >= 0.4 && recovering.elapsed < 0.4 + PASS * 1.5)
      assert.equal(winding.bullets, 0)
      assert.equal(recovering.bullets, 0)
      assert.equal(boss.stance, 'winding')
      assert.equal(boss.attackIndex, 1)
      assert.equal(boss.attack, bossAttack(boss.seed, 1))
    })
  }

  // §12.9.8 — volleys (bullets) per attack at a steady 60 Hz
  const VOLLEYS: [BossAttack, number, number[]][] = [
    ['straight', 1, [15, 18, 23, 28, 36]],
    ['spread', 5, [5, 6, 7, 9, 11]],
    ['radial', 10, [4, 5, 6, 7, 9]],
  ]
  const SIZES = [0.8, 1, 1.25, 1.5, 2]

  for (const [attack, perVolley, counts] of VOLLEYS) {
    it(`${attack} emits the reference volley counts for sizes ${SIZES.join(', ')}`, () => {
      SIZES.forEach((size, i) => {
        const boss = arrivedBoss(size, attack)
        runStance(boss)
        const firing = runStance(boss)
        assert.equal(firing.volleys, counts[i], `size ${size}`)
        assert.equal(firing.bullets, counts[i] * perVolley, `size ${size}`)
      })
    })
  }

  it('fires straight and spread from the muzzle and radial from the centre, at 320 u/s for 14m damage', () => {
    for (const attack of ['straight', 'spread', 'radial'] as const) {
      const boss = arrivedBoss(1.5, attack)
      runStance(boss)
      moveBoss(boss, PASS)
      const { shots } = advanceBossStance(boss, 270, 1.3)
      const expectedY = attack === 'radial' ? boss.y : boss.y + 66 * 1.5
      for (const shot of shots) {
        assert.equal(shot.x, boss.x)
        assert.ok(Math.abs(shot.y - expectedY) < 1e-9)
        assert.equal(shot.speed, 320)
        assert.ok(Math.abs(shot.damage - 18.2) < 1e-9)
      }
      assert.deepEqual(
        shots.map((shot) => shot.heading),
        { straight: [90], spread: [60, 75, 90, 105, 120], radial: [0, 36, 72, 108, 144, 180, 216, 252, 288, 324] }[attack],
      )
    }
  })

  it('opens the beam when the wind-up ends and closes it when firing ends', () => {
    const boss = arrivedBoss(1, 'beam')
    const winding = runStance(boss)
    const firing = runStance(boss)
    assert.deepEqual(winding.beams, ['open'])
    assert.deepEqual(firing.beams, ['close'])
    assert.equal(firing.bullets, 0)
  })

  it('ram: recoils 70 u, locks the player column, and dives to x = aimedX, y = 885 at mid-dive', () => {
    const boss = arrivedBoss(1, 'ram')
    const patrol = () => {
      const t = boss.age - BOSS_ARRIVAL_AGE
      return {
        x: 270 + Math.sin(2 * Math.PI * t * 0.09) * 150,
        y: 150 + (1 - Math.cos(2 * Math.PI * t * 0.14)) * 45,
      }
    }

    boss.stanceTime = 0.5
    moveBoss(boss, 0)
    assert.ok(Math.abs(boss.x - patrol().x) < 1e-9)
    assert.ok(Math.abs(boss.y - (patrol().y - 35)) < 1e-9)

    runStance(boss, 400)
    assert.equal(boss.stance, 'firing')
    assert.equal(boss.aimedX, 400)

    boss.stanceTime = 0.65
    moveBoss(boss, 0)
    assert.ok(Math.abs(boss.x - 400) < 1e-9)
    assert.ok(Math.abs(boss.y - 885) < 1e-9)

    const dive = runStance(boss, 100)
    assert.equal(dive.bullets, 0)
    assert.equal(boss.stance, 'recovering')
    assert.equal(boss.aimedX, null)
    moveBoss(boss, 0)
    assert.ok(Math.abs(boss.x - patrol().x) < 1e-9)
    assert.ok(Math.abs(boss.y - patrol().y) < 1e-9)
  })
})
