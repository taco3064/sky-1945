import { describe, expect, it, vi } from 'vitest';
import { createBoss } from '../boss';
import { type BulletLaunch, createBullet } from '../bullets';
import { createBurst } from '../bursts';
import { createEnemy, roundSchedule } from '../enemies';
import {
  addBeam,
  addBoss,
  addBullet,
  addEnemy,
  createWorld,
  forEachPlacement,
  nextId,
  removeCollider,
} from './world';

const PLAYER_SHOT: BulletLaunch = {
  side: 'player',
  x: 3,
  y: 4,
  heading: -90,
  speed: 780,
  damage: 8,
};

describe('createWorld', () => {
  it('starts a fresh run: round 1, 3 lives, no enemies, the aircraft launching', () => {
    const random = () => 0.5;
    const world = createWorld(7, random);

    expect(world).toMatchObject({
      time: 0,
      round: 1,
      phase: 'waves',
      roundClock: 0,
      nextSquad: 0,
      lives: 3,
      gameOver: false,
      bullets: [],
      enemies: [],
      boss: null,
      bursts: [],
      lastId: 1,
      random,
    });

    const body = world.collisions.bodies.get(1);

    expect(world.schedule).toEqual(roundSchedule(1));
    expect(world.player).toMatchObject({ id: 1, x: 270, y: 1020, speed: 510 });
    expect(body?.vertices.length).toBe(10);

    expect(world.collisions.owners.get(body?.id as number))
      .toEqual({ kind: 'player', player: world.player });
  });
});

describe('entities', () => {
  it('hands out increasing ids', () => {
    const world = createWorld(5, Math.random);

    expect([nextId(world), nextId(world)]).toEqual([2, 3]);
  });

  it('registers bullets, enemies, the boss and the beam with their hit shapes', () => {
    const world = createWorld(5, Math.random);
    const bullet = createBullet(10, { ...PLAYER_SHOT, side: 'enemy', heading: 90 });
    const enemy = createEnemy(11, roundSchedule(1)[5], 0);
    const boss = createBoss(12, 1, { size: 2, seed: 0 });

    addBullet(world, bullet);
    addEnemy(world, enemy);
    addBoss(world, boss);
    addBeam(world, { id: 13, x: 270, y: 800 });

    expect(world.bullets).toEqual([bullet]);
    expect(world.enemies).toEqual([enemy]);
    expect(world.boss).toBe(boss);
    const body = (id: number) => world.collisions.bodies.get(id);

    expect([10, 11, 12, 13].map((id) => body(id)?.vertices.length))
      .toEqual([10, 26, 26, 4]);

    expect([body(11)?.angle, body(12)?.angle]).toEqual([Math.PI, Math.PI]);
    expect([10, 11, 12].map((id) => body(id)?.circleRadius)).toEqual([4, 32, 104]);
    expect([body(13)?.bounds.min.y, body(13)?.bounds.max.y]).toEqual([300, 1300]);
  });

  it('removes a collider by entity id', () => {
    const world = createWorld(5, Math.random);

    addBullet(world, createBullet(10, PLAYER_SHOT));

    removeCollider(world, 10);

    expect(world.collisions.bodies.has(10)).toBe(false);
  });
});

describe('forEachPlacement', () => {
  it('visits every entity in paint order, enemies and the boss turned 180°', () => {
    const world = createWorld(5, Math.random);

    world.bullets.push(createBullet(2, PLAYER_SHOT));
    const enemy = createEnemy(3, roundSchedule(1)[0], 0);

    world.enemies.push(enemy);
    world.boss = createBoss(4, 1, { size: 1, seed: 0 });
    world.boss.beam = { id: 5, x: 6, y: 7 };
    world.bursts.push(createBurst(6, { x: 8, y: 9, tone: 'enemy', size: 'small' }));
    const place = vi.fn();

    forEachPlacement(world, place);

    expect(place.mock.calls).toEqual([
      [{ id: 1, x: 270, y: 1020, angle: 0 }],
      [{ id: 2, x: 3, y: 4, angle: 0 }],
      [{ id: 3, x: enemy.x, y: enemy.y, angle: 180 }],
      [{ id: 4, x: 270, y: -52, angle: 180 }],
      [{ id: 5, x: 6, y: 7, angle: 0 }],
      [{ id: 6, x: 8, y: 9, angle: 0 }],
    ]);
  });

  it('skips the boss and beam when absent', () => {
    const world = createWorld(5, Math.random);

    world.boss = createBoss(4, 1, { size: 1, seed: 0 });
    const place = vi.fn();

    forEachPlacement(world, place);
    world.boss = null;
    forEachPlacement(world, place);

    expect(place.mock.calls.map(([{ id }]) => id)).toEqual([1, 4, 1]);
  });
});
