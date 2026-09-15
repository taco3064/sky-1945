import Matter from 'matter-js'

export type Body = Matter.Body

/**
 * Collision detection only: every body is a sensor with no air friction in a zero-gravity engine,
 * moved by setting its position directly. Each update reports the pairs whose overlap began in it.
 */
export class Physics {
  readonly #engine = Matter.Engine.create({ gravity: { x: 0, y: 0 } })
  #started: [Body, Body][] = []

  constructor() {
    Matter.Events.on(this.#engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) this.#started.push([pair.bodyA, pair.bodyB])
    })
  }

  addCircle(x: number, y: number, radius: number, angle = 0): Body {
    return this.#add(Matter.Bodies.circle(x, y, radius, { isSensor: true, frictionAir: 0, angle }))
  }

  addRectangle(x: number, y: number, width: number, height: number): Body {
    return this.#add(Matter.Bodies.rectangle(x, y, width, height, { isSensor: true, frictionAir: 0 }))
  }

  remove(body: Body): void {
    Matter.Composite.remove(this.#engine.world, body)
  }

  place(body: Body, x: number, y: number): void {
    Matter.Body.setPosition(body, { x, y })
  }

  /** Runs the physics update for `ms` and returns the contact starts in the order matter-js reports them. */
  update(ms: number): [Body, Body][] {
    this.#started = []
    Matter.Engine.update(this.#engine, ms)
    return this.#started
  }

  #add(body: Body): Body {
    Matter.Composite.add(this.#engine.world, body)
    return body
  }
}
