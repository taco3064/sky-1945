import { useEffect, useState } from 'react';

import type { CombatSnapshot } from '~app/engine/combat';
import type { World } from '~app/engine/world';

const IDLE: CombatSnapshot = { rolling: false, invulnerable: false };

/**
 * Whether the player is mid-roll, and whether they can be hit.
 *
 * Safe as React state because it changes twice per roll — once at the start,
 * once at the end — and a roll lasts 1.2 seconds. That is a handful of
 * renders a minute, not sixty a second.
 *
 * It exists so the aircraft can *look* like it is rolling: the animation is
 * CSS on the Fighter's inner element, and this is what turns it on.
 */
export function usePlayerCombat(world: World): CombatSnapshot {
  const [snapshot, setSnapshot] = useState<CombatSnapshot>(IDLE);

  useEffect(() => world.subscribeCombat(setSnapshot), [world]);

  return snapshot;
}
