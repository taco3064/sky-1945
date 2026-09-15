import { type Bullet, createBullet } from './bullet'

/** Enemy-side fire patterns (game-spec 12.8). */
export type FirePattern = 'straight' | 'spread' | 'radial'

const SPREAD_OFFSETS = [-30, -15, 0, 15, 30]
const RADIAL_BULLETS = 10

/** Bullet headings of one volley; radial ignores the heading. */
export function patternHeadings(pattern: FirePattern, heading: number): number[] {
  switch (pattern) {
    case 'straight':
      return [heading]
    case 'spread':
      return SPREAD_OFFSETS.map((offset) => heading + offset)
    case 'radial':
      return Array.from({ length: RADIAL_BULLETS }, (_, index) => (index * 360) / RADIAL_BULLETS)
  }
}

export interface Volley {
  pattern: FirePattern
  x: number
  y: number
  heading: number
  speed: number
  damage: number
}

/** Fires one enemy-side volley from (x, y), one new id per bullet. */
export function fireVolley({ pattern, x, y, heading, speed, damage }: Volley, nextId: () => number): Bullet[] {
  return patternHeadings(pattern, heading).map((bulletHeading) =>
    createBullet(nextId(), { side: 'enemy', x, y, heading: bulletHeading, speed, damage }),
  )
}
