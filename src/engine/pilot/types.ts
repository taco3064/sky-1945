import type { Body } from 'matter-js';

import type { CombatSnapshot } from '../combat';
import type { BulletSpawn } from '../patterns';

export interface PilotOptions {
  /** The loadout's speed multiplier, 1–3. */
  speedMultiplier: number;
  /** The loadout's power multiplier, 1–3. */
  powerMultiplier: number;
}

export interface Pilot {
  readonly id: number;
  readonly body: Body;
  /** Point it. Any vector; length is normalised away. */
  point: (x: number, y: number) => void;
  /** Move, advance the cadence, and hand back whatever fired this frame. */
  advance: (elapsed: number) => BulletSpawn[];
  /** Attempt a roll. True if one started. */
  roll: () => boolean;
  /** Rolling and invulnerable, right now. */
  snapshot: () => CombatSnapshot;
  /** Whether a contact right now would be fatal. */
  isVulnerable: () => boolean;
  /** Killed by contact. Returns the wreck, and sends a fresh aircraft in protected. */
  kill: () => { x: number; y: number };
  /** True while it is still flying in and input is not its own yet. */
  isArriving: () => boolean;
}
