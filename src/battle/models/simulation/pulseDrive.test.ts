import { describe, expect, it } from 'vitest';
import { type Boss, createBoss } from '../boss';
import { type Bullet, createBullet } from '../bullets';
import { type Enemy, type EnemyKind, createEnemy, roundSchedule } from '../enemies';
import type { Point } from '../field';
import { type Pulse, pulseRadius } from '../pulse';
import { drivePulse, grazeBullets, tryPulse } from './pulseDrive';
import {
  type World,
  addBeam,
  addBoss,
  addBullet,
  addEnemy,
  createWorld,
  nextId,
} from './world';

/** A run at time 10 with the aircraft in control at (270, 800) and vulnerable. */
function setup(speedPoints = 5): World {
  const world = createWorld(speedPoints, Math.random);

  world.time = 10;
  Object.assign(world.player, { flyingIn: false, x: 270, y: 800, protectedUntil: 0 });

  return world;
}

/** An active Pulse started `elapsed` seconds before the current time. */
function pulseAt(world: World, elapsed: number): Pulse {
  const startedAt = world.time - elapsed;
  const pulse = { id: nextId(world), startedAt, reached: new Set<number>() };

  world.pulse.active = pulse;

  return pulse;
}

/** An active Pulse that has grown to `radius` at the current time. */
function pulseOf(world: World, radius: number): Pulse {
  return pulseAt(world, (radius / 180) * 0.6);
}

/** A bullet offset from the aircraft's centre. */
function bulletAt(world: World, offset: Point, side: Bullet['side'] = 'enemy'): Bullet {
  const bullet = createBullet(nextId(world), {
    side,
    x: world.player.x + offset.x,
    y: world.player.y + offset.y,
    heading: 90,
    speed: 260,
    damage: 8,
  });

  addBullet(world, bullet);

  return bullet;
}

const SQUAD_OF: Record<EnemyKind, number> = { small: 0, medium: 4, large: 5 };

/** An enemy aircraft `ahead` u above the aircraft. */
function enemyAt(world: World, ahead: number, kind: EnemyKind = 'small'): Enemy {
  const enemy = createEnemy(nextId(world), roundSchedule(1)[SQUAD_OF[kind]], 0);

  Object.assign(enemy, { x: world.player.x, y: world.player.y - ahead });
  addEnemy(world, enemy);

  return enemy;
}

/** A size-1.5 boss (hit radius 78, 1350 HP) `ahead` u above the aircraft. */
function bossAt(world: World, ahead: number, pose: Boss['pose'] = 'winding'): Boss {
  const boss = createBoss(nextId(world), 1, { size: 1.5, seed: 0 });

  Object.assign(boss, { pose, x: world.player.x, y: world.player.y - ahead });
  addBoss(world, boss);
  world.phase = 'boss';

  return boss;
}

describe('tryPulse', () => {
  it('starts a Pulse at 100 energy, spending it all, radius 0, protected', () => {
    const world = setup();

    world.pulse.energy = 100;

    expect(tryPulse(world)).toBe(true);
    expect(world.pulse).toMatchObject({ energy: 0, active: { startedAt: 10 } });
    expect(world.pulse.active?.id).toBe(world.lastId);
    expect(pulseRadius(world.pulse.active as Pulse, world.time)).toBe(0);
    expect(world.player.protectedUntil).toBeCloseTo(10.6, 12);
  });

  it('does nothing once the run is over', () => {
    const world = setup();

    world.gameOver = true;
    world.pulse.energy = 100;

    expect(tryPulse(world)).toBe(false);
    expect(world.pulse).toMatchObject({ energy: 100, active: null });
  });
});

describe('bullet clearing', () => {
  it('removes an enemy bullet at 89 u of the 90 u radius at 0.3 s, not at 91 u', () => {
    const world = setup();
    const inside = bulletAt(world, { x: 89, y: 0 });
    const outside = bulletAt(world, { x: 0, y: -91 });

    pulseAt(world, 0.3);
    drivePulse(world);

    expect(world.bullets).toEqual([outside]);
    expect(world.collisions.bodies.has(inside.id)).toBe(false);
    expect([world.bursts.length, world.pulse.energy]).toEqual([0, 0]);
  });

  it('leaves player bullets and the beam alone', () => {
    const world = setup();
    const own = bulletAt(world, { x: 0, y: -30 }, 'player');
    const boss = bossAt(world, 400);

    boss.beam = { id: nextId(world), x: 270, y: 800 };
    addBeam(world, boss.beam);

    pulseOf(world, 170);
    drivePulse(world);

    expect(world.bullets).toEqual([own]);
    expect(world.boss?.beam).toBe(boss.beam);
    expect(world.collisions.bodies.has(boss.beam.id)).toBe(true);
  });

  it('follows the aircraft', () => {
    const world = setup();
    const bullet = bulletAt(world, { x: 60, y: 0 });

    pulseOf(world, 45);
    drivePulse(world);
    expect(world.bullets).toEqual([bullet]);

    world.player.x += 30;
    drivePulse(world);
    expect(world.bullets).toEqual([]);
  });
});

