import { Events } from 'matter-js';
import type { Body, Engine, IEventCollision } from 'matter-js';

import { damageOf } from '../entities';

/**
 * What touched what, and what it means.
 *
 * This is the only module that reads Matter's collision events, and all it
 * does is classify them — it damages nothing and kills nobody. The world
 * drains the list each frame and decides consequences, which keeps "who can
 * hurt whom" in one readable place instead of spread across event handlers.
 *
 * Every body in the game is a sensor, so Matter reports contacts and applies
 * no forces. Nothing here is ever pushed.
 */

/**
 * A contact worth acting on.
 *
 * `player-hit` carries nothing: there is one player, and contact is fatal
 * regardless of what caused it — an enemy, its bullet, it makes no difference
 * to the outcome. A field for damage would only invite someone to subtract it.
 */
export type Hit
  = | { kind: 'enemy-damaged'; enemyId: number; bulletId: number; damage: number }
    | { kind: 'player-hit' };

export interface CollisionWatch {
  /** Everything that collided since the last call. Empties the buffer. */
  drain: () => Hit[];
  /** Stop listening. */
  dispose: () => void;
}

/**
 * Everything on the enemy side kills the player on contact.
 *
 * One rule for aircraft, bullets and the boss's beam alike, because the outcome
 * is the same for all three and the label prefix already says whose they are.
 * This replaced a list of "an enemy, or an enemy's bullet" that would have had
 * to grow an entry every time the enemy side gained a new kind of thing.
 */
function isThreat(body: Body): boolean {
  return body.label.startsWith('enemy-');
}

/**
 * Enemy-side things that threaten but cannot be shot.
 *
 * A bullet is not a target, and neither is the boss's beam: player fire passes
 * straight through both. Without the beam listed here, the player's own shots
 * would be swallowed by the column they are trying to shoot past, and each one
 * would report damage against a body that owns no hit points.
 */
const HAZARDS = new Set(['enemy-bullet', 'enemy-beam']);

/** Enemy-side and shootable — an aircraft, up to and including the boss. */
function isEnemy(body: Body): boolean {
  return isThreat(body) && !HAZARDS.has(body.label);
}

function damageHit(bullet: Body, enemy: Body): Hit | null {
  if (bullet.label !== 'player-bullet' || !isEnemy(enemy)) {
    return null;
  }

  return {
    kind: 'enemy-damaged',
    enemyId: enemy.id,
    bulletId: bullet.id,
    damage: damageOf(bullet),
  };
}

function playerHit(player: Body, other: Body): Hit | null {
  return player.label === 'player' && isThreat(other) ? { kind: 'player-hit' } : null;
}

/** Matter hands back an unordered pair, so both arrangements are tried. */
function classify(a: Body, b: Body): Hit | null {
  return damageHit(a, b)
    ?? damageHit(b, a)
    ?? playerHit(a, b)
    ?? playerHit(b, a);
}

export function createCollisionWatch(engine: Engine): CollisionWatch {
  const hits: Hit[] = [];

  const onCollision = (event: IEventCollision<Engine>): void => {
    for (const pair of event.pairs) {
      const hit = classify(pair.bodyA, pair.bodyB);

      if (hit) {
        hits.push(hit);
      }
    }
  };

  Events.on(engine, 'collisionStart', onCollision);

  return {
    drain() {
      const drained = [...hits];

      hits.length = 0;

      return drained;
    },

    dispose() {
      Events.off(engine, 'collisionStart', onCollision);
      hits.length = 0;
    },
  };
}
