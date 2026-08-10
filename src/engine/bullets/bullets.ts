import { Body, Composite } from 'matter-js';
import type { Engine } from 'matter-js';

import { createBullet, velocityOf } from '../entities';
import { isOutside } from '../field';
import type { BulletSpawn } from '../patterns';

/**
 * Every bullet in flight, from either side.
 *
 * It knows nothing about cadence — when to fire belongs to whoever is firing
 * (the pilot, an enemy), and this module only carries what has already been
 * fired. Velocity rides on each body, so a radial burst and a straight shot
 * advance through exactly the same code.
 */

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
        // Out of the physics world as well as the map. A body left behind is
        // a leak the collision phase pays for every frame, forever.
        Composite.remove(engine.world, live.get(id) as Body);
        live.delete(id);
      }

      return gone.length > 0;
    },

    bodies: () => [...live.values()],

    records: () => [...live.values()].map((bullet) => ({
      id: bullet.id,
      hostile: bullet.label === 'enemy-bullet',
    })),

    clear: () => live.clear(),
  };
}
