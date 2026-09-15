import { describe, expect, it } from 'vitest';
import { type Boss, createBoss } from '../boss';
import { type Bullet, createBullet } from '../bullets';
import { type Enemy, createEnemy } from '../enemies';
import { roundSchedule } from '../enemies';
import { resolveContacts } from './contacts';
import { type Collider, type World, addBeam, addBoss, addBullet, addEnemy, createWorld, nextId } from './world';

function setup() {
  const world = createWorld(5, Math.random);

  world.time = 10;
  world.player.protectedUntil = 0;
  world.player.x = 200;
  world.player.y = 700;
  world.player.flyingIn = false;

  return world;
}

function bullet(world: World, side: 'player' | 'enemy', damage = 11.25): Bullet {
  const created = createBullet(nextId(world), { side, x: 100, y: 100, heading: side === 'player' ? -90 : 90, speed: 300, damage });

  addBullet(world, created);

  return created;
}

function enemy(world: World, kind: 0 | 5 = 0): Enemy {
  const created = createEnemy(nextId(world), roundSchedule(1)[kind], 0);

  created.x = 120;
  created.y = 140;
  addEnemy(world, created);

  return created;
}

function arrivedBoss(world: World): Boss {
  const created = createBoss(nextId(world), 1, { size: 1, seed: 0 });

  Object.assign(created, { pose: 'winding', x: 270, y: 150 });
  addBoss(world, created);

  return created;
}

const as = {
  player: (world: World): Collider => ({ kind: 'player', player: world.player }),
  bullet: (target: Bullet): Collider => ({ kind: 'bullet', bullet: target }),
  enemy: (target: Enemy): Collider => ({ kind: 'enemy', enemy: target }),
  boss: (target: Boss): Collider => ({ kind: 'boss', boss: target }),
};

describe('player bullet + enemy aircraft', () => {
  it('removes the bullet and damages the enemy, in either order', () => {
    const world = setup();
    const shot = bullet(world, 'player');
    const other = bullet(world, 'player');
    const target = enemy(world, 5);

    resolveContacts(world, [[as.bullet(shot), as.enemy(target)], [as.enemy(target), as.bullet(other)]]);

    expect(world.bullets).toEqual([]);
    expect(world.collisions.bodies.has(shot.id)).toBe(false);
    expect(target.hp).toBe(160 - 22.5);
    expect(world.enemies).toEqual([target]);
  });

  it('destroys the enemy at 0 HP with a small enemy burst at its position', () => {
    const world = setup();
    const shot = bullet(world, 'player', 20);
    const target = enemy(world);

    resolveContacts(world, [[as.bullet(shot), as.enemy(target)]]);

    expect(world.enemies).toEqual([]);
    expect(world.collisions.bodies.has(target.id)).toBe(false);
    expect(world.bursts).toMatchObject([{ x: 120, y: 140, tone: 'enemy', size: 'small', age: 0 }]);
  });

  it('lets one bullet damage two enemies it starts touching in the same pass', () => {
    const world = setup();
    const shot = bullet(world, 'player');
    const first = enemy(world);
    const second = enemy(world);

    resolveContacts(world, [[as.bullet(shot), as.enemy(first)], [as.bullet(shot), as.enemy(second)]]);

    expect([first.hp, second.hp]).toEqual([8.75, 8.75]);
    expect(world.bullets).toEqual([]);
  });

  it('bursts a destroyed enemy only once', () => {
    const world = setup();
    const first = bullet(world, 'player', 20);
    const second = bullet(world, 'player', 20);
    const target = enemy(world);

    resolveContacts(world, [[as.bullet(first), as.enemy(target)], [as.bullet(second), as.enemy(target)]]);

    expect(world.bursts.length).toBe(1);
    expect(world.bullets).toEqual([]);
    expect(target.hp).toBe(0);
  });
});

