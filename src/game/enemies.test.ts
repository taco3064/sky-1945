import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ENEMY_STATS, createEnemy, fireEnemy, moveEnemy } from './enemies.ts'
import { roundMultiplier, roundSchedule, type EnemyKind, type Squad } from './rounds.ts'

const PASS = 1 / 60 / 4

function squadOf(kind: EnemyKind, overrides: Partial<Squad> = {}): Squad {
  return {
    slot: 0,
    time: 0,
    kind,
    path: 'dive',
    edge: 'top',
    lanes: [0.5],
    entries: [{ x: 270, y: -40 }],
    ...overrides,
  }
}

describe('enemy stats', () => {
  it('matches the kind table', () => {
    assert.deepEqual(ENEMY_STATS.small, { hp: 20, radius: 13, speed: 165, damage: 8, interval: 1.1, pattern: 'straight' })
    assert.deepEqual(ENEMY_STATS.medium, { hp: 60, radius: 20, speed: 115, damage: 10, interval: 1.6, pattern: 'spread' })
    assert.deepEqual(ENEMY_STATS.large, { hp: 160, radius: 32, speed: 72, damage: 12, interval: 2.2, pattern: 'radial' })
  })
})

describe('enemy flight', () => {
  it('appears at its entry point with full HP and an arc bowing inwards', () => {
    const squad = roundSchedule(3)[2]
    const enemy = createEnemy(squad, 1)
    assert.deepEqual([enemy.x, enemy.y], [squad.entries[1].x, squad.entries[1].y])
    assert.deepEqual([enemy.kind, enemy.path, enemy.edge, enemy.hp, enemy.inward], ['small', 'arc', 'left', 20, 1])
  })

  it('travels at speed × m and follows its path', () => {
    const enemy = createEnemy(squadOf('medium'), 0)
    for (let i = 0; i < 240; i++) moveEnemy(enemy, PASS, 1.5)
    assert.ok(Math.abs(enemy.travelled - 172.5) < 1e-9)
    assert.ok(Math.abs(enemy.age - 1) < 1e-9)
    assert.ok(Math.abs(enemy.y - (-40 + 172.5)) < 1e-9)
  })

  it('leaves once it is more than 60 u outside the field', () => {
    const enemy = createEnemy(squadOf('small'), 0)
    enemy.travelled = 1060 - 1
    assert.equal(moveEnemy(enemy, 0, 1), true)
    assert.equal(moveEnemy(enemy, 2 / 165, 1), false)
  })
})

describe('enemy fire', () => {
  // §14.2 — per kind: move, bullet speed, damage in rounds 1, 2, 7 and 11
  const ROWS: [round: number, kind: EnemyKind, bullet: number, damage: number][] = [
    [1, 'small', 260, 8],
    [2, 'small', 272.25, 8.8],
    [7, 'medium', 276, 16],
    [11, 'small', 495, 16],
    [11, 'medium', 345, 20],
    [11, 'large', 260, 24],
  ]

  for (const [round, kind, bullet, damage] of ROWS) {
    it(`${kind} in round ${round} fires at ${bullet} u/s for ${damage}`, () => {
      const m = roundMultiplier(round)
      const enemy = createEnemy(squadOf(kind), 0)
      enemy.y = 300
      const shots = fireEnemy(enemy, ENEMY_STATS[kind].interval / m, m)
      assert.ok(shots.length > 0)
      for (const shot of shots) {
        assert.ok(Math.abs(shot.speed - bullet) < 1e-9)
        assert.ok(Math.abs(shot.damage - damage) < 1e-9)
      }
    })
  }

  it('leaves from the nose (radius + 6 below) for straight and spread, and from the centre for radial', () => {
    const muzzles: [EnemyKind, number, number][] = [
      ['small', 19, 1],
      ['medium', 26, 5],
      ['large', 0, 10],
    ]
    for (const [kind, ahead, count] of muzzles) {
      const enemy = createEnemy(squadOf(kind), 0)
      enemy.x = 100
      enemy.y = 300
      const shots = fireEnemy(enemy, 10, 1)
      assert.equal(shots.length, count)
      assert.ok(shots.every((shot) => shot.x === 100 && shot.y === 300 + ahead))
    }
  })

  it('runs the fire timer only while below the top edge and drops the remainder', () => {
    const enemy = createEnemy(squadOf('small'), 0)
    assert.deepEqual(fireEnemy(enemy, 5, 1), [])
    assert.equal(enemy.fireTimer, 0)

    enemy.y = 1
    assert.deepEqual(fireEnemy(enemy, 1, 1), [])
    assert.equal(fireEnemy(enemy, 0.5, 1).length, 1)
    assert.equal(enemy.fireTimer, 0)
  })

  it('flies speed × interval below the top edge before its first volley in every round', () => {
    for (const round of [1, 5, 11]) {
      const m = roundMultiplier(round)
      const enemy = createEnemy(squadOf('small', { entries: [{ x: 270, y: 0 }] }), 0)
      do {
        moveEnemy(enemy, PASS, m)
      } while (fireEnemy(enemy, PASS, m).length === 0)
      assert.ok(Math.abs(enemy.travelled - 181.5) < 165 * m * PASS * 1.5, `round ${round}`)
    }
  })
})