describe('enemy aircraft', () => {
  it('hits a small enemy at 112 u of a 100 u radius for exactly 50, once', () => {
    const world = setup();
    const small = enemyAt(world, 112);
    const beyond = enemyAt(world, 114);

    small.hp = 160;
    pulseOf(world, 100);
    drivePulse(world);
    drivePulse(world);

    expect([small.hp, beyond.hp]).toEqual([110, 20]);
  });

  it('deals a fixed 50 whatever the POWER, the round or the enemy size', () => {
    const world = setup(0);
    const large = enemyAt(world, 130, 'large');

    world.round = 11;
    pulseOf(world, 100);
    drivePulse(world);

    expect(large.hp).toBe(110);
  });

  it('kills with the normal death and small enemy burst', () => {
    const world = setup();
    const small = enemyAt(world, 112);

    pulseOf(world, 100);
    drivePulse(world);

    expect(world.enemies).toEqual([]);
    expect(world.collisions.bodies.has(small.id)).toBe(false);

    expect(world.bursts)
      .toMatchObject([{ x: 270, y: 688, tone: 'enemy', size: 'small' }]);
  });

  it('hits an enemy newly entering the grown area', () => {
    const world = setup();
    const large = enemyAt(world, 400, 'large');

    pulseOf(world, 170);
    drivePulse(world);
    large.y = world.player.y - 150;
    drivePulse(world);

    expect(large.hp).toBe(110);
  });
});

describe('boss', () => {
  it('takes exactly 120 once when the radius plus 52s reaches its centre', () => {
    const world = setup(0);
    const boss = bossAt(world, 177);

    world.round = 11;
    pulseOf(world, 100);
    drivePulse(world);
    drivePulse(world);

    expect(boss.hp).toBe(1350 - 120);
  });

  it('is not reached at 179 u of a 100 u radius', () => {
    const world = setup();
    const boss = bossAt(world, 179);

    pulseOf(world, 100);
    drivePulse(world);

    expect(boss.hp).toBe(1350);
  });

  it('spends the one hit on the arrival shield and is not hit again after it', () => {
    const world = setup();
    const boss = bossAt(world, 100, 'entering');

    pulseOf(world, 100);
    drivePulse(world);
    boss.pose = 'winding';
    drivePulse(world);

    expect(boss.hp).toBe(1350);
  });

  it('dies the normal way, beam and all', () => {
    const world = setup();
    const boss = bossAt(world, 100);

    boss.hp = 120;
    boss.beam = { id: nextId(world), x: 270, y: 900 };
    addBeam(world, boss.beam);

    pulseOf(world, 100);
    drivePulse(world);

    expect([world.boss, boss.beam, world.collisions.bodies.size])
      .toEqual([null, null, 1]);

    expect(world.bursts)
      .toMatchObject([{ x: 270, y: 700, tone: 'enemy', size: 'large' }]);
  });
});

describe('lifetime', () => {
  it('ends on the pass that reaches 0.6 s, after acting at the full 180 u', () => {
    const world = setup();
    const bullet = bulletAt(world, { x: 179, y: 0 });

    pulseAt(world, 0.5);
    drivePulse(world);
    expect(world.pulse.active).not.toBeNull();

    pulseAt(world, 0.61);
    drivePulse(world);

    expect(world.pulse.active).toBeNull();
    expect(world.bullets).not.toContain(bullet);
  });

  it('does nothing without an active Pulse', () => {
    const world = setup();
    const bullet = bulletAt(world, { x: 1, y: 0 });

    drivePulse(world);

    expect(world.bullets).toEqual([bullet]);
  });
});

describe('grazeBullets', () => {
  it('grants 8 once for each enemy bullet within 28 u, outside the hit distance', () => {
    const world = setup();

    bulletAt(world, { x: 20, y: 0 });
    bulletAt(world, { x: 0, y: 28 });
    bulletAt(world, { x: 7, y: 0 });
    bulletAt(world, { x: 29, y: 0 });
    bulletAt(world, { x: -10, y: 0 }, 'player');

    grazeBullets(world);
    grazeBullets(world);

    expect(world.pulse.energy).toBe(16);
  });

  it('grants nothing to a protected or flying-in player', () => {
    const world = setup();

    bulletAt(world, { x: 20, y: 0 });

    world.player.protectedUntil = 11;
    grazeBullets(world);

    Object.assign(world.player, { protectedUntil: 0, flyingIn: true });
    grazeBullets(world);

    expect(world.pulse.energy).toBe(0);
  });
});
