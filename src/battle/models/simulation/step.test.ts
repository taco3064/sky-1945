import { describe, expect, it } from 'vitest';
import { createBoss } from '../boss';
import { createBullet } from '../bullets';
import { createBurst } from '../bursts';
import { createEnemy, roundSchedule } from '../enemies';
import { FIRE_INTERVAL } from '../player';
import { PASSES_PER_STEP, runPass, stepDuration, stepWorld } from './step';
import { addBoss, addBullet, addEnemy, createWorld, nextId } from './world';

const PASS = 1 / 240;

function setup(random: () => number = () => 0) {
  return createWorld(5, random);
}

/** The player sits at (270, 800), in control and unprotected, and holds fire. */
function controlled(world = setup()) {
  Object.assign(world.player, { flyingIn: false, y: 800, protectedUntil: 0, fireTimer: -100 });

  return world;
}

describe('step', () => {
  it.each([
    [10, 0.01],
    [16, 0.016],
    [16.67, 1 / 60],
    [-5, 0],
  ])('%f ms of frame time simulates %f s', (frameMs, dt) => {
    expect(stepDuration(frameMs)).toBeCloseTo(dt, 9);
  });

  it('splits a step into four equal passes', () => {
    const world = setup();

    stepWorld(world, 1 / 60);

    expect(PASSES_PER_STEP).toBe(4);
    expect(world.time).toBeCloseTo(1 / 60, 12);
    expect(world.player.y).toBeCloseTo(1020 - 620 / 60, 9);
  });
});

describe('waves', () => {
  it('brings in the first squad on the first pass and moves it once in that pass', () => {
    const world = setup();

    runPass(world, PASS);

    expect(world.enemies.map((enemy) => [enemy.kind, enemy.path])).toEqual(Array(4).fill(['small', 'weave']));
    expect(world.enemies.every((enemy) => enemy.travelled === 165 * PASS)).toBe(true);
    expect(world.enemies.every((enemy) => world.collisions.bodies.has(enemy.id))).toBe(true);
    expect(world.nextSquad).toBe(1);
  });

  it('brings in each squad once the round clock reaches its arrival time', () => {
    const world = setup();

    while (world.roundClock < 0.7 - PASS / 2) {
      runPass(world, PASS);
    }

    expect(world.nextSquad).toBe(1);
    runPass(world, PASS);

    expect(world.nextSquad).toBe(2);
    expect(world.enemies.length).toBe(8);
  });

  it('runs the round clock only in the wave phase', () => {
    const world = setup();

    world.phase = 'boss';
    addBoss(world, createBoss(nextId(world), 1, { size: 1, seed: 0 }));

    runPass(world, PASS);

    expect([world.roundClock, world.enemies.length]).toEqual([0, 0]);
  });

  it('moves enemies with the round multiplier and removes those that left', () => {
    const world = controlled();

    world.round = 3;
    world.nextSquad = world.schedule.length;
    const squad = roundSchedule(1)[1];
    const staying = createEnemy(nextId(world), squad, 0);
    const leaving = createEnemy(nextId(world), squad, 1);

    leaving.travelled = 1100;
    addEnemy(world, staying);
    addEnemy(world, leaving);

    runPass(world, PASS);

    expect(world.enemies).toEqual([staying]);
    expect(staying.travelled).toBeCloseTo(165 * 1.2 * PASS, 12);
    expect(world.collisions.bodies.has(leaving.id)).toBe(false);
  });
});

