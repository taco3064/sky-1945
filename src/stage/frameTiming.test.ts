import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { FrameMeter, frameMeterText, isSlowReading, stepSeconds } from './frameTiming.ts'

describe('step duration', () => {
  it('clamps a frame to 0 … 1/60 s', () => {
    assert.equal(stepSeconds(-3), 0)
    assert.equal(stepSeconds(8), 0.008)
    assert.equal(stepSeconds(50), 1 / 60)
  })
})

describe('frame meter', () => {
  it('publishes fps and the worst frame once the window reaches 500 ms', () => {
    const meter = new FrameMeter()
    for (let i = 0; i < 29; i++) assert.equal(meter.add(16.7), null)
    assert.deepEqual(meter.add(19.6), { fps: 60, worst: 20 })
  })

  it('starts a new window after publishing', () => {
    const meter = new FrameMeter()
    meter.add(600)
    for (let i = 0; i < 9; i++) assert.equal(meter.add(50), null)
    assert.deepEqual(meter.add(50), { fps: 20, worst: 50 })
  })

  it('reads 0 fps for a single frame longer than 2 s', () => {
    const meter = new FrameMeter()
    assert.deepEqual(meter.add(2500), { fps: 0, worst: 2500 })
  })

  it('formats a reading, and marks 0 < fps < 55 as slow', () => {
    assert.equal(frameMeterText({ fps: 0, worst: 2500 }), '—')
    assert.equal(frameMeterText({ fps: 60, worst: 17 }), '60 FPS · 17ms')
    assert.equal(isSlowReading({ fps: 0, worst: 0 }), false)
    assert.equal(isSlowReading({ fps: 54, worst: 30 }), true)
    assert.equal(isSlowReading({ fps: 55, worst: 20 }), false)
  })
})
