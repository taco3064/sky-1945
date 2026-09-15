import Matter from 'matter-js'

/**
 * Hit detection on matter-js (game-spec 12.11): every body is a sensor with no air
 * friction in a zero-gravity engine, moved by setting its position directly.
 */
export interface Collisions<T> {
  readonly engine: Matter.Engine
  /** Bodies by entity id. */
  readonly bodies: Map<number, Matter.Body>
  /** Owners by body id. */
  readonly owners: Map<number, T>
  /** Contact starts reported since the last detection, in matter-js order. */
  starts: [T, T][]
}

export function createCollisions<T>(): Collisions<T> {
  const engine = Matter.Engine.create({ gravity: { x: 0, y: 0 } })
  const collisions: Collisions<T> = { engine, bodies: new Map(), owners: new Map(), starts: [] }

  Matter.Events.on(engine, 'collisionStart', ({ pairs }) => {
    for (const pair of pairs) {
      collisions.starts.push([
        collisions.owners.get(pair.bodyA.id) as T,
        collisions.owners.get(pair.bodyB.id) as T,
      ])
    }
  })

  return collisions
}

const SENSOR = { isSensor: true, frictionAir: 0 }

/** A circle with matter-js's default polygon sides; `angle` in degrees. */
export function addCircle<T>(collisions: Collisions<T>, id: number, owner: T, x: number, y: number, radius: number, angle = 0): void {
  addBody(collisions, id, owner, Matter.Bodies.circle(x, y, radius, { ...SENSOR, angle: (angle * Math.PI) / 180 }))
}

export function addRectangle<T>(collisions: Collisions<T>, id: number, owner: T, x: number, y: number, width: number, height: number): void {
  addBody(collisions, id, owner, Matter.Bodies.rectangle(x, y, width, height, SENSOR))
}

function addBody<T>(collisions: Collisions<T>, id: number, owner: T, body: Matter.Body): void {
  collisions.bodies.set(id, body)
  collisions.owners.set(body.id, owner)
  Matter.Composite.add(collisions.engine.world, body)
}

export function moveBody<T>(collisions: Collisions<T>, id: number, x: number, y: number): void {
  const body = collisions.bodies.get(id)
  if (body && (body.position.x !== x || body.position.y !== y)) {
    Matter.Body.setPosition(body, { x, y })
  }
}

export function removeBody<T>(collisions: Collisions<T>, id: number): void {
  const body = collisions.bodies.get(id)
  if (body) {
    collisions.bodies.delete(id)
    collisions.owners.delete(body.id)
    Matter.Composite.remove(collisions.engine.world, body)
  }
}

/** Runs the physics update for `dt` seconds and returns only the contacts that started. */
export function detectContacts<T>(collisions: Collisions<T>, dt: number): [T, T][] {
  Matter.Engine.update(collisions.engine, dt * 1000)
  const starts = collisions.starts
  collisions.starts = []
  return starts
}
