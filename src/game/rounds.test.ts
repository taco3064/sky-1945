import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Edge, PathName } from './paths.ts'
import { roundMultiplier, roundSchedule, roundWaves, type EnemyKind } from './rounds.ts'

/** The reference tables round lanes and entries to two decimals. */
function assertNear(actual: number, expected: number, label: string) {
  assert.ok(Math.abs(actual - expected) <= 0.005 + 1e-9, `${label}: ${actual} ≉ ${expected}`)
}

type Row = [
  slot: number,
  time: number,
  kind: EnemyKind,
  path: PathName,
  edge: Edge,
  lanes: number[],
  entries: [number, number][],
]

// §14.4 — squad schedules
const SCHEDULES: Record<number, Row[]> = {
  1: [
    [0, 0, 'small', 'weave', 'top', [0.1, 0.2, 0.3, 0.4], [[138.8, -40], [171.6, -40], [204.4, -40], [237.2, -40]]],
    [1, 0.7, 'small', 'dive', 'top', [0.6, 0.7, 0.8, 0.9], [[316.8, -40], [363.6, -40], [410.4, -40], [457.2, -40]]],
    [2, 2.75, 'small', 'weave', 'top', [0.1, 0.2, 0.3, 0.4], [[138.8, -40], [171.6, -40], [204.4, -40], [237.2, -40]]],
    [3, 3.45, 'small', 'dive', 'top', [0.6, 0.7, 0.8, 0.9], [[316.8, -40], [363.6, -40], [410.4, -40], [457.2, -40]]],
    [4, 5.5, 'medium', 'weave', 'top', [0.2, 0.4, 0.6, 0.8], [[171.6, -40], [237.2, -40], [302.8, -40], [368.4, -40]]],
    [5, 8.25, 'large', 'dive', 'top', [0.33, 0.67], [[192, -40], [348, -40]]],
  ],
  2: [
    [0, 0, 'small', 'dive', 'top', [0.1, 0.2, 0.3, 0.4], [[82.8, -40], [129.6, -40], [176.4, -40], [223.2, -40]]],
    [1, 0.7, 'small', 'weave', 'top', [0.6, 0.7, 0.8, 0.9], [[302.8, -40], [335.6, -40], [368.4, -40], [401.2, -40]]],
    [2, 2.75, 'small', 'arc', 'top', [0.1, 0.2, 0.3, 0.4], [[82.8, -40], [129.6, -40], [176.4, -40], [223.2, -40]]],
    [3, 3.45, 'small', 'dive', 'top', [0.6, 0.7, 0.8, 0.9], [[316.8, -40], [363.6, -40], [410.4, -40], [457.2, -40]]],
    [4, 5.5, 'medium', 'weave', 'top', [0.2, 0.4, 0.6, 0.8], [[171.6, -40], [237.2, -40], [302.8, -40], [368.4, -40]]],
    [5, 8.25, 'large', 'arc', 'top', [0.33, 0.67], [[192, -40], [348, -40]]],
  ],
  3: [
    [0, 0, 'small', 'dive', 'top', [0.07, 0.13, 0.2, 0.27], [[67.2, -40], [98.4, -40], [129.6, -40], [160.8, -40]]],
    [1, 0.7, 'small', 'weave', 'top', [0.42, 0.5, 0.58], [[242.67, -40], [270, -40], [297.33, -40]]],
    [2, 1.4, 'small', 'arc', 'left', [0.75, 0.83, 0.92], [[-40, 331.2], [-40, 355.2], [-40, 379.2]]],
    [3, 2.75, 'small', 'dive', 'top', [0.07, 0.13, 0.2, 0.27], [[67.2, -40], [98.4, -40], [129.6, -40], [160.8, -40]]],
    [4, 3.45, 'small', 'weave', 'top', [0.42, 0.5, 0.58], [[242.67, -40], [270, -40], [297.33, -40]]],
    [5, 4.15, 'small', 'arc', 'right', [0.75, 0.83, 0.92], [[580, 331.2], [580, 355.2], [580, 379.2]]],
    [6, 5.5, 'medium', 'dive', 'top', [0.13, 0.25, 0.38], [[94.5, -40], [153, -40], [211.5, -40]]],
    [7, 6.2, 'medium', 'weave', 'top', [0.63, 0.75, 0.88], [[311, -40], [352, -40], [393, -40]]],
    [8, 8.25, 'large', 'arc', 'left', [0.2, 0.4, 0.6, 0.8], [[-40, 172.8], [-40, 230.4], [-40, 288], [-40, 345.6]]],
  ],
  4: [
    [0, 0, 'small', 'arc', 'top', [0.07, 0.13, 0.2, 0.27], [[67.2, -40], [98.4, -40], [129.6, -40], [160.8, -40]]],
    [1, 0.7, 'small', 'hover', 'top', [0.42, 0.5, 0.58], [[231, -40], [270, -40], [309, -40]]],
    [2, 1.4, 'small', 'feint', 'left', [0.75, 0.83, 0.92], [[-40, 331.2], [-40, 355.2], [-40, 379.2]]],
    [3, 2.75, 'small', 'dive', 'top', [0.07, 0.13, 0.2, 0.27], [[67.2, -40], [98.4, -40], [129.6, -40], [160.8, -40]]],
    [4, 3.45, 'small', 'weave', 'top', [0.42, 0.5, 0.58], [[242.67, -40], [270, -40], [297.33, -40]]],
    [5, 4.15, 'small', 'arc', 'right', [0.75, 0.83, 0.92], [[580, 331.2], [580, 355.2], [580, 379.2]]],
    [6, 5.5, 'medium', 'hover', 'top', [0.13, 0.25, 0.38], [[94.5, -40], [153, -40], [211.5, -40]]],
    [7, 6.2, 'medium', 'feint', 'top', [0.63, 0.75, 0.88], [[328.5, -40], [387, -40], [445.5, -40]]],
    [8, 8.25, 'large', 'dive', 'left', [0.2, 0.4, 0.6, 0.8], [[-40, 172.8], [-40, 230.4], [-40, 288], [-40, 345.6]]],
  ],
  5: [
    [0, 0, 'small', 'dive', 'top', [0.07, 0.13, 0.2, 0.27], [[67.2, -40], [98.4, -40], [129.6, -40], [160.8, -40]]],
    [1, 0.7, 'small', 'weave', 'top', [0.4, 0.47, 0.53, 0.6], [[237.2, -40], [259.07, -40], [280.93, -40], [302.8, -40]]],
    [2, 1.4, 'small', 'arc', 'left', [0.73, 0.8, 0.87, 0.93], [[-40, 326.4], [-40, 345.6], [-40, 364.8], [-40, 384]]],
    [3, 2.75, 'small', 'hover', 'top', [0.07, 0.13, 0.2, 0.27], [[67.2, -40], [98.4, -40], [129.6, -40], [160.8, -40]]],
    [4, 3.45, 'small', 'feint', 'top', [0.4, 0.47, 0.53, 0.6], [[223.2, -40], [254.4, -40], [285.6, -40], [316.8, -40]]],
    [5, 4.15, 'small', 'dive', 'right', [0.73, 0.8, 0.87, 0.93], [[580, 326.4], [580, 345.6], [580, 364.8], [580, 384]]],
    [6, 5.5, 'medium', 'weave', 'top', [0.1, 0.2, 0.3, 0.4], [[138.8, -40], [171.6, -40], [204.4, -40], [237.2, -40]]],
    [7, 6.2, 'medium', 'arc', 'top', [0.6, 0.7, 0.8, 0.9], [[316.8, -40], [363.6, -40], [410.4, -40], [457.2, -40]]],
    [8, 8.25, 'large', 'hover', 'left', [0.2, 0.4, 0.6, 0.8], [[-40, 172.8], [-40, 230.4], [-40, 288], [-40, 345.6]]],
  ],
  9: [
    [0, 0, 'small', 'arc', 'top', [0.05, 0.1, 0.15, 0.2], [[59.4, -40], [82.8, -40], [106.2, -40], [129.6, -40]]],
    [1, 0.7, 'small', 'hover', 'top', [0.3, 0.35, 0.4, 0.45], [[176.4, -40], [199.8, -40], [223.2, -40], [246.6, -40]]],
    [2, 1.4, 'small', 'feint', 'left', [0.55, 0.6, 0.65, 0.7], [[-40, 273.6], [-40, 288], [-40, 302.4], [-40, 316.8]]],
    [3, 2.1, 'small', 'dive', 'top', [0.8, 0.85, 0.9, 0.95], [[410.4, -40], [433.8, -40], [457.2, -40], [480.6, -40]]],
    [4, 2.75, 'small', 'weave', 'top', [0.05, 0.1, 0.15, 0.2], [[122.4, -40], [138.8, -40], [155.2, -40], [171.6, -40]]],
    [5, 3.45, 'small', 'arc', 'right', [0.3, 0.35, 0.4, 0.45], [[580, 201.6], [580, 216], [580, 230.4], [580, 244.8]]],
    [6, 4.15, 'small', 'hover', 'top', [0.55, 0.6, 0.65, 0.7], [[293.4, -40], [316.8, -40], [340.2, -40], [363.6, -40]]],
    [7, 4.85, 'small', 'feint', 'top', [0.8, 0.85, 0.9, 0.95], [[410.4, -40], [433.8, -40], [457.2, -40], [480.6, -40]]],
    [8, 5.5, 'medium', 'dive', 'left', [0.1, 0.2, 0.3, 0.4], [[-40, 144], [-40, 172.8], [-40, 201.6], [-40, 230.4]]],
    [9, 6.2, 'medium', 'weave', 'top', [0.6, 0.7, 0.8, 0.9], [[302.8, -40], [335.6, -40], [368.4, -40], [401.2, -40]]],
    [10, 8.25, 'large', 'arc', 'top', [0.2, 0.4, 0.6, 0.8], [[129.6, -40], [223.2, -40], [316.8, -40], [410.4, -40]]],
  ],
}

