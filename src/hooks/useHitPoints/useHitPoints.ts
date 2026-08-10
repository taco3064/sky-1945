import { useEffect, useState } from 'react';

import type { BossSnapshot } from '~app/engine/boss';
import type { World } from '~app/engine/world';

/**
 * The boss's hit points, and the only hit points that leave the engine.
 *
 * Every other aircraft's stay down there, because nothing draws them — the
 * player reads "it is still on screen" and knows it is not dead. The boss has a
 * bar, so React has to be told the number, and this hook is the whole of that
 * exception rather than a general health system.
 *
 * Which leaves it with exactly one consumer, and that is the hook being the
 * right size rather than an under-used one. The original plan had it serving
 * every aircraft in the game; the requirement that only the boss shows a bar
 * shrank it to this by itself.
 *
 * The stance and the attack ride along because they answer one question with
 * the number: a bar that says "760 of 2000" tells the player how the fight is
 * going, and the attack beside it tells them what to do in the next second.
 * Splitting them would mean two subscriptions to one channel.
 */
export function useHitPoints(world: World): BossSnapshot | null {
  const [boss, setBoss] = useState<BossSnapshot | null>(null);

  useEffect(() => world.subscribeBoss(setBoss), [world]);

  return boss;
}
