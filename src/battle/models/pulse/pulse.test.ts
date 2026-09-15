import { describe, expect, it } from 'vitest';
import { type BulletLaunch, createBullet } from '../bullets';
import { createPlayer, isProtected, updatePlayer } from '../player';
import {
  PULSE_BOSS_DAMAGE,
  PULSE_DURATION,
  PULSE_ENEMY_DAMAGE,
  PULSE_MAX,
  type Pulse,
  activatePulse,
  canGraze,
  createPulseDrive,
  endPulse,
  grazeBullet,
  hasPulseEnded,
  isInPulseArea,
  isPulseReady,
  pulseArea,
  pulseRadius,
  reachOnce,
} from './pulse';

const CENTRE = { x: 270, y: 800 };

const ENEMY_SHOT: BulletLaunch = {
  side: 'enemy',
  x: 0,
  y: 0,
  heading: 90,
  speed: 260,
  damage: 8,
};

/** An enemy bullet `gap` u to the right of the centre. */
function shotAt(gap: number, id = 1, side: BulletLaunch['side'] = 'enemy') {
  return createBullet(id, { ...ENEMY_SHOT, side, x: CENTRE.x + gap, y: CENTRE.y });
}

/** A player in control at (270, 800) with no protection left at `now`. */
function vulnerablePlayer() {
  const player = createPlayer(1, 5, 0);

  updatePlayer(player, { dt: 1, now: 1, nextId: () => 0 });
  player.protectedUntil = 0;

  return player;
}

function launch(now = 10, id = 42) {
  return { now, nextId: () => id };
}

function pulseFrom(startedAt: number): Pulse {
  return { id: 1, startedAt, reached: new Set() };
}

describe('energy', () => {
  it('starts a run at 0 with no Pulse active, and is ready only at 100', () => {
    expect(createPulseDrive()).toMatchObject({ energy: 0, active: null });
    expect(PULSE_MAX).toBe(100);
    expect([isPulseReady(96), isPulseReady(100)]).toEqual([false, true]);
  });
});

describe('grazing', () => {
  it('grants 8 per different bullet and clamps the thirteenth gain to 100', () => {
    const drive = createPulseDrive();
    const readings = [drive.energy];

    for (let id = 1; id <= 13; id++) {
      grazeBullet(drive, CENTRE, shotAt(20, id));
      readings.push(drive.energy);
    }

    expect(readings)
      .toEqual([0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 100]);
  });

  it('lets one bullet grant once in its lifetime, even when it comes back', () => {
    const drive = createPulseDrive();
    const bullet = shotAt(20);

    expect(grazeBullet(drive, CENTRE, bullet)).toBe(true);
    bullet.x = CENTRE.x + 60;
    expect(grazeBullet(drive, CENTRE, bullet)).toBe(false);
    bullet.x = CENTRE.x + 10;
    expect(grazeBullet(drive, CENTRE, bullet)).toBe(false);

    expect(drive.energy).toBe(8);
  });

  it.each([
    [28, true],
    [28.01, false],
    [7.01, true],
    [7, false],
    [2, false],
  ])('at %f u from the centre grants a graze: %s', (gap, grants) => {
    const drive = createPulseDrive();

    expect(grazeBullet(drive, CENTRE, shotAt(gap))).toBe(grants);
    expect(drive.energy).toBe(grants ? 8 : 0);
  });

  it('measures the distance in both axes', () => {
    const drive = createPulseDrive();
    const bullet = createBullet(1, { ...ENEMY_SHOT, x: CENTRE.x + 18, y: CENTRE.y - 24 });

    expect(grazeBullet(drive, CENTRE, bullet)).toBe(false);
    bullet.y = CENTRE.y + 21;
    expect(grazeBullet(drive, CENTRE, bullet)).toBe(true);
  });

  it('never grants for player bullets', () => {
    const drive = createPulseDrive();

    expect(grazeBullet(drive, CENTRE, shotAt(20, 1, 'player'))).toBe(false);
    expect(drive.energy).toBe(0);
  });

  it('is earned only by a player who has flown in and is vulnerable', () => {
    const player = vulnerablePlayer();

    expect(canGraze(player, 5)).toBe(true);

    player.protectedUntil = 6;
    expect(canGraze(player, 5)).toBe(false);

    expect(canGraze(createPlayer(1, 5, -10), 5)).toBe(false);
  });
});

