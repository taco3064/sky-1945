import { Body, Composite } from 'matter-js';
import type { Engine } from 'matter-js';

import { createBullet, velocityOf } from '../entities';
import { isOutside } from '../field';
import type { BulletSpawn } from '../patterns';

/** Bullets outside the field by this much are gone for good. */
const CULL_MARGIN = 24;

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

export function createBulletField(engine: Engine): BulletField {
  const live = new Map<number, Body>();

  return {
    add(spawns) {
      for (const spawn of spawns) {
        const bullet = createBullet(spawn);

        live.set(bullet.id, bullet);
        Composite.add(engine.world, bullet);
      }

      return spawns.length > 0;
    },

    advance(elapsed) {
      const gone: number[] = [];

      for (const [id, bullet] of live) {
        const { vx, vy } = velocityOf(bullet);
        const x = bullet.position.x + vx * elapsed;
        const y = bullet.position.y + vy * elapsed;

        if (isOutside(x, y, CULL_MARGIN)) {
          gone.push(id);
        } else {
          Body.setPosition(bullet, { x, y });
        }
      }

      for (const id of gone) {
        // Out of the physics world as well as the map, or the broad phase pays forever.
        Composite.remove(engine.world, live.get(id) as Body);
        live.delete(id);
      }

      return gone.length > 0;
    },

    remove(id) {
      const bullet = live.get(id);

      if (!bullet) {
        return;
      }

      Composite.remove(engine.world, bullet);
      live.delete(id);
    },

    bodies: () => [...live.values()],

    records: () => [...live.values()].map((bullet) => ({
      id: bullet.id,
      hostile: bullet.label === 'enemy-bullet',
    })),

    clear: () => live.clear(),
  };
}
