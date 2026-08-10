import { useEffect, useRef, useState } from 'react';

import { STARTING_LIVES } from '~app/engine/combat';
import type { World } from '~app/engine/world';

/**
 * How many aircraft the run has left, and the end of the run.
 *
 * The count is the engine's — a life is spent by the same code that saw the
 * contact, so nothing up here can disagree with it. This hook only mirrors it
 * for the HUD, and forwards the end of the run to whoever has to change screen.
 *
 * Both arrive on the same hook because they are one event seen from two sides:
 * the last life leaving *is* the game ending.
 */
export function useLives(world: World, onGameOver: () => void): number {
  const [lives, setLives] = useState(STARTING_LIVES);
  const latestGameOver = useRef(onGameOver);

  useEffect(() => {
    latestGameOver.current = onGameOver;
  });

  useEffect(() => world.subscribeLives(setLives), [world]);

  useEffect(() => world.subscribeGameOver(() => latestGameOver.current()), [world]);

  return lives;
}
