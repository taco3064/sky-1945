import type { Body } from 'matter-js';

import type { BulletSpawn } from '../patterns';

export interface BulletRecord {
  id: number;
  /** Enemy fire, which is drawn differently and (in #6) kills the player. */
  hostile: boolean;
}

export interface BulletField {
  /** Put a volley into the world. True if anything was added. */
  add: (spawns: BulletSpawn[]) => boolean;
  /** Move every bullet; drop the ones off the field. True if any left. */
  advance: (elapsed: number) => boolean;
  /** Live bodies, for publishing transforms. */
  bodies: () => Body[];
  /** Live bullets and whose they are, for the roster. */
  records: () => BulletRecord[];
  /** Take one out — it hit something. Unknown ids are ignored. */
  remove: (id: number) => void;
  /** Forget everything. */
  clear: () => void;
}
