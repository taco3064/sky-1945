import { type Bullet, createBullet } from './bullet';

/** Enemy-side fire patterns (game-spec 12.8). */
export type FirePattern = 'straight' | 'spread' | 'radial';

const SPREAD_OFFSETS = [-30, -15, 0, 15, 30];
const RADIAL_BULLETS = 10;
const RADIAL_STEP = 360 / RADIAL_BULLETS;

/** Bullet headings of one volley; radial ignores the heading. */
export function patternHeadings(pattern: FirePattern, heading: number): number[] {
  switch (pattern) {
    case 'straight':
      return [heading];
    case 'spread':
      return SPREAD_OFFSETS.map((offset) => heading + offset);
    case 'radial':
      return Array.from({ length: RADIAL_BULLETS }, (_, index) => index * RADIAL_STEP);
  }
}

export interface Volley {
  pattern: FirePattern;
  x: number;
  y: number;
  heading: number;
  speed: number;
  damage: number;
}

/** Fires one enemy-side volley from (x, y), one new id per bullet. */
export function fireVolley(volley: Volley, nextId: () => number): Bullet[] {
  const { pattern, heading, ...launch } = volley;

  return patternHeadings(pattern, heading).map((bulletHeading) =>
    createBullet(nextId(), { ...launch, side: 'enemy', heading: bulletHeading }),
  );
}
