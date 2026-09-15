import { describe, expect, it } from 'vitest';
import {
  FIRE_INTERVAL,
  LAUNCH_X,
  LAUNCH_Y,
  PLAYER_HIT_RADIUS,
  PLAYER_LIVES,
  type PlayerTick,
  ROLL_DURATION,
  createPlayer,
  isProtected,
  isRolling,
  isSpent,
  launchPlayer,
  protectUntil,
  tryRoll,
  updatePlayer,
} from './player';

const PASS = 1 / 240;

function ids() {
  let id = 100;

  return () => ++id;
}

/** A pass of `dt` ending at `now`. */
function tick(dt: number, now: number, nextId = ids()): PlayerTick {
  return { dt, now, nextId };
}

/** A player that has finished flying in, at (270, 800). */
function controlledPlayer(speedPoints = 5) {
  const player = createPlayer(1, speedPoints, 0);

  updatePlayer(player, tick(1, 1));
  player.fireTimer = 0;

  return player;
}

describe('launch', () => {
  it('has 3 lives and a 3 u hit circle', () => {
    expect(PLAYER_LIVES).toBe(3);
    expect(PLAYER_HIT_RADIUS).toBe(3);
  });

  it('starts 60 u below the field, flying in, protected for 3 s', () => {
    const player = createPlayer(9, 5, 2);

    expect(player).toMatchObject({
      id: 9,
      x: 270,
      y: 1020,
      flyingIn: true,
      direction: { x: 0, y: 0 },
      fireTimer: 0,
    });

    expect([LAUNCH_X, LAUNCH_Y]).toEqual([270, 1020]);
    expect(isProtected(player, 4.999)).toBe(true);
    expect(isProtected(player, 5)).toBe(false);
    expect(isRolling(player, 2)).toBe(false);
    expect(isSpent(player, 2)).toBe(false);
  });

  // game-spec 14.1: speed points → player speed, bullet damage
  it.each([
    [0, 300, 15],
    [3, 390, 12.75],
    [5, 450, 11.25],
    [8, 540, 9],
    [10, 600, 7.5],
  ])('with %i speed points flies at %f u/s and hits for %f', (points, speed, damage) => {
    const player = createPlayer(1, points, 0);

    expect(player.speed).toBeCloseTo(speed, 9);
    expect(player.damage).toBeCloseTo(damage, 9);
  });
});

describe('fly-in', () => {
  it('climbs at 620 u/s with x fixed, ignoring input', () => {
    const player = createPlayer(1, 5, 0);

    player.direction = { x: 1, y: 0 };

    updatePlayer(player, tick(0.1, 0.1));

    expect(player.x).toBe(270);
    expect(player.y).toBeCloseTo(958, 9);
    expect(player.flyingIn).toBe(true);
  });

  it('is placed exactly at (270, 800) once it reaches y 800, then control begins', () => {
    const player = createPlayer(1, 5, 0);

    player.direction = { x: 1, y: 0 };

    updatePlayer(player, tick(0.36, 0.36));
    expect(player).toMatchObject({ x: 270, y: 800, flyingIn: false });

    updatePlayer(player, tick(0.1, 0.46));
    expect(player.x).toBeCloseTo(315, 9);
  });
});

describe('steering', () => {
  it('moves at full speed along the normalised direction', () => {
    const player = controlledPlayer(10);

    player.direction = { x: 3, y: -4 };

    updatePlayer(player, tick(0.1, 5));

    expect(player.x).toBeCloseTo(270 + 0.6 * 60, 9);
    expect(player.y).toBeCloseTo(800 - 0.8 * 60, 9);
  });

  it('stops on a zero direction', () => {
    const player = controlledPlayer();

    updatePlayer(player, tick(0.1, 5));

    expect([player.x, player.y]).toEqual([270, 800]);
  });

  it('clamps x to [24, 516] and y to [24, 936]', () => {
    const player = controlledPlayer(10);

    player.direction = { x: -1, y: 1 };
    updatePlayer(player, tick(5, 10));
    expect([player.x, player.y]).toEqual([24, 936]);

    player.direction = { x: 1, y: -1 };
    updatePlayer(player, tick(5, 15));
    expect([player.x, player.y]).toEqual([516, 24]);
  });
});

