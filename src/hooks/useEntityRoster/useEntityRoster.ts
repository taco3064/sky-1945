import { useEffect, useState } from 'react';

import type { EntityRecord, World } from '~app/engine/world';

/** Which entities exist — and only that. Positions are `useEntityTransform`. */
export function useEntityRoster(world: World): EntityRecord[] {
  const [entities, setEntities] = useState<EntityRecord[]>([]);

  useEffect(() => world.subscribeRoster(setEntities), [world]);

  return entities;
}
