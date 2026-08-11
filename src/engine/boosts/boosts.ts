import type { Boost, Boosts, LoadoutPoints } from './types';

/** Points a run distributes between the two stats. */
export const LOADOUT_POINTS = 10;

/** What a single point is worth, in whole percent — one notch of the slider. */
const PERCENT_PER_POINT = 10;

/** No points on a stat still leaves it at full strength. */
export const BOOST_MIN_PERCENT = 100;

/** Every point on one stat: 100 + 10 × 10. */
export const BOOST_MAX_PERCENT = BOOST_MIN_PERCENT + LOADOUT_POINTS * PERCENT_PER_POINT;

/** Half each — where a run starts before the player touches anything. */
export const DEFAULT_POINTS: LoadoutPoints = 5;

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
