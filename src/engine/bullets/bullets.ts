import { Body, Composite } from 'matter-js';
import type { Engine } from 'matter-js';

import { BULLET_SPEED, PLAYER_FIRE_INTERVAL, createBullet } from '../entities';

/**
 * A field of bullets: when they appear, where they go, and when they stop
 * existing. Split out of the world because that module was doing five things
 * and this is one of them.
 */

export interface Shot {
  /** Whether the guns may fire. A roll silences them (#10). */
  allowed: boolean;
  /** Where a bullet appears, in world units. */
  x: number;
  y: number;
  /** Damage, already multiplied by the loadout's power boost. */
  damage: number;
}

export interface BulletField {
  /** Advance the firing cadence and spawn what is due. True if any spawned. */
  fire: (elapsed: number, shot: Shot) => boolean;
  /** Move every bullet; drop the ones off the field. True if any left. */
  advance: (elapsed: number) => boolean;
  /** Live bodies, for publishing transforms. */
  bodies: () => Body[];
  /** Live ids, for the roster. */
  ids: () => number[];
  /** Forget everything. */
  clear: () => void;
}

export function createBulletField(engine: Engine): BulletField {
  const live = new Map<number, Body>();

  let sinceShot = 0;

  return {
    fire(elapsed, shot) {
      if (!shot.allowed) {
        // The cadence keeps running while the guns are silent, capped at one
        // interval — so the first shot after a roll is immediate rather than
        // delayed by however long the roll took, and a long roll does not
        // bank up a burst either.
        sinceShot = Math.min(sinceShot + elapsed, PLAYER_FIRE_INTERVAL);

        return false;
      }

      sinceShot += elapsed;

      let fired = false;

      while (sinceShot >= PLAYER_FIRE_INTERVAL) {
        const bullet = createBullet(shot.x, shot.y, shot.damage);

        sinceShot -= PLAYER_FIRE_INTERVAL;
        live.set(bullet.id, bullet);
        Composite.add(engine.world, bullet);
        fired = true;
      }

      return fired;
    },

    advance(elapsed) {
      const gone: number[] = [];

      for (const [id, bullet] of live) {
        const y = bullet.position.y - BULLET_SPEED * elapsed;

        if (y < 0) {
          gone.push(id);
        } else {
          Body.setPosition(bullet, { x: bullet.position.x, y });
        }
      }

      for (const id of gone) {
        Composite.remove(engine.world, live.get(id) as Body);
        live.delete(id);
      }

      return gone.length > 0;
    },

    bodies: () => [...live.values()],

    ids: () => [...live.keys()],

    clear: () => live.clear(),
  };
}
