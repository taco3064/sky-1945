import { useEffect, useState } from 'react';

import type { CombatSnapshot } from '~app/engine/combat';
import type { World } from '~app/engine/world';

const IDLE: CombatSnapshot = { rolling: false, invulnerable: false, ready: true };

/** Whether the player is mid-roll, and whether they can be hit. Drives the animation. */
export function usePlayerCombat(world: World): CombatSnapshot {
  const [snapshot, setSnapshot] = useState<CombatSnapshot>(IDLE);

  useEffect(() => world.subscribeCombat(setSnapshot), [world]);

  return snapshot;
}
