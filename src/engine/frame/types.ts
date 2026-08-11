import type { Engine } from 'matter-js';

import type { BossField } from '../boss';
import type { BulletField } from '../bullets';
import type { CollisionWatch } from '../collisions';
import type { Director } from '../director';
import type { EffectField } from '../effects';
import type { EnemyField } from '../enemies';
import type { Pilot } from '../pilot';

export interface FrameParts {
  engine: Engine;
  pilot: Pilot;
  bullets: BulletField;
  enemies: EnemyField;
  effects: EffectField;
  collisions: CollisionWatch;
  director: Director;
  boss: BossField;
}

export interface FrameResult {
  /** Something appeared or disappeared — React needs to hear about it. */
  rosterChanged: boolean;
  /** The player was killed this frame. Lives are counted outside the engine. */
  playerDied: boolean;
  /** The round was cleared and the next one has begun. */
  roundAdvanced: boolean;
  /** The boss's bar needs redrawing: damage, stance, arrival or death. */
  bossChanged: boolean;
}

export interface Resolution {
  rosterChanged: boolean;
  playerDied: boolean;
  bossChanged: boolean;
}
