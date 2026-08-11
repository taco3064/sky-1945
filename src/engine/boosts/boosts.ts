/** Points a run distributes between the two stats. */
export const LOADOUT_POINTS = 10;

/** What a single point is worth, in whole percent — one notch of the slider. */
const PERCENT_PER_POINT = 10;

/** No points on a stat still leaves it at full strength. */
export const BOOST_MIN_PERCENT = 100;

/** Every point on one stat: 100 + 10 × 10. */
export const BOOST_MAX_PERCENT = BOOST_MIN_PERCENT + LOADOUT_POINTS * PERCENT_PER_POINT;

/** A legal allocation. Eleven values, so 11 points is not a loadout the type admits. */
export type LoadoutPoints = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** Half each — where a run starts before the player touches anything. */
export const DEFAULT_POINTS: LoadoutPoints = 5;

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

/** The one place a raw number becomes a legal allocation: rounded, then held to 0–10. */
export function toPoints(value: number): LoadoutPoints {
  const rounded = Math.round(value);
  const held = Math.min(LOADOUT_POINTS, Math.max(0, rounded));

  // The clamp above is what makes this assertion true.
  return held as LoadoutPoints;
}

/** Percent first, multiplier derived from it — whole-percent arithmetic stays exact. */
function boost(points: number): Boost {
  const percent = BOOST_MIN_PERCENT + points * PERCENT_PER_POINT;

  return { percent, multiplier: percent / 100 };
}

/** Both boosts for an allocation. `power` is the remainder, so they cannot disagree. */
export function boostsFromPoints(points: LoadoutPoints): Boosts {
  return {
    speed: boost(points),
    power: boost(LOADOUT_POINTS - points),
  };
}

/** The round's difficulty, in a loadout's shape but not zero-sum. Caps at round 11. */
export function boostsForRound(round: number): Boosts {
  const points = Math.min(Math.max(round - 1, 0), LOADOUT_POINTS);
  const same = boost(points);

  return { speed: same, power: same };
}
