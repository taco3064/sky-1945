import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { entityTransform, fieldScale, nextLean } from './placement.ts'

describe('field scale', () => {
  it('fits the field to the narrower side of the viewport', () => {
    assert.equal(fieldScale(390, 844), 390 / 540)
    assert.equal(fieldScale(1440, 900), 900 / 960)
    assert.equal(fieldScale(540, 960), 1)
  })
})

describe('lean', () => {
  it('eases 18% of the way to slide / 4 each frame', () => {
    assert.equal(nextLean(0, 2), 0.09)
    assert.ok(Math.abs(nextLean(0.5, 0) - 0.41) < 1e-12)
  })

  it('caps the target at full lean either way', () => {
    assert.equal(nextLean(0, 40), 0.18)
    assert.equal(nextLean(0, -40), -0.18)
  })
})

describe('entity transform', () => {
  it('translates to the centre in u and turns by the angle', () => {
    assert.equal(entityTransform(12.5, -40, 180), 'translate3d(12.5px, -40px, 0) rotate(180deg)')
  })
})
