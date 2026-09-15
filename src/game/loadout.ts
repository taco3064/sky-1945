/** Points shared between SPEED and POWER. */
export const LOADOUT_POINTS = 10

/** Points on SPEED until the page is reloaded (150% / 150%). */
export const DEFAULT_SPEED_POINTS = 5

/** Rounds and clamps a requested allocation to a whole number of points on SPEED. */
export function clampSpeedPoints(points: number): number {
  return Math.min(Math.max(Math.round(points), 0), LOADOUT_POINTS)
}

/** Each point is 10%: 0 points is 100%, 10 points is 200%. */
export function speedPercent(speedPoints: number): number {
  return 100 + speedPoints * 10
}

export function powerPercent(speedPoints: number): number {
  return 100 + (LOADOUT_POINTS - speedPoints) * 10
}

/** `ms = 1 + p / 10` — scales the player's speed and the speed lines' pace. */
export function speedMultiplier(speedPoints: number): number {
  return 1 + speedPoints / 10
}

/** `mp = 1 + (10 − p) / 10` — scales the player's bullet damage. */
export function powerMultiplier(speedPoints: number): number {
  return 1 + (LOADOUT_POINTS - speedPoints) / 10
}

/** Stat bar fill, `scaleX((percent − 100) / 100)`. */
export function statFill(percent: number): number {
  return (percent - 100) / 100
}
