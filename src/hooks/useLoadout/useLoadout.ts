import { useCallback, useState } from 'react';

import { DEFAULT_POINTS, toPoints } from '~app/engine/boosts';
import type { LoadoutPoints } from '~app/engine/boosts';

export interface Loadout {
  /** Points on movement speed, 0–10. The remainder is attack power. */
  speedPoints: LoadoutPoints;
  /** Set the allocation outright — what the slider does. */
  setSpeedPoints: (value: number) => void;
  /** Move the allocation — what an arrow key does. */
  adjustSpeedPoints: (delta: number) => void;
}

/**
 * Holds the allocation, and nothing else.
 *
 * It deliberately does not return the boosts. They are a pure derivation of
 * `speedPoints` (`boostsFromPoints`), so every consumer computes the part it
 * needs where it needs it — the loadout screen wants both bars, the stage
 * (#4) wants only the speed multiplier. Deriving here and drilling the result
 * down would widen every set of props on the way for no one's benefit.
 *
 * The allocation lives above the loadout screen because it outlives it: the
 * player leaves that screen and the choice stays in force for the whole run.
 */
export function useLoadout(): Loadout {
  const [speedPoints, setPoints] = useState<LoadoutPoints>(DEFAULT_POINTS);

  const setSpeedPoints = useCallback((value: number) => {
    setPoints(toPoints(value));
  }, []);

  const adjustSpeedPoints = useCallback((delta: number) => {
    setPoints((current) => toPoints(current + delta));
  }, []);

  return { speedPoints, setSpeedPoints, adjustSpeedPoints };
}
