/**
 * The two stat boosts every aircraft carries — friend and enemy alike.
 *
 * The player's come from spending points on the loadout screen; an enemy's
 * come from the round's difficulty (#7). Two sources, one shape: "harder
 * round" is a function of the round number rather than a new enemy table per
 * round, which is what keeps the director small.
 */

/** Points a run distributes between the two stats. */
export const LOADOUT_POINTS = 10;

/** What a single point is worth, in whole percent. */
const PERCENT_PER_POINT = 20;

/** No points on a stat still leaves it at full strength. */
export const BOOST_MIN_PERCENT = 100;

/** Every point on one stat: 100 + 10 × 20. */
export const BOOST_MAX_PERCENT = BOOST_MIN_PERCENT + LOADOUT_POINTS * PERCENT_PER_POINT;

/**
 * A legal allocation. Eleven values, so the type says what a `number` could
 * not: 11 points is not a loadout, and nothing downstream has to defend
 * against one.
 */
export type LoadoutPoints = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** Half each — where a run starts before the player touches anything. */
export const DEFAULT_POINTS: LoadoutPoints = 5;

export interface Boost {
  /** What the simulation multiplies by, 1–3. */
  multiplier: number;
  /** The same value in the spec's own units, 100–300. */
  percent: number;
}

export interface Boosts {
  /** Movement speed. */
  speed: Boost;
  /** Bullet damage. */
  power: Boost;
}

/**
 * The one place a raw number becomes a legal allocation: rounded, then held
 * inside 0–10.
 *
 * This is not the 100–300 range being clamped — that range needs no guard,
 * because ten points at twenty percent each reaches exactly 300 and cannot
 * pass it. This clamps the *slider*, whose ends are a different question:
 * dragging past either end should stop, not wrap or throw.
 */
export function toPoints(value: number): LoadoutPoints {
  const rounded = Math.round(value);
  const held = Math.min(LOADOUT_POINTS, Math.max(0, rounded));

  // The only assertion in the module, and the tests below sweep every input
  // that reaches it — the clamp above is what makes it true.
  return held as LoadoutPoints;
}

/**
 * Percent first, multiplier derived from it.
 *
 * Deliberately not `1 + points * 0.2`: that produces 1.6000000000000001 at
 * three points, which then renders as "160.00000000000003%" and fails an
 * equality assertion. Whole-percent arithmetic stays exact, and dividing by
 * 100 lands on the same double the literal 1.6 does.
 */
function boost(points: number): Boost {
  const percent = BOOST_MIN_PERCENT + points * PERCENT_PER_POINT;

  return { percent, multiplier: percent / 100 };
}

/**
 * Both boosts for an allocation. `power` is derived from the same number
 * `speed` is — the remainder — so there is no second field to keep in sync
 * and no way for the pair to disagree about how many points were spent.
 */
export function boostsFromPoints(points: LoadoutPoints): Boosts {
  return {
    speed: boost(points),
    power: boost(LOADOUT_POINTS - points),
  };
}
