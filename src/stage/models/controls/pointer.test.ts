import { describe, expect, it } from 'vitest'
import { KNOB_REACH, isTap, moveSteering, startSteering } from './pointer'

describe('moveSteering', () => {
  it('steers nowhere inside the 5 px dead zone while the knob still follows', () => {
    const steering = startSteering(1, 100, 200, 0)

    expect(moveSteering(steering, 103, 203.9)).toEqual({ direction: { x: 0, y: 0 }, knob: { x: 3, y: expect.closeTo(3.9, 9) } })
    expect(steering.moved).toBe(false)
  })

  it('steers along the offset from 5 px on and remembers the move', () => {
    const steering = startSteering(1, 100, 200, 0)

    expect(moveSteering(steering, 103, 204)).toEqual({ direction: { x: 3, y: 4 }, knob: { x: 3, y: 4 } })
    expect(moveSteering(steering, 100, 200).direction).toEqual({ x: 0, y: 0 })
    expect(steering.moved).toBe(true)
  })

  it('caps the knob offset at 26 px', () => {
    const steering = startSteering(1, 0, 0, 0)

    const { direction, knob } = moveSteering(steering, 300, -400)

    expect(KNOB_REACH).toBe(26)
    expect(direction).toEqual({ x: 300, y: -400 })
    expect(knob.x).toBeCloseTo(15.6, 9)
    expect(knob.y).toBeCloseTo(-20.8, 9)
  })
})

describe('isTap', () => {
  it('is a tap when released within 200 ms without moving 5 px', () => {
    const steering = startSteering(1, 0, 0, 1000)

    expect(isTap(steering, 1199.9)).toBe(true)
    expect(isTap(steering, 1200)).toBe(false)
  })

  it('is not a tap once it moved, even back to the down point', () => {
    const steering = startSteering(1, 0, 0, 1000)
    moveSteering(steering, 5, 0)
    moveSteering(steering, 0, 0)

    expect(isTap(steering, 1050)).toBe(false)
  })
})
