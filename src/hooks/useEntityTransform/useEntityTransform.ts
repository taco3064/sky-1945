import { useContext, useEffect, useRef } from 'react';
import type { RefObject } from 'react';

import { GameContext } from '~app/contexts/GameContext';

/**
 * Hands back a ref the engine writes to directly, every frame, without React
 * rendering anything.
 *
 * The arithmetic behind that, priced before it was wired (the playbook's
 * `reprice-on-attach`): roughly 160 entities at peak — one player, ten
 * enemies, 150 bullets — at 60 frames a second, inside 16.6ms each. One
 * `setState` per frame means reconciling 160 components sixty times a second,
 * which is not a budget any of this fits into.
 *
 * So React owns birth and death — which entities exist, at tens of events per
 * second — and the engine owns where they are. Nothing here is a render.
 */
export function useEntityTransform(id: number): RefObject<HTMLDivElement | null> {
  const world = useContext(GameContext);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => world?.subscribe(id, ({ x, y, angle }) => {
    const element = ref.current;

    if (element) {
      element.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${angle}deg)`;
    }
  }), [world, id]);

  if (!world) {
    throw new Error('useEntityTransform must be called inside <GameProvider>.');
  }

  return ref;
}
