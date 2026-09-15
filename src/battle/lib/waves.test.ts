import { describe, expect, it } from 'vitest'
import type { EnemyKind } from './kinds'
import type { EnemyPath, EntryEdge } from './paths'
import { roundSchedule } from './waves'

type Row = [number, number, EnemyKind, EnemyPath, EntryEdge, number[], [number, number][]]

const T = -40
const L = -40
const R = 580

// game-spec 14.4: slot, t, kind, path, edge, lanes, entries (rounded to two decimals)
const SCHEDULES: Record<number, Row[]> = {
  1: [
    [0, 0, 'small', 'weave', 'top', [0.1, 0.2, 0.3, 0.4], [[138.8, T], [171.6, T], [204.4, T], [237.2, T]]],
    [1, 0.7, 'small', 'dive', 'top', [0.6, 0.7, 0.8, 0.9], [[316.8, T], [363.6, T], [410.4, T], [457.2, T]]],
    [2, 2.75, 'small', 'weave', 'top', [0.1, 0.2, 0.3, 0.4], [[138.8, T], [171.6, T], [204.4, T], [237.2, T]]],
    [3, 3.45, 'small', 'dive', 'top', [0.6, 0.7, 0.8, 0.9], [[316.8, T], [363.6, T], [410.4, T], [457.2, T]]],
    [4, 5.5, 'medium', 'weave', 'top', [0.2, 0.4, 0.6, 0.8], [[171.6, T], [237.2, T], [302.8, T], [368.4, T]]],
    [5, 8.25, 'large', 'dive', 'top', [0.33, 0.67], [[192, T], [348, T]]],
  ],
  2: [
    [0, 0, 'small', 'dive', 'top', [0.1, 0.2, 0.3, 0.4], [[82.8, T], [129.6, T], [176.4, T], [223.2, T]]],
    [1, 0.7, 'small', 'weave', 'top', [0.6, 0.7, 0.8, 0.9], [[302.8, T], [335.6, T], [368.4, T], [401.2, T]]],
    [2, 2.75, 'small', 'arc', 'top', [0.1, 0.2, 0.3, 0.4], [[82.8, T], [129.6, T], [176.4, T], [223.2, T]]],
    [3, 3.45, 'small', 'dive', 'top', [0.6, 0.7, 0.8, 0.9], [[316.8, T], [363.6, T], [410.4, T], [457.2, T]]],
    [4, 5.5, 'medium', 'weave', 'top', [0.2, 0.4, 0.6, 0.8], [[171.6, T], [237.2, T], [302.8, T], [368.4, T]]],
    [5, 8.25, 'large', 'arc', 'top', [0.33, 0.67], [[192, T], [348, T]]],
  ],
  3: [
    [0, 0, 'small', 'dive', 'top', [0.07, 0.13, 0.2, 0.27], [[67.2, T], [98.4, T], [129.6, T], [160.8, T]]],
    [1, 0.7, 'small', 'weave', 'top', [0.42, 0.5, 0.58], [[242.67, T], [270, T], [297.33, T]]],
    [2, 1.4, 'small', 'arc', 'left', [0.75, 0.83, 0.92], [[L, 331.2], [L, 355.2], [L, 379.2]]],
    [3, 2.75, 'small', 'dive', 'top', [0.07, 0.13, 0.2, 0.27], [[67.2, T], [98.4, T], [129.6, T], [160.8, T]]],
    [4, 3.45, 'small', 'weave', 'top', [0.42, 0.5, 0.58], [[242.67, T], [270, T], [297.33, T]]],
    [5, 4.15, 'small', 'arc', 'right', [0.75, 0.83, 0.92], [[R, 331.2], [R, 355.2], [R, 379.2]]],
    [6, 5.5, 'medium', 'dive', 'top', [0.13, 0.25, 0.38], [[94.5, T], [153, T], [211.5, T]]],
    [7, 6.2, 'medium', 'weave', 'top', [0.63, 0.75, 0.88], [[311, T], [352, T], [393, T]]],
    [8, 8.25, 'large', 'arc', 'left', [0.2, 0.4, 0.6, 0.8], [[L, 172.8], [L, 230.4], [L, 288], [L, 345.6]]],
  ],
  4: [
    [0, 0, 'small', 'arc', 'top', [0.07, 0.13, 0.2, 0.27], [[67.2, T], [98.4, T], [129.6, T], [160.8, T]]],
    [1, 0.7, 'small', 'hover', 'top', [0.42, 0.5, 0.58], [[231, T], [270, T], [309, T]]],
    [2, 1.4, 'small', 'feint', 'left', [0.75, 0.83, 0.92], [[L, 331.2], [L, 355.2], [L, 379.2]]],
    [3, 2.75, 'small', 'dive', 'top', [0.07, 0.13, 0.2, 0.27], [[67.2, T], [98.4, T], [129.6, T], [160.8, T]]],
    [4, 3.45, 'small', 'weave', 'top', [0.42, 0.5, 0.58], [[242.67, T], [270, T], [297.33, T]]],
    [5, 4.15, 'small', 'arc', 'right', [0.75, 0.83, 0.92], [[R, 331.2], [R, 355.2], [R, 379.2]]],
    [6, 5.5, 'medium', 'hover', 'top', [0.13, 0.25, 0.38], [[94.5, T], [153, T], [211.5, T]]],
    [7, 6.2, 'medium', 'feint', 'top', [0.63, 0.75, 0.88], [[328.5, T], [387, T], [445.5, T]]],
    [8, 8.25, 'large', 'dive', 'left', [0.2, 0.4, 0.6, 0.8], [[L, 172.8], [L, 230.4], [L, 288], [L, 345.6]]],
  ],
  5: [
    [0, 0, 'small', 'dive', 'top', [0.07, 0.13, 0.2, 0.27], [[67.2, T], [98.4, T], [129.6, T], [160.8, T]]],
    [1, 0.7, 'small', 'weave', 'top', [0.4, 0.47, 0.53, 0.6], [[237.2, T], [259.07, T], [280.93, T], [302.8, T]]],
    [2, 1.4, 'small', 'arc', 'left', [0.73, 0.8, 0.87, 0.93], [[L, 326.4], [L, 345.6], [L, 364.8], [L, 384]]],
    [3, 2.75, 'small', 'hover', 'top', [0.07, 0.13, 0.2, 0.27], [[67.2, T], [98.4, T], [129.6, T], [160.8, T]]],
    [4, 3.45, 'small', 'feint', 'top', [0.4, 0.47, 0.53, 0.6], [[223.2, T], [254.4, T], [285.6, T], [316.8, T]]],
    [5, 4.15, 'small', 'dive', 'right', [0.73, 0.8, 0.87, 0.93], [[R, 326.4], [R, 345.6], [R, 364.8], [R, 384]]],
    [6, 5.5, 'medium', 'weave', 'top', [0.1, 0.2, 0.3, 0.4], [[138.8, T], [171.6, T], [204.4, T], [237.2, T]]],
    [7, 6.2, 'medium', 'arc', 'top', [0.6, 0.7, 0.8, 0.9], [[316.8, T], [363.6, T], [410.4, T], [457.2, T]]],
    [8, 8.25, 'large', 'hover', 'left', [0.2, 0.4, 0.6, 0.8], [[L, 172.8], [L, 230.4], [L, 288], [L, 345.6]]],
  ],
  9: [
    [0, 0, 'small', 'arc', 'top', [0.05, 0.1, 0.15, 0.2], [[59.4, T], [82.8, T], [106.2, T], [129.6, T]]],
    [1, 0.7, 'small', 'hover', 'top', [0.3, 0.35, 0.4, 0.45], [[176.4, T], [199.8, T], [223.2, T], [246.6, T]]],
    [2, 1.4, 'small', 'feint', 'left', [0.55, 0.6, 0.65, 0.7], [[L, 273.6], [L, 288], [L, 302.4], [L, 316.8]]],
    [3, 2.1, 'small', 'dive', 'top', [0.8, 0.85, 0.9, 0.95], [[410.4, T], [433.8, T], [457.2, T], [480.6, T]]],
    [4, 2.75, 'small', 'weave', 'top', [0.05, 0.1, 0.15, 0.2], [[122.4, T], [138.8, T], [155.2, T], [171.6, T]]],
    [5, 3.45, 'small', 'arc', 'right', [0.3, 0.35, 0.4, 0.45], [[R, 201.6], [R, 216], [R, 230.4], [R, 244.8]]],
    [6, 4.15, 'small', 'hover', 'top', [0.55, 0.6, 0.65, 0.7], [[293.4, T], [316.8, T], [340.2, T], [363.6, T]]],
    [7, 4.85, 'small', 'feint', 'top', [0.8, 0.85, 0.9, 0.95], [[410.4, T], [433.8, T], [457.2, T], [480.6, T]]],
    [8, 5.5, 'medium', 'dive', 'left', [0.1, 0.2, 0.3, 0.4], [[L, 144], [L, 172.8], [L, 201.6], [L, 230.4]]],
    [9, 6.2, 'medium', 'weave', 'top', [0.6, 0.7, 0.8, 0.9], [[302.8, T], [335.6, T], [368.4, T], [401.2, T]]],
    [10, 8.25, 'large', 'arc', 'top', [0.2, 0.4, 0.6, 0.8], [[129.6, T], [223.2, T], [316.8, T], [410.4, T]]],
  ],
}

