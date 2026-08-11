import { useEffect, useState } from 'react';

import type { FrameRate, World } from '~app/engine/world';

/** Nothing measured yet — the first window has not closed. */
const UNKNOWN: FrameRate = { fps: 0, worst: 0 };

/** How the game is actually running, twice a second. The engine does the counting. */
export function useFrameRate(world: World): FrameRate {
  const [rate, setRate] = useState<FrameRate>(UNKNOWN);

  useEffect(() => world.subscribeFrameRate(setRate), [world]);

  return rate;
}
