import { bossHitRadius, damageBoss } from '../boss';
import { ENEMY_KINDS, damageEnemy } from '../enemies';
import {
  PULSE_BOSS_DAMAGE,
  PULSE_ENEMY_DAMAGE,
  type Pulse,
  type PulseArea,
  activatePulse,
  canGraze,
  endPulse,
  grazeBullet,
  hasPulseEnded,
  isInPulseArea,
  pulseArea,
  reachOnce,
} from '../pulse';
import { type World, nextId, removeCollider } from './world';
import { wreckBoss, wreckEnemy } from './wrecks';

/** Attempts a Pulse Drive; nothing once the run is over (PULSE DRIVE 3). */
export function tryPulse(world: World): boolean {
  const launch = { now: world.time, nextId: () => nextId(world) };

  return !world.gameOver && activatePulse(world.pulse, world.player, launch);
}

/**
 * One pass of the active Pulse, before hit detection so a cleared bullet can no longer
 * hit: enemy bullets inside the area go, then the enemy aircraft and boss it reaches
 * take their one hit (PULSE DRIVE 6–9). The pass reaching 0.6 s is its last.
 */
export function drivePulse(world: World): void {
  const pulse = world.pulse.active;

  if (!pulse) {
    return;
  }

  const area = pulseArea(pulse, world.player, world.time);

  clearBullets(world, area);
  strikeEnemies(world, pulse, area);
  strikeBoss(world, pulse, area);

  if (hasPulseEnded(pulse, world.time)) {
    endPulse(world.pulse);
  }
}

/** Removed with no damage, graze or burst; player bullets are unaffected. */
function clearBullets(world: World, area: PulseArea): void {
  world.bullets = world.bullets.filter((bullet) => {
    if (bullet.side !== 'enemy' || !isInPulseArea(area, bullet)) {
      return true;
    }

    removeCollider(world, bullet.id);

    return false;
  });
}

/** A killed enemy dies the normal way. */
function strikeEnemies(world: World, pulse: Pulse, area: PulseArea): void {
  world.enemies = world.enemies.filter((enemy) => {
    const struck = isInPulseArea(area, enemy, ENEMY_KINDS[enemy.kind].radius)
      && reachOnce(pulse, enemy.id);

    if (!struck || !damageEnemy(enemy, PULSE_ENEMY_DAMAGE)) {
      return true;
    }

    wreckEnemy(world, enemy);

    return false;
  });
}

/** The arrival shield discards the damage but still spends this Pulse's hit. */
function strikeBoss(world: World, pulse: Pulse, area: PulseArea): void {
  const { boss } = world;

  const struck = boss !== null
    && isInPulseArea(area, boss, bossHitRadius(boss))
    && reachOnce(pulse, boss.id);

  if (struck && damageBoss(boss, PULSE_BOSS_DAMAGE) === 'destroyed') {
    wreckBoss(world, boss);
  }
}

/**
 * Grazes after hits are resolved: a player killed this pass is relaunched, protected,
 * so a bullet that hits cannot also graze (PULSE DRIVE 2).
 */
export function grazeBullets(world: World): void {
  const { pulse, player } = world;

  if (!canGraze(player, world.time)) {
    return;
  }

  for (const bullet of world.bullets) {
    grazeBullet(pulse, player, bullet);
  }
}
