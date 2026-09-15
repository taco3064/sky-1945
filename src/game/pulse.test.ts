import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { PULSE_MAX, grazePulse, isGraze } from './pulse.ts'

describe('pulse energy', () => {
  it('gains 8 per graze and clamps at 100', () => {
    const readings = [0]
    for (let i = 0; i < 13; i++) readings.push(grazePulse(readings[readings.length - 1]))
    assert.deepEqual(readings, [0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 100])
    assert.equal(grazePulse(PULSE_MAX), 100)
  })
})

describe('graze distance', () => {
  it('grazes from just outside the 7 u hit distance out to 28 u', () => {
    assert.ok(!isGraze(0))
    assert.ok(!isGraze(7))
    assert.ok(isGraze(7.01))
    assert.ok(isGraze(28))
    assert.ok(!isGraze(28.01))
  })
})
