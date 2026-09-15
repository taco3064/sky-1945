import { useEffect, useState } from 'react';

import type { World } from '~app/engine/world';

/** Which round is running. What the number means stays in the engine. */
export function useGameRound(world: World): number {
  const [round, setRound] = useState(1);

  useEffect(() => world.subscribeRound(setRound), [world]);

  return round;
}
