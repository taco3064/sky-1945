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
 *
 * It also publishes `--lean`, a -1..1 reading of which way the thing is sliding, for
 * components that want to bank into a turn. Derived here rather than reported by the
 * engine because it is *only* a picture: the simulation has no opinion about how an
 * aircraft looks while it moves sideways, and adding a field to `Transform` would
 * have made every consumer carry a number two of them use.
 */

/** How much sideways travel in one frame counts as a full lean. */
const LEAN_AT = 4;

/**
 * How quickly the lean chases the movement.
 *
 * Frame-to-frame displacement is far too jumpy to draw with — a player tapping left
 * would flicker rather than bank. This eases toward the reading instead, which is
 * the same trick a camera uses and cheap enough to run per entity per frame.
 */
const LEAN_EASE = 0.18;

function clamp(value: number, limit: number): number {
  return Math.min(limit, Math.max(-limit, value));
}

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