describe('activation', () => {
  it('spends all 100 energy and protects for the whole 0.6 s Pulse', () => {
    const drive = createPulseDrive();
    const player = vulnerablePlayer();

    drive.energy = 100;

    expect(activatePulse(drive, player, launch(10, 42))).toBe(true);
    expect(drive).toMatchObject({ energy: 0, active: { id: 42, startedAt: 10 } });
    expect(drive.active?.reached.size).toBe(0);
    expect(PULSE_DURATION).toBe(0.6);
    expect(player.protectedUntil).toBe(10.6);
  });

  it('never shortens a longer protection window', () => {
    const drive = createPulseDrive();
    const player = vulnerablePlayer();

    drive.energy = 100;
    player.protectedUntil = 12;

    activatePulse(drive, player, launch(10));

    expect(player.protectedUntil).toBe(12);
  });

  it('does nothing below 100, while flying in, or while a Pulse is active', () => {
    const drive = createPulseDrive();
    const player = vulnerablePlayer();

    drive.energy = 96;
    expect(activatePulse(drive, player, launch())).toBe(false);

    drive.energy = 100;
    expect(activatePulse(drive, createPlayer(1, 5, 0), launch())).toBe(false);

    drive.active = pulseFrom(9.9);
    expect(activatePulse(drive, player, launch())).toBe(false);

    expect([drive.energy, player.protectedUntil]).toEqual([100, 0]);
  });

  it('ends the active Pulse and keeps the energy', () => {
    const drive = createPulseDrive();

    Object.assign(drive, { energy: 72, active: pulseFrom(0) });

    endPulse(drive);

    expect(drive).toMatchObject({ energy: 72, active: null });
  });
});

describe('radius', () => {
  it.each([
    [0, 0],
    [0.15, 45],
    [0.3, 90],
    [0.45, 135],
    [0.6, 180],
    [0.61, 180],
    [-0.1, 0],
  ])('%f s into the Pulse the radius is %f u', (elapsed, radius) => {
    expect(pulseRadius(pulseFrom(10), 10 + elapsed)).toBeCloseTo(radius, 9);
  });

  it('ends on the pass that reaches 0.6 s', () => {
    const pulse = pulseFrom(10);

    expect([hasPulseEnded(pulse, 10.59), hasPulseEnded(pulse, 10.6)])
      .toEqual([false, true]);
  });

  it('ends on the first pass its protection no longer covers', () => {
    const drive = createPulseDrive();
    const player = vulnerablePlayer();
    let now = 0;

    for (let pass = 0; pass < 1234; pass++) {
      now += 1 / 240;
    }

    drive.energy = 100;
    activatePulse(drive, player, launch(now));
    const pulse = drive.active as Pulse;

    for (let pass = 1; pass <= 150; pass++) {
      now += 1 / 240;
      expect(hasPulseEnded(pulse, now)).toBe(!isProtected(player, now));
    }
  });

  it('is centred on the given position', () => {
    expect(pulseArea(pulseFrom(10), { x: 120, y: 340 }, 10.3))
      .toEqual({ x: 120, y: 340, radius: expect.closeTo(90, 9) });
  });
});

describe('area', () => {
  it('holds a bullet centre at 89 u of a 90 u radius, not one at 91 u', () => {
    const area = { ...CENTRE, radius: 90 };

    expect(isInPulseArea(area, { x: CENTRE.x + 89, y: CENTRE.y })).toBe(true);
    expect(isInPulseArea(area, { x: CENTRE.x + 90, y: CENTRE.y })).toBe(true);
    expect(isInPulseArea(area, { x: CENTRE.x, y: CENTRE.y - 91 })).toBe(false);
  });

  it('reaches a small enemy at 112 u and a size-1.5 boss at 177 u of 100 u', () => {
    const area = { ...CENTRE, radius: 100 };

    expect(isInPulseArea(area, { x: CENTRE.x, y: CENTRE.y - 112 }, 13)).toBe(true);
    expect(isInPulseArea(area, { x: CENTRE.x, y: CENTRE.y - 114 }, 13)).toBe(false);
    expect(isInPulseArea(area, { x: CENTRE.x, y: CENTRE.y - 177 }, 52 * 1.5)).toBe(true);
    expect(isInPulseArea(area, { x: CENTRE.x, y: CENTRE.y - 179 }, 52 * 1.5)).toBe(false);
  });
});

describe('damage', () => {
  it('is fixed at 50 for an enemy and 120 for the boss', () => {
    expect([PULSE_ENEMY_DAMAGE, PULSE_BOSS_DAMAGE]).toEqual([50, 120]);
  });

  it('reaches each entity once per activation', () => {
    const first = pulseFrom(0);

    expect([reachOnce(first, 7), reachOnce(first, 7), reachOnce(first, 8)])
      .toEqual([true, false, true]);

    expect(reachOnce(pulseFrom(1), 7)).toBe(true);
  });
});