// §14.2 — round → m and wave counts (S, S, M, L)
const ROUNDS: [round: number, m: number, counts: number[]][] = [
  [1, 1.0, [8, 8, 4, 2]],
  [2, 1.1, [8, 8, 4, 2]],
  [3, 1.2, [10, 10, 6, 4]],
  [4, 1.3, [10, 10, 6, 4]],
  [5, 1.4, [12, 12, 8, 4]],
  [6, 1.5, [12, 12, 8, 4]],
  [7, 1.6, [14, 14, 8, 4]],
  [8, 1.7, [14, 14, 8, 4]],
  [9, 1.8, [16, 16, 8, 4]],
  [10, 1.9, [16, 16, 8, 4]],
  [11, 2.0, [16, 16, 8, 4]],
  [30, 2.0, [16, 16, 8, 4]],
]

describe('round difficulty', () => {
  for (const [round, m, counts] of ROUNDS) {
    it(`round ${round} has m = ${m} and waves ${counts.join(', ')}`, () => {
      assertNear(roundMultiplier(round), m, 'm')
      assert.deepEqual(
        roundWaves(round).map((wave) => wave.count),
        counts,
      )
      assert.deepEqual(
        roundWaves(round).map((wave) => wave.kind),
        ['small', 'small', 'medium', 'large'],
      )
    })
  }

  it('treats rounds below 1 as round 1', () => {
    assert.equal(roundMultiplier(0), 1)
  })
})

