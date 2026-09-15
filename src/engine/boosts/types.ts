/** A legal allocation. Eleven values, so 11 points is not a loadout the type admits. */
export type LoadoutPoints = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface Boost {
  /** What the simulation multiplies by, 1–2. */
  multiplier: number;
  /** The same value in the spec's own units, 100–200. */
  percent: number;
}

export interface Boosts {
  /** Movement speed. */
  speed: Boost;
  /** Bullet damage. */
  power: Boost;
}
