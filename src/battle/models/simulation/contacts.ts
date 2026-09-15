import { type Boss, damageBoss } from '../boss';
import type { Bullet } from '../bullets';
import { createBurst } from '../bursts';
import { type Enemy, damageEnemy } from '../enemies';
import { isProtected, launchPlayer } from '../player';
import { type Collider, type World, nextId, removeCollider } from './world';
import { wreckBoss, wreckEnemy } from './wrecks';

interface Resolution {
  readonly world: World;
  /** Entities removed this pass. */
  readonly removed: Set<number>;
  /** At most one death is taken per pass. */
  deathTaken: boolean;
}

/**
 * Applies the contact starts of one pass, in the order matter-js reported them
 * (game-spec 12.11).
 */
export function resolveContacts(world: World, contacts: [Collider, Collider][]): void {
  const resolution: Resolution = { world, removed: new Set(), deathTaken: false };

  for (const [first, second] of contacts) {
    if (!resolvePair(resolution, first, second)) {
      resolvePair(resolution, second, first);
    }
  }

  const { removed } = resolution;

  if (removed.size > 0) {
    world.bullets = world.bullets.filter((bullet) => !removed.has(bullet.id));
    world.enemies = world.enemies.filter((enemy) => !removed.has(enemy.id));
  }
}

/** Resolves the pair if `a` acts; returns false to try the other way round. */
function resolvePair(resolution: Resolution, a: Collider, b: Collider): boolean {
  if (a.kind === 'bullet' && a.bullet.side === 'player') {
    if (b.kind === 'enemy') {
      hitEnemy(resolution, a.bullet, b.enemy);

      return true;
    }

    if (b.kind === 'boss') {
      hitBoss(resolution, a.bullet, b.boss);

      return true;
    }

    return false;
  }

  if (a.kind === 'player') {
    if (isHostilePresent(resolution, b)) {
      killPlayer(resolution);
    }

    return true;
  }

  return false;
}

/** Enemy aircraft, the boss, enemy bullets and the beam, unless removed this pass. */
function isHostilePresent({ world, removed }: Resolution, collider: Collider): boolean {
  if (collider.kind === 'bullet') {
    return collider.bullet.side === 'enemy';
  }

  if (collider.kind === 'enemy') {
    return !removed.has(collider.enemy.id);
  }

  if (collider.kind === 'boss') {
    return world.boss === collider.boss;
  }

  return collider.kind === 'beam' && world.boss?.beam === collider.beam;
}

/**
 * A player bullet is used up by its first hit but still damages every enemy it starts
 * touching this pass.
 */
function spendBullet({ world, removed }: Resolution, bullet: Bullet): void {
  if (!removed.has(bullet.id)) {
    removed.add(bullet.id);
    removeCollider(world, bullet.id);
  }
}

function hitEnemy(resolution: Resolution, bullet: Bullet, enemy: Enemy): void {
  const { world, removed } = resolution;

  spendBullet(resolution, bullet);

  if (removed.has(enemy.id) || !damageEnemy(enemy, bullet.damage)) {
    return;
  }

  removed.add(enemy.id);
  wreckEnemy(world, enemy);
}

function hitBoss(resolution: Resolution, bullet: Bullet, boss: Boss): void {
  const { world } = resolution;

  spendBullet(resolution, bullet);

  if (world.boss !== boss || damageBoss(boss, bullet.damage) !== 'destroyed') {
    return;
  }

  wreckBoss(world, boss);
}

function killPlayer(resolution: Resolution): void {
  const { world } = resolution;
  const { player } = world;

  if (resolution.deathTaken || isProtected(player, world.time)) {
    return;
  }

  resolution.deathTaken = true;

  world.bursts.push(
    createBurst(nextId(world), { x: player.x, y: player.y, tone: 'ally', size: 'large' }),
  );

  launchPlayer(player, world.time);
  world.lives = Math.max(0, world.lives - 1);

  if (world.lives === 0) {
    world.gameOver = true;
  }
}
