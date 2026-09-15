import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { PointerGesture, arrowsDirection, isArrowKey, isPulseKey } from './controls.ts'

describe('arrow keys', () => {
  it('recognises only the four arrows', () => {
    assert.ok(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].every(isArrowKey))
    assert.ok(![' ', 'Escape', 'a', 'Enter', 'x'].some(isArrowKey))
  })

  it('sums held arrows, opposite keys cancelling', () => {
    assert.deepEqual(arrowsDirection([]), { x: 0, y: 0 })
    assert.deepEqual(arrowsDirection(['ArrowUp', 'ArrowRight']), { x: 1, y: -1 })
    assert.deepEqual(arrowsDirection(['ArrowLeft', 'ArrowRight', 'ArrowDown']), { x: 0, y: 1 })
  })
})

describe('pulse key', () => {
  it('is X in either case, or the X key whatever it types', () => {
    assert.ok(isPulseKey('x', 'KeyX'))
    assert.ok(isPulseKey('X', 'KeyX'))
    assert.ok(isPulseKey('Process', 'KeyX'))
    assert.ok(!isPulseKey('z', 'KeyZ'))
    assert.ok(!isPulseKey(' ', 'Space'))
  })
})

describe('pointer gesture', () => {
  it('steers with the first pointer and rolls for another pointer', () => {
    const gesture = new PointerGesture()
    assert.equal(gesture.down(1, 100, 100, 0), 'steer')
    assert.equal(gesture.down(2, 300, 300, 10), 'roll')
    assert.equal(gesture.move(2, 320, 300), null)
    assert.equal(gesture.up(2, 20), null)
  })

  it('keeps the direction at zero inside the 5 px dead zone while the knob still follows', () => {
    const gesture = new PointerGesture()
    gesture.down(1, 100, 100, 0)
    assert.deepEqual(gesture.move(1, 102, 104), { direction: { x: 0, y: 0 }, knob: { x: 2, y: 4 } })
  })

  it('steers by the offset from the down point and caps the knob at 26 px', () => {
    const gesture = new PointerGesture()
    gesture.down(1, 100, 100, 0)
    assert.deepEqual(gesture.move(1, 103, 104), { direction: { x: 3, y: 4 }, knob: { x: 3, y: 4 } })

    const far = gesture.move(1, 160, 180)
    assert.ok(far)
    assert.deepEqual(far.direction, { x: 60, y: 80 })
    assert.ok(Math.abs(far.knob.x - 15.6) < 1e-9 && Math.abs(far.knob.y - 20.8) < 1e-9)
  })

  it('rolls on a tap shorter than 200 ms that never moved 5 px', () => {
    const gesture = new PointerGesture()
    gesture.down(1, 100, 100, 1000)
    gesture.move(1, 102, 102)
    assert.deepEqual(gesture.up(1, 1199), { roll: true })
  })

  it('does not roll after a long hold or once the pointer has moved 5 px', () => {
    const held = new PointerGesture()
    held.down(1, 100, 100, 1000)
    assert.deepEqual(held.up(1, 1200), { roll: false })

    const moved = new PointerGesture()
    moved.down(1, 100, 100, 1000)
    moved.move(1, 105, 100)
    moved.move(1, 100, 100)
    assert.deepEqual(moved.up(1, 1050), { roll: false })
  })

  it('lets a new pointer steer after the steering pointer is released', () => {
    const gesture = new PointerGesture()
    gesture.down(1, 0, 0, 0)
    gesture.up(1, 500)
    assert.equal(gesture.move(1, 10, 10), null)
    assert.equal(gesture.down(2, 0, 0, 600), 'steer')
  })
})