describe('fire', () => {
  it('fires every 1/7.5 s, first 0.1333 s into the run, even while flying in', () => {
    const player = createPlayer(1, 5, 0);
    const next = ids();
    let now = 0;
    const volleyPasses: number[] = [];

    for (let pass = 1; pass <= 70; pass++) {
      now += PASS;

      if (updatePlayer(player, tick(PASS, now, next)).length) {
        volleyPasses.push(pass);
      }
    }

    expect(FIRE_INTERVAL).toBeCloseTo(0.1333, 4);
    expect(volleyPasses.length).toBe(2);
    expect(volleyPasses[0] * PASS).toBeCloseTo(FIRE_INTERVAL, 2);
    expect((volleyPasses[1] - volleyPasses[0]) * PASS).toBeCloseTo(FIRE_INTERVAL, 2);
  });

  it('fires two parallel bullets from the muzzles, straight up at 780 u/s', () => {
    const player = controlledPlayer(0);

    const bullets = updatePlayer(player, tick(FIRE_INTERVAL, 5));

    expect(bullets).toMatchObject([
      { id: 101, side: 'player', x: 257, y: 774, damage: 15 },
      { id: 102, side: 'player', x: 283, y: 774, damage: 15 },
    ]);

    expect(bullets.every(({ vx, vy }) => Math.abs(vx) < 1e-9 && vy === -780)).toBe(true);
  });

  it('fires every whole interval in one pass and keeps the remainder', () => {
    const player = controlledPlayer();

    const bullets = updatePlayer(player, tick(FIRE_INTERVAL * 3.5, 5));

    expect(bullets.length).toBe(6);
    expect(player.fireTimer).toBeCloseTo(FIRE_INTERVAL / 2, 9);
  });
});

describe('roll', () => {
  it('lasts 1.2 s, protects, and allows the next roll 2.4 s after it started', () => {
    const player = controlledPlayer();

    player.protectedUntil = 0;

    expect(tryRoll(player, 10)).toBe(true);
    expect(ROLL_DURATION).toBe(1.2);
    expect(isRolling(player, 11.19)).toBe(true);
    expect(isRolling(player, 11.2)).toBe(false);
    expect(isProtected(player, 11.19)).toBe(true);
    expect(isProtected(player, 11.2)).toBe(false);
    expect(isSpent(player, 12.39)).toBe(true);
    expect(tryRoll(player, 12.39)).toBe(false);
    expect(isSpent(player, 12.4)).toBe(false);
    expect(tryRoll(player, 12.4)).toBe(true);
  });

  it('never shortens existing protection', () => {
    const player = createPlayer(1, 5, 0);

    tryRoll(player, 0.5);

    expect(isProtected(player, 2.9)).toBe(true);
  });

  it('is allowed during fly-in', () => {
    expect(tryRoll(createPlayer(1, 5, 0), 0)).toBe(true);
  });

  it('silences the guns, capping the timer at one interval for the next volley', () => {
    const player = controlledPlayer();

    tryRoll(player, 5);

    expect(updatePlayer(player, tick(1, 6))).toEqual([]);
    expect(player.fireTimer).toBe(FIRE_INTERVAL);
    expect(updatePlayer(player, tick(PASS, 6.3)).length).toBe(2);
  });
});

describe('protection', () => {
  it('extends protection to a later expiry and never shortens it', () => {
    const player = createPlayer(1, 5, 0);

    protectUntil(player, 2);
    expect(player.protectedUntil).toBe(3);

    protectUntil(player, 3.6);
    expect(player.protectedUntil).toBe(3.6);
  });
});

describe('relaunch', () => {
  it('returns to launch with input and roll cleared, keeping the fire timer', () => {
    const player = controlledPlayer();

    player.direction = { x: 1, y: 0 };
    player.x = 100;
    player.fireTimer = 0.05;
    tryRoll(player, 10);

    launchPlayer(player, 10.5);

    expect(player).toMatchObject({
      x: 270,
      y: 1020,
      flyingIn: true,
      direction: { x: 0, y: 0 },
      fireTimer: 0.05,
    });

    expect(isRolling(player, 10.5)).toBe(false);
    expect(isSpent(player, 10.5)).toBe(false);
    expect(tryRoll(player, 10.5)).toBe(true);
  });

  it('protects for 3 s from the relaunch', () => {
    const player = controlledPlayer();

    launchPlayer(player, 20);

    expect(isProtected(player, 22.99)).toBe(true);
    expect(isProtected(player, 23)).toBe(false);
  });
});
