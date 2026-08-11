import { useEffect, useRef, useState } from 'react';

import { STARTING_LIVES } from '~app/engine/combat';
import type { World } from '~app/engine/world';

/** How many aircraft the run has left, and the end of it — one event, two sides. */
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
