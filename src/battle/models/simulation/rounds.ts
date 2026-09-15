/** `m = 1 + min(max(round − 1, 0), 10) / 10`: 1.0 in round 1, capped at 2.0 from round 11 (game-spec 12.5). */
export function roundMultiplier(round: number): number {
  return 1 + Math.min(Math.max(round - 1, 0), 10) / 10;
}
