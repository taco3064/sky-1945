import { useCallback, useState } from 'react';

import { DEFAULT_POINTS, toPoints } from '~app/engine/boosts';
import type { LoadoutPoints } from '~app/engine/boosts';

import type { Loadout } from './types';

/** Holds the allocation, and nothing else — boosts are derived where they are used. */
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
