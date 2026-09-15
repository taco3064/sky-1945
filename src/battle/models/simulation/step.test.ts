import { describe, expect, it } from 'vitest';
import { createBoss } from '../boss';
import { createBullet } from '../bullets';
import { createBurst } from '../bursts';
import { createEnemy, roundSchedule } from '../enemies';
import { FIRE_INTERVAL } from '../player';
import { tryPulse } from './pulseDrive';
import { PASSES_PER_STEP, runPass, stepDuration, stepWorld } from './step';
import { type World, addBoss, addBullet, addEnemy, createWorld, nextId } from './world';

const PASS = 1 / 240;

function setup(random: () => number = () => 0) {
  return createWorld(5, random);
}

/** The player sits at (270, 800), in control and unprotected, and holds fire. */
function controlled(world = setup()) {
  Object.assign(world.player, {
    flyingIn: false,
    y: 800,
    protectedUntil: 0,
    fireTimer: -100,
  });

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

    expect(world.enemies.map(({ kind, path }) => [kind, path]))
      .toEqual(Array(4).fill(['small', 'weave']));

    expect(world.enemies.every((enemy) => enemy.travelled === 165 * PASS)).toBe(true);

    expect(world.enemies.every((enemy) => world.collisions.bodies.has(enemy.id)))
      .toBe(true);

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
  it('adds player, then enemy, then boss bullets, moving each once', () => {
    const world = controlled();

    world.player.fireTimer = FIRE_INTERVAL;
    const squad = { ...roundSchedule(1)[1], entries: [{ x: 100, y: 300 }] };
    const shooter = createEnemy(nextId(world), squad, 0);

    shooter.fireTimer = 5;
    addEnemy(world, shooter);
    const boss = createBoss(nextId(world), 1, { size: 1, seed: 0 });

    Object.assign(boss, { pose: 'firing', attack: 'straight', x: 270, y: 150 });
    addBoss(world, boss);
    world.phase = 'boss';

    runPass(world, PASS);

    expect(world.bullets.map((bullet) => bullet.side))
      .toEqual(['player', 'player', 'enemy', 'enemy']);

    expect(world.bullets[0].y).toBeCloseTo(774 - 780 * PASS, 9);
    expect(world.bullets[2].x).toBeCloseTo(shooter.x, 9);
    expect(world.bullets.at(-1)?.y).toBeCloseTo(boss.y + 66 + 320 * PASS, 9);
  });

  it('removes bullets outside the field by more than 24 u', () => {
    const world = controlled();

    const leaving = createBullet(nextId(world), {
      side: 'player',
      x: 100,
      y: -23.9,
      heading: -90,
      speed: 780,
      damage: 1,
    });

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

    world.bursts.push(
      createBurst(nextId(world), { x: 0, y: 0, tone: 'enemy', size: 'small' }),
    );

    runPass(world, 0.3);
    expect(world.bursts.length).toBe(1);
    runPass(world, 0.3);

    expect(world.bursts).toEqual([]);
  });
});

describe('hits', () => {
  it('detects and resolves contacts after moving everything, in the same pass', () => {
    const world = controlled();

    world.nextSquad = world.schedule.length;
    const squad = { ...roundSchedule(3)[2], kind: 'large' as const };
    const rammer = createEnemy(nextId(world), squad, 0);

    Object.assign(rammer, { entry: { x: 270, y: 800 }, x: 0, y: 0 });
    addEnemy(world, rammer);

    runPass(world, PASS);

    expect(world.lives).toBe(2);
    expect(world.bursts).toMatchObject([{ x: 270, y: 800, tone: 'ally' }]);
  });
});

