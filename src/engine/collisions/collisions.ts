import { Events } from 'matter-js';
import type { Body, Engine, IEventCollision } from 'matter-js';

import { damageOf } from '../entities';
import type { CollisionWatch, Hit } from './types';

/** Everything on the enemy side kills the player on contact. */
function isThreat(body: Body): boolean {
  return body.label.startsWith('enemy-');
}

/** Enemy-side things that threaten but cannot be shot — player fire passes through. */
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
