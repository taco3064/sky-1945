import { describe, expect, it } from 'vitest';
import { createBoss } from '../boss';
import { createEnemy, roundSchedule } from '../enemies';
import { addBeam, addBoss, addEnemy, createWorld, nextId } from './world';
import { wreckBoss, wreckEnemy } from './wrecks';

describe('wreckEnemy', () => {
  it('removes the body and leaves a small enemy burst at its position', () => {
    const world = createWorld(5, Math.random);
    const enemy = createEnemy(nextId(world), roundSchedule(1)[0], 0);

    Object.assign(enemy, { x: 120, y: 140 });
    addEnemy(world, enemy);

    wreckEnemy(world, enemy);

    expect(world.collisions.bodies.has(enemy.id)).toBe(false);

    expect(world.bursts)
      .toMatchObject([{ x: 120, y: 140, tone: 'enemy', size: 'small', age: 0 }]);
  });
});

describe('wreckBoss', () => {
  it('removes the boss and its beam together, with a large burst at its centre', () => {
    const world = createWorld(5, Math.random);
    const boss = createBoss(nextId(world), 1, { size: 1, seed: 0 });

    Object.assign(boss, { x: 270, y: 150 });
    addBoss(world, boss);
    boss.beam = { id: nextId(world), x: 270, y: 716 };
    addBeam(world, boss.beam);

    wreckBoss(world, boss);

    expect([world.boss, boss.beam, world.collisions.bodies.size])
      .toEqual([null, null, 1]);

    expect(world.bursts)
      .toMatchObject([{ x: 270, y: 150, tone: 'enemy', size: 'large' }]);
  });

  it('removes a boss without a beam', () => {
    const world = createWorld(5, Math.random);
    const boss = createBoss(nextId(world), 1, { size: 1, seed: 0 });

    addBoss(world, boss);

    wreckBoss(world, boss);

    expect([world.boss, world.collisions.bodies.size, world.bursts.length])
      .toEqual([null, 1, 1]);
  });
});
