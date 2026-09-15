import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_SPEED_POINTS,
  clampSpeedPoints,
  powerMultiplier,
  powerPercent,
  speedMultiplier,
  speedPercent,
  statFill,
} from './loadout.ts'

// §14.1 — speed points → SPEED %, POWER %, player speed (u/s), bullet damage
const LOADOUT_TABLE: [number, number, number, number, number][] = [
  [0, 100, 200, 300, 15],
  [1, 110, 190, 330, 14.25],
  [2, 120, 180, 360, 13.5],
  [3, 130, 170, 390, 12.75],
  [4, 140, 160, 420, 12],
  [5, 150, 150, 450, 11.25],
  [6, 160, 140, 480, 10.5],
  [7, 170, 130, 510, 9.75],
  [8, 180, 120, 540, 9],
  [9, 190, 110, 570, 8.25],
  [10, 200, 100, 600, 7.5],
]

describe('loadout', () => {
  it('defaults to 5 points on speed', () => {
    assert.equal(DEFAULT_SPEED_POINTS, 5)
  })

  for (const [points, speed, power, playerSpeed, damage] of LOADOUT_TABLE) {
    it(`matches the reference row for ${points} speed points`, () => {
      assert.equal(speedPercent(points), speed)
      assert.equal(powerPercent(points), power)
      assert.ok(Math.abs(300 * speedMultiplier(points) - playerSpeed) < 1e-9)
      assert.ok(Math.abs(7.5 * powerMultiplier(points) - damage) < 1e-9)
    })
  }

  it('rounds and clamps an allocation to 0–10', () => {
    assert.equal(clampSpeedPoints(-1), 0)
    assert.equal(clampSpeedPoints(11), 10)
    assert.equal(clampSpeedPoints(4.4), 4)
    assert.equal(clampSpeedPoints(4.6), 5)
  })

  it('fills a stat bar from 100% (empty) to 200% (full)', () => {
    assert.equal(statFill(100), 0)
    assert.equal(statFill(150), 0.5)
    assert.equal(statFill(200), 1)
  })
})
