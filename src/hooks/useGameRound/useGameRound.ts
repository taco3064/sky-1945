import { useEffect, useState } from 'react';

import type { World } from '~app/engine/world';

/**
 * Which round is running.
 *
 * Changes once a round, which makes it about the least expensive thing in the
 * game to hold in React state — and the HUD is the only consumer.
 *
 * What the number *means* stays in the engine: the director derives its wave
 * counts from it and `boostsForRound` derives the difficulty. Nothing up here
 * decides anything from it beyond what to print.
 */
export function useGameRound(world: World): number {
  const [round, setRound] = useState(1);

  useEffect(() => world.subscribeRound(setRound), [world]);

  return round;
}
