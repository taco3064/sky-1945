export type FirePattern = 'straight' | 'spread' | 'radial'

/** A bullet about to be fired: where it leaves from, its heading in degrees, speed (u/s) and damage. */
export type Shot = {
  x: number
  y: number
  heading: number
  speed: number
  damage: number
}

const SPREAD_OFFSETS = [-30, -15, 0, 15, 30]
const RADIAL_BULLETS = 10

/** One volley of a fire pattern. Radial ignores the heading. */
export function volley(
  pattern: FirePattern,
  x: number,
  y: number,
  heading: number,
  speed: number,
  damage: number,
): Shot[] {
  const shot = (angle: number): Shot => ({ x, y, heading: angle, speed, damage })

  switch (pattern) {
    case 'straight':
      return [shot(heading)]
    case 'spread':
      return SPREAD_OFFSETS.map((offset) => shot(heading + offset))
    case 'radial':
      return Array.from({ length: RADIAL_BULLETS }, (_, i) => shot((i * 360) / RADIAL_BULLETS))
  }
}

/** A bullet's velocity, `(cos θ × speed, sin θ × speed)`, fixed for its life. */
export function shotVelocity(shot: Shot): { vx: number; vy: number } {
  const radians = (shot.heading * Math.PI) / 180
  return { vx: Math.cos(radians) * shot.speed, vy: Math.sin(radians) * shot.speed }
}
