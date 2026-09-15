import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { Physics } from './physics.ts'

describe('physics', () => {
  it('reports a contact start once per overlap, and again after separating', () => {
    const physics = new Physics()
    const circle = physics.addCircle(0, 0, 4)
    const box = physics.addRectangle(100, 0, 88, 1000)

    assert.equal(physics.update(4).length, 0)

    physics.place(circle, 60, 0)
    const started = physics.update(4)
    assert.equal(started.length, 1)
    assert.deepEqual(new Set(started[0]), new Set([circle, box]))

    assert.equal(physics.update(4).length, 0)

    physics.place(circle, 0, 0)
    assert.equal(physics.update(4).length, 0)
    physics.place(circle, 60, 0)
    assert.equal(physics.update(4).length, 1)
  })

  it('creates sensors with no air friction, matter-js default polygons and the given angle', () => {
    const physics = new Physics()
    const sides = [3, 4, 13, 20, 32, 52 * 0.8, 104].map((radius) => physics.addCircle(0, 0, radius, Math.PI))
    assert.deepEqual(
      sides.map((body) => body.vertices.length),
      [10, 10, 14, 20, 26, 26, 26],
    )
    assert.ok(sides.every((body) => body.isSensor && body.frictionAir === 0 && body.angle === Math.PI))
  })

  it('stops reporting a removed body', () => {
    const physics = new Physics()
    const a = physics.addCircle(0, 0, 4)
    physics.addCircle(1, 0, 4)
    physics.remove(a)
    assert.equal(physics.update(4).length, 0)
  })

  it('does not move bodies on its own', () => {
    const physics = new Physics()
    const body = physics.addCircle(10, 20, 4)
    physics.place(body, 30, 40)
    for (let i = 0; i < 10; i++) physics.update(4)
    assert.deepEqual([body.position.x, body.position.y], [30, 40])
  })
})
