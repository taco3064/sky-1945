import type { Boss } from '../boss';
import { createBurst } from '../bursts';
import type { Enemy } from '../enemies';
import { type World, nextId, removeCollider } from './world';

/**
 * An enemy aircraft at 0 HP: its body goes and a small enemy burst appears at its
 * position (game-spec 12.8). The caller drops it from the enemy list.
 */
export function wreckEnemy(world: World, enemy: Enemy): void {
  removeCollider(world, enemy.id);

  world.bursts.push(
    createBurst(nextId(world), { x: enemy.x, y: enemy.y, tone: 'enemy', size: 'small' }),
  );
}

/**
 * The boss at 0 HP: it and its beam are removed at once and a large enemy burst appears
 * at its centre (game-spec 12.9.12).
 */
export function wreckBoss(world: World, boss: Boss): void {
  removeCollider(world, boss.id);

  if (boss.beam) {
    removeCollider(world, boss.beam.id);
    boss.beam = null;
  }

  world.boss = null;

  world.bursts.push(
    createBurst(nextId(world), { x: boss.x, y: boss.y, tone: 'enemy', size: 'large' }),
  );
}
