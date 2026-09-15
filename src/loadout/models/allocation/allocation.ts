/** Points shared between SPEED and POWER (game-spec 7.5). */
export const TOTAL_POINTS = 10

/** Points on SPEED when the page loads: 150% / 150%. */
export const DEFAULT_SPEED_POINTS = 5

/** Rounds and clamps a point value to 0–10. */
export function clampPoints(points: number): number {
  return Math.min(TOTAL_POINTS, Math.max(0, Math.round(points)))
}

/** SPEED percent for `speedPoints`: each point is 10% on top of 100%. */
export function speedPercent(speedPoints: number): number {
  return 100 + speedPoints * 10
}

/** POWER percent: POWER gets the points SPEED does not. */
export function powerPercent(speedPoints: number): number {
  return 100 + (TOTAL_POINTS - speedPoints) * 10
}

/** `ms = 1 + p / 10` (game-spec 12.3). */
export function speedMultiplier(speedPoints: number): number {
  return 1 + speedPoints / 10
}

/** `mp = 1 + (10 − p) / 10` (game-spec 12.3). */
export function powerMultiplier(speedPoints: number): number {
  return 1 + (TOTAL_POINTS - speedPoints) / 10
}