describe('player bullet + boss', () => {
  it('uses the bullet up and discards its damage while the boss is entering', () => {
    const world = setup();
    const shot = bullet(world, 'player');
    const boss = createBoss(nextId(world), 1, { size: 1, seed: 0 });

    addBoss(world, boss);

    resolveContacts(world, [[as.boss(boss), as.bullet(shot)]]);

    expect(world.bullets).toEqual([]);
    expect(boss.hp).toBe(900);
  });

  it('damages the boss once it has arrived', () => {
    const world = setup();
    const shot = bullet(world, 'player');
    const boss = arrivedBoss(world);

    resolveContacts(world, [[as.bullet(shot), as.boss(boss)]]);

    expect(boss.hp).toBe(900 - 11.25);
    expect(world.boss).toBe(boss);
  });

  it('removes a boss destroyed between attacks', () => {
    const world = setup();
    const boss = arrivedBoss(world);

    resolveContacts(world, [[as.bullet(bullet(world, 'player', 900)), as.boss(boss)]]);

    expect([world.boss, world.collisions.bodies.size, world.bursts.length]).toEqual([null, 1, 1]);
  });

  it('removes the boss and its beam at once, with a large enemy burst at its centre', () => {
    const world = setup();
    const first = bullet(world, 'player', 900);
    const second = bullet(world, 'player', 900);
    const boss = arrivedBoss(world);

    boss.beam = { id: nextId(world), x: 270, y: 716 };
    addBeam(world, boss.beam);

    resolveContacts(world, [[as.bullet(first), as.boss(boss)], [as.bullet(second), as.boss(boss)]]);

    expect(world.boss).toBeNull();
    expect(boss.beam).toBeNull();
    expect([world.collisions.bodies.has(boss.id), world.collisions.bodies.size]).toEqual([false, 1]);
    expect(world.bursts).toMatchObject([{ x: 270, y: 150, tone: 'enemy', size: 'large' }]);
  });
});

describe('player contacts', () => {
  it('costs a life on contact with an enemy bullet: ally burst, relaunch, and the bullet flies on', () => {
    const world = setup();
    const shot = bullet(world, 'enemy');

    resolveContacts(world, [[as.bullet(shot), as.player(world)]]);

    expect(world.bursts).toMatchObject([{ x: 200, y: 700, tone: 'ally', size: 'large' }]);
    expect(world.player).toMatchObject({ x: 270, y: 1020, flyingIn: true, protectedUntil: 13 });
    expect(world.lives).toBe(2);
    expect(world.bullets).toEqual([shot]);
  });

  it.each([
    ['an enemy aircraft', (world: World): Collider => as.enemy(enemy(world))],
    ['the boss', (world: World): Collider => as.boss(arrivedBoss(world))],
    [
      'the beam',
      (world: World): Collider => {
        const boss = arrivedBoss(world);

        boss.beam = { id: nextId(world), x: 200, y: 716 };

        return { kind: 'beam', beam: boss.beam };
      },
    ],
  ])('costs a life on contact with %s', (_, hostile) => {
    const world = setup();

    resolveContacts(world, [[as.player(world), hostile(world)]]);

    expect(world.lives).toBe(2);
  });

  it('does nothing while the player is invulnerable', () => {
    const world = setup();

    world.player.protectedUntil = 11;

    resolveContacts(world, [[as.player(world), as.bullet(bullet(world, 'enemy'))]]);

    expect([world.lives, world.bursts.length, world.player.x]).toEqual([3, 0, 200]);
  });

  it('takes at most one death per pass', () => {
    const world = setup();

    world.player.protectedUntil = 10;

    resolveContacts(world, [
      [as.player(world), as.bullet(bullet(world, 'enemy'))],
      [as.player(world), as.enemy(enemy(world))],
    ]);

    expect([world.lives, world.bursts.length]).toEqual([2, 1]);
  });

  it('ignores an enemy destroyed earlier in the pass and the beam of a destroyed boss', () => {
    const world = setup();
    const target = enemy(world);
    const boss = arrivedBoss(world);

    boss.beam = { id: nextId(world), x: 200, y: 716 };
    const beam: Collider = { kind: 'beam', beam: boss.beam };

    resolveContacts(world, [
      [as.bullet(bullet(world, 'player', 20)), as.enemy(target)],
      [as.player(world), as.enemy(target)],
      [as.bullet(bullet(world, 'player', 900)), as.boss(boss)],
      [as.player(world), as.boss(boss)],
      [beam, as.player(world)],
    ]);

    expect(world.lives).toBe(3);
  });

  it('ends the run when the last life is lost', () => {
    const world = setup();

    world.lives = 1;

    resolveContacts(world, [[as.player(world), as.bullet(bullet(world, 'enemy'))]]);

    expect([world.lives, world.gameOver]).toEqual([0, true]);
  });
});

describe('everything else', () => {
  it('does nothing', () => {
    const world = setup();
    const own = bullet(world, 'player');
    const hostile = bullet(world, 'enemy');
    const first = enemy(world);
    const second = enemy(world);
    const boss = arrivedBoss(world);

    resolveContacts(world, [
      [as.bullet(own), as.bullet(hostile)],
      [as.bullet(hostile), as.bullet(own)],
      [as.player(world), as.bullet(own)],
      [as.enemy(first), as.enemy(second)],
      [as.bullet(hostile), as.enemy(first)],
      [as.boss(boss), as.enemy(second)],
      [as.bullet(own), { kind: 'beam', beam: { id: 99, x: 0, y: 0 } }],
    ]);

    expect([world.lives, world.bullets.length, world.enemies.length, first.hp, boss.hp]).toEqual([3, 2, 2, 20, 900]);
  });
});
