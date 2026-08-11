import { useEffect, useState } from 'react';

import type { FrameRate, World } from '~app/engine/world';

/** Nothing measured yet — the first window has not closed. */
const UNKNOWN: FrameRate = { fps: 0, worst: 0 };

/**
 * How the game is actually running, twice a second.
 *
 * Safe as React state precisely because of that rate: the engine averages over a
 * 500ms window and publishes a reading, so this is two renders of one small element
 * per second rather than sixty. A per-frame counter would cost more than the thing
 * it measures.
 *
 * The counting happens in the engine because the `engine` layer owns
 * `requestAnimationFrame` — a hook cannot open a second loop to count frames with,
 * and should not want to: the loop doing the work is the one that knows how long it
 * took.
 */
export function useFrameRate(world: World): FrameRate {
  const [rate, setRate] = useState<FrameRate>(UNKNOWN);

  useEffect(() => world.subscribeFrameRate(setRate), [world]);

  return rate;
}