describe('squad schedule', () => {
  for (const [round, rows] of Object.entries(SCHEDULES)) {
    it(`round ${round} matches the reference schedule`, () => {
      const schedule = roundSchedule(Number(round))
      assert.equal(schedule.length, rows.length)

      rows.forEach(([slot, time, kind, path, edge, lanes, entries], index) => {
        const squad = schedule[index]
        const label = `round ${round} slot ${slot}`
        assert.equal(squad.slot, slot, label)
        assertNear(squad.time, time, `${label} time`)
        assert.equal(squad.kind, kind, label)
        assert.equal(squad.path, path, label)
        assert.equal(squad.edge, edge, label)
        assert.equal(squad.lanes.length, lanes.length, label)
        lanes.forEach((lane, i) => assertNear(squad.lanes[i], lane, `${label} lane ${i}`))
        entries.forEach(([x, y], i) => {
          assertNear(squad.entries[i].x, x, `${label} entry ${i} x`)
          assertNear(squad.entries[i].y, y, `${label} entry ${i} y`)
        })
      })
    })
  }

  it('alternates left and right side entries on every third slot from round 3', () => {
    const edges = roundSchedule(6).map((squad) => squad.edge)
    assert.deepEqual(edges.slice(0, 6), ['top', 'top', 'left', 'top', 'top', 'right'])
  })
})
