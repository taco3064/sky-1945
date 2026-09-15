import { useContext, useEffect, useRef } from 'react';
import type { RefObject } from 'react';

import { GameContext } from '~app/contexts/GameContext';

/** How much sideways travel in one frame counts as a full lean. */
const LEAN_AT = 4;

/** How quickly the lean chases the movement. Raw displacement is too jumpy to draw. */
const LEAN_EASE = 0.18;

function clamp(value: number, limit: number): number {
  return Math.min(limit, Math.max(-limit, value));
}

/** A ref the engine writes every frame, plus a `--lean` for banking. No renders. */
export function useEntityTransform(id: number): RefObject<HTMLDivElement | null> {
  const world = useContext(GameContext);
  const ref = useRef<HTMLDivElement>(null);
  const drift = useRef({ x: null as number | null, lean: 0 });

  useEffect(() => world?.subscribe(id, ({ x, y, angle }) => {
    const element = ref.current;

    if (element) {
      const seen = drift.current;
      const slide = seen.x === null ? 0 : x - seen.x;

      seen.x = x;
      seen.lean += (clamp(slide / LEAN_AT, 1) - seen.lean) * LEAN_EASE;

      element.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${angle}deg)`;
      element.style.setProperty('--lean', seen.lean.toFixed(3));
    }
  }), [world, id]);

  if (!world) {
    throw new Error('useEntityTransform must be called inside <GameProvider>.');
  }

  return ref;
}