describe('bullets', () => {
  it('adds the player\'s, then the enemies\', then the boss\'s bullets and moves each once', () => {
    const world = controlled();

    world.player.fireTimer = FIRE_INTERVAL;
    const shooter = createEnemy(nextId(world), { ...roundSchedule(1)[1], entries: [{ x: 100, y: 300 }] }, 0);

    shooter.fireTimer = 5;
    addEnemy(world, shooter);
    const boss = createBoss(nextId(world), 1, { size: 1, seed: 0 });

    Object.assign(boss, { pose: 'firing', attack: 'straight', x: 270, y: 150 });
    addBoss(world, boss);
    world.phase = 'boss';

    runPass(world, PASS);

    expect(world.bullets.map((bullet) => bullet.side)).toEqual(['player', 'player', 'enemy', 'enemy']);
    expect(world.bullets[0].y).toBeCloseTo(774 - 780 * PASS, 9);
    expect(world.bullets[2].x).toBeCloseTo(shooter.x, 9);
    expect(world.bullets.at(-1)?.y).toBeCloseTo(boss.y + 66 + 320 * PASS, 9);
  });

  it('removes bullets outside the field by more than 24 u', () => {
    const world = controlled();
    const leaving = createBullet(nextId(world), { side: 'player', x: 100, y: -23.9, heading: -90, speed: 780, damage: 1 });

    addBullet(world, leaving);
    world.nextSquad = world.schedule.length;

    runPass(world, PASS);

    expect(world.bullets).toEqual([]);
    expect(world.collisions.bodies.has(leaving.id)).toBe(false);
  });
});

describe('bursts', () => {
  it('ages bursts and removes them after 0.6 s', () => {
    const world = controlled();

    world.nextSquad = world.schedule.length;
    world.bursts.push(createBurst(nextId(world), 0, 0, 'enemy', 'small'));

    runPass(world, 0.3);
    expect(world.bursts.length).toBe(1);
    runPass(world, 0.3);

    expect(world.bursts).toEqual([]);
  });
});

describe('hits', () => {
  it('detects contacts after moving everything and resolves them in the same pass', () => {
    const world = controlled();

    world.nextSquad = world.schedule.length;
    const rammer = createEnemy(nextId(world), { ...roundSchedule(3)[2], kind: 'large' }, 0);

    Object.assign(rammer, { entry: { x: 270, y: 800 }, x: 0, y: 0 });
    addEnemy(world, rammer);

    runPass(world, PASS);

    expect(world.lives).toBe(2);
    expect(world.bursts).toMatchObject([{ x: 270, y: 800, tone: 'ally' }]);
  });
});

describe('round phase', () => {
  it('summons the boss once every squad has appeared and no enemy aircraft remain', () => {
    const draws = [0.5, 0.25];
    const world = controlled(setup(() => draws.shift() as number));

    world.nextSquad = world.schedule.length;

    runPass(world, PASS);

    expect(world.phase).toBe('boss');
    expect(world.boss).toMatchObject({ size: 1.4, seed: Math.floor(0.25 * 0xffffffff), pose: 'entering', maxHp: 1260 });
    expect(world.collisions.bodies.has(world.boss?.id as number)).toBe(true);
  });

  it('waits for the last enemy aircraft to leave', () => {
    const world = controlled();

    world.nextSquad = world.schedule.length;
    addEnemy(world, createEnemy(nextId(world), roundSchedule(1)[5], 0));

    runPass(world, PASS);

    expect([world.phase, world.boss]).toEqual(['waves', null]);
  });

  it('starts the next round once the boss is killed; its first squad arrives on the next pass', () => {
    const world = controlled();

    world.phase = 'boss';

    runPass(world, PASS);
    expect(world).toMatchObject({ round: 2, phase: 'waves', roundClock: 0, nextSquad: 0, enemies: [] });
    expect(world.schedule).toEqual(roundSchedule(2));

    runPass(world, PASS);
    expect(world.enemies.length).toBe(4);
  });

  it('adds the beam body when a beam opens and removes it when the beam closes', () => {
    const world = controlled();

    world.phase = 'boss';
    const boss = createBoss(nextId(world), 1, { size: 1, seed: 0 });

    Object.assign(boss, { pose: 'winding', attack: 'beam', stanceTime: 1.4, x: 270, y: 150 });
    addBoss(world, boss);
    world.player.x = 30;

    runPass(world, PASS);
    const beamId = boss.beam?.id as number;

    expect(world.collisions.bodies.has(beamId)).toBe(true);

    boss.stanceTime = 1.1;
    runPass(world, PASS);
    expect(boss.beam).toBeNull();
    expect(world.collisions.bodies.has(beamId)).toBe(false);
  });
});