describe('PULSE DRIVE', () => {
  /** An active Pulse started `elapsed` seconds ago. */
  function activePulse(world: World, elapsed: number) {
    world.pulse.active = {
      id: nextId(world),
      startedAt: world.time - elapsed,
      reached: new Set(),
    };
  }

  /** An enemy bullet that reaches the aircraft's centre in the next pass. */
  function hittingBullet(world: World, dx = 0) {
    const bullet = createBullet(nextId(world), {
      side: 'enemy',
      x: world.player.x + dx,
      y: world.player.y - 1,
      heading: 90,
      speed: 260,
      damage: 8,
    });

    addBullet(world, bullet);

    return bullet;
  }

  /** A small enemy diving 20 u above the aircraft, firing straight into it this pass. */
  function shooterAbove(world: World) {
    const squad = { ...roundSchedule(1)[1], entries: [{ x: 270, y: 780 }] };
    const shooter = createEnemy(nextId(world), squad, 0);

    shooter.fireTimer = 5;
    addEnemy(world, shooter);
  }

  it.each([
    [false, 2],
    [true, 3],
  ])('with a Pulse active (%s) a bullet inside it is cleared before it can hit', (
    pulsing,
    lives,
  ) => {
    const world = controlled();

    world.nextSquad = world.schedule.length;
    const bullet = hittingBullet(world);

    if (pulsing) {
      activePulse(world, 0.3);
    }

    runPass(world, PASS);

    expect(world.lives).toBe(lives);
    expect(world.bullets.includes(bullet)).toBe(!pulsing);
  });

  it('clears bullets fired inside an already grown Pulse before they can hit', () => {
    const world = controlled();

    world.nextSquad = world.schedule.length;
    shooterAbove(world);
    activePulse(world, 0.3);

    runPass(world, PASS);

    expect([world.lives, world.bullets.length]).toEqual([3, 0]);
    expect(world.bursts).toMatchObject([{ tone: 'enemy', size: 'small' }]);
  });

  it('grazes after hits: a bullet that hits this pass grants nothing', () => {
    const grazed = controlled();

    grazed.nextSquad = grazed.schedule.length;
    hittingBullet(grazed, 20);
    runPass(grazed, PASS);

    const hit = controlled();

    hit.nextSquad = hit.schedule.length;
    hittingBullet(hit, 20);
    hittingBullet(hit);
    runPass(hit, PASS);

    expect([grazed.lives, grazed.pulse.energy]).toEqual([3, 8]);
    expect([hit.lives, hit.pulse.energy]).toEqual([2, 0]);
  });

  it('runs 0.6 s of passes, then ends', () => {
    const world = controlled();

    world.nextSquad = world.schedule.length;
    world.pulse.energy = 100;
    tryPulse(world);

    for (let pass = 0; pass < 143; pass++) {
      runPass(world, PASS);
    }

    expect(world.pulse.active).not.toBeNull();
    runPass(world, PASS);
    runPass(world, PASS);
    expect(world.pulse.active).toBeNull();
  });

  it('kills the boss into the next round, keeping energy and the active Pulse', () => {
    const world = controlled();

    world.phase = 'boss';
    Object.assign(world.player, { x: 230, y: 300 });
    const boss = createBoss(nextId(world), 1, { size: 1, seed: 0 });

    Object.assign(boss, { pose: 'winding', hp: 120, x: 230, y: 154 });
    addBoss(world, boss);
    world.pulse.energy = 48;
    activePulse(world, 0.45);

    runPass(world, PASS);

    expect([world.boss, world.round, world.phase]).toEqual([null, 2, 'waves']);
    expect(world.bursts).toMatchObject([{ tone: 'enemy', size: 'large' }]);
    expect(world.pulse.energy).toBe(48);
    expect(world.pulse.active).not.toBeNull();
  });
});

describe('round phase', () => {
  it('summons the boss once every squad has appeared and the field is clear', () => {
    const draws = [0.5, 0.25];
    const world = controlled(setup(() => draws.shift() as number));

    world.nextSquad = world.schedule.length;

    runPass(world, PASS);

    expect(world.phase).toBe('boss');

    expect(world.boss).toMatchObject({
      size: 1.4,
      seed: Math.floor(0.25 * 0xffffffff),
      pose: 'entering',
      maxHp: 1260,
    });

    expect(world.collisions.bodies.has(world.boss?.id as number)).toBe(true);
  });

  it('waits for the last enemy aircraft to leave', () => {
    const world = controlled();

    world.nextSquad = world.schedule.length;
    addEnemy(world, createEnemy(nextId(world), roundSchedule(1)[5], 0));

    runPass(world, PASS);

    expect([world.phase, world.boss]).toEqual(['waves', null]);
  });

  it('starts the next round when the boss dies; its first squad comes next pass', () => {
    const world = controlled();

    world.phase = 'boss';

    runPass(world, PASS);

    expect(world).toMatchObject({
      round: 2,
      phase: 'waves',
      roundClock: 0,
      nextSquad: 0,
      enemies: [],
    });

    expect(world.schedule).toEqual(roundSchedule(2));

    runPass(world, PASS);
    expect(world.enemies.length).toBe(4);
  });

  it('adds the beam body when a beam opens and removes it when the beam closes', () => {
    const world = controlled();

    world.phase = 'boss';
    const boss = createBoss(nextId(world), 1, { size: 1, seed: 0 });

    Object.assign(boss, {
      pose: 'winding',
      attack: 'beam',
      stanceTime: 1.4,
      x: 270,
      y: 150,
    });

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
