import { useEffect, useState } from 'react';

import type { BossSnapshot } from '~app/engine/boss';
import type { World } from '~app/engine/world';

/** The boss's hit points, stance and attack — the only ones that leave the engine. */
export function useHitPoints(world: World): BossSnapshot | null {
  const [boss, setBoss] = useState<BossSnapshot | null>(null);

  useEffect(() => world.subscribeBoss(setBoss), [world]);

  return boss;
}