/** The table rounds to two decimals; half-way values such as 0.125 → 0.13 sit exactly on the edge. */
const ROUNDED = 0.005 + 1e-9

describe.each(Object.entries(SCHEDULES))('round %s', (round, rows) => {
  const schedule = roundSchedule(Number(round))

  it('has one squad per table row', () => {
    expect(schedule.length).toBe(rows.length)
  })

  it.each(rows)('slot %i arrives at %f s as %s %s from the %s', (slot, time, kind, path, edge, lanes, entries) => {
    const squad = schedule[slot]

    expect({ slot: squad.slot, kind: squad.kind, path: squad.path, edge: squad.edge }).toEqual({ slot, kind, path, edge })
    expect(squad.time).toBeCloseTo(time, 9)
    expect(squad.lanes.length).toBe(lanes.length)
    squad.lanes.forEach((lane, index) => expect(Math.abs(lane - lanes[index])).toBeLessThanOrEqual(ROUNDED))
    squad.entries.forEach((entry, index) => {
      expect(Math.abs(entry.x - entries[index][0])).toBeLessThanOrEqual(ROUNDED)
      expect(Math.abs(entry.y - entries[index][1])).toBeLessThanOrEqual(ROUNDED)
    })
  })
})

it('caps wave sizes at 16, 16, 8 and 4 craft', () => {
  const craft = (round: number) =>
    roundSchedule(round).reduce<Record<string, number>>((totals, squad) => {
      totals[squad.kind] = (totals[squad.kind] ?? 0) + squad.lanes.length
      return totals
    }, {})

  expect(craft(1)).toEqual({ small: 16, medium: 4, large: 2 })
  expect(craft(40)).toEqual({ small: 32, medium: 8, large: 4 })
})
