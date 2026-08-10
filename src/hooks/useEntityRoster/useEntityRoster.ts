import { useEffect, useState } from 'react';

import type { EntityRecord, World } from '~app/engine/world';

/**
 * Which entities exist — and only that.
 *
 * This one *is* React state, and the pricing is why: spawns and despawns run
 * at tens per second (ten shots a second, and each leaves the field about a
 * second later), not the thousands per second that positions would.
 *
 * Positions stay out of it entirely (`useEntityTransform`). React owns birth
 * and death; the engine owns where things are.
 */
export function useEntityRoster(world: World): EntityRecord[] {
  const [entities, setEntities] = useState<EntityRecord[]>([]);

  useEffect(() => world.subscribeRoster(setEntities), [world]);

  return entities;
}
