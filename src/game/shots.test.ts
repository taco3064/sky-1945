import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { shotVelocity, volley } from './shots.ts'

describe('fire patterns', () => {
  it('straight fires one bullet on the heading', () => {
    assert.deepEqual(volley('straight', 1, 2, 90, 300, 8), [{ x: 1, y: 2, heading: 90, speed: 300, damage: 8 }])
  })

  it('spread fires five bullets 15° apart around the heading', () => {
    assert.deepEqual(
      volley('spread', 0, 0, 90, 1, 1).map((shot) => shot.heading),
      [60, 75, 90, 105, 120],
    )
  })

  it('radial fires ten bullets 36° apart, ignoring the heading', () => {
    assert.deepEqual(
      volley('radial', 0, 0, 90, 1, 1).map((shot) => shot.heading),
      [0, 36, 72, 108, 144, 180, 216, 252, 288, 324],
    )
  })

  it('turns a heading into a fixed velocity, 0° right and 90° down the screen', () => {
    const right = shotVelocity({ x: 0, y: 0, heading: 0, speed: 260, damage: 1 })
    const down = shotVelocity({ x: 0, y: 0, heading: 90, speed: 260, damage: 1 })
    assert.deepEqual([right.vx, right.vy], [260, 0])
    assert.ok(Math.abs(down.vx) < 1e-9 && down.vy === 260)
  })
})
