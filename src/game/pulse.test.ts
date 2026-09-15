import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  PULSE_MAX,
  grazePulse,
  inPulse,
  isGraze,
  pulseProgress,
  pulseRadius,
  startPulseDrive,
} from './pulse.ts'

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

describe('pulse drive', () => {
  it('runs 0.6 s from the moment it starts and has hit nothing yet', () => {
    const drive = startPulseDrive(2)
    assert.deepEqual([drive.startedAt, drive.endsAt, drive.touched.size], [2, 2.6, 0])
  })

  it('grows its radius linearly from 0 to 180 u over 0.6 s, then holds', () => {
    assert.deepEqual(
      [0, 0.15, 0.3, 0.45, 0.6].map(pulseRadius),
      [0, 45, 90, 135, 180],
    )
    assert.equal(pulseRadius(0.9), 180)
    assert.equal(pulseRadius(-0.1), 0)
    assert.deepEqual([pulseProgress(-1), pulseProgress(0.3), pulseProgress(2)], [0, 0.5, 1])
  })

  it('reaches a bullet centre inside the radius, and an aircraft within the radius plus its hit radius', () => {
    assert.ok(inPulse(89, 90))
    assert.ok(inPulse(90, 90))
    assert.ok(!inPulse(91, 90))
    // A small enemy (13) and a size-1.5 boss (78) against a 100 u Pulse.
    assert.ok(inPulse(112, 100, 13))
    assert.ok(!inPulse(114, 100, 13))
    assert.ok(inPulse(177, 100, 78))
    assert.ok(!inPulse(179, 100, 78))
  })
})
