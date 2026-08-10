import { Engine } from 'matter-js';
import { beforeEach, describe, expect, it } from 'vitest';

import { createPilot } from './pilot';
import type { Pilot } from './pilot';
import { ROLL_DURATION } from '../combat';
import { PLAYER_BOUNDS_INSET } from '../entities';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';

let engine: Engine;
let pilot: Pilot;

beforeEach(() => {
  engine = Engine.create({ gravity: { x: 0, y: 0 } });
  pilot = createPilot(engine, { speedMultiplier: 1, powerMultiplier: 1 });
});

/** Run 60Hz frames, returning everything fired along the way. */
function run(seconds: number, subject = pilot) {
  const step = 1 / 60;
  const shots = [];

  for (let elapsed = 0; elapsed < seconds; elapsed += step) {
    shots.push(...subject.advance(step));
  }

  return shots;
}

describe('pilot · where it starts', () => {
  it('starts centred, near the bottom', () => {
    expect(pilot.body.position.x).toBe(FIELD_WIDTH / 2);
    expect(pilot.body.position.y).toBeGreaterThan(FIELD_HEIGHT / 2);
    expect(pilot.body.position.y).toBeLessThan(FIELD_HEIGHT);
  });

  it('is on the physics world', () => {
    expect(engine.world.bodies).toContain(pilot.body);
  });
});

describe('pilot · movement', () => {
  it('stays put until pointed', () => {
    const before = { ...pilot.body.position };

    run(0.5);

    expect(pilot.body.position.x).toBe(before.x);
    expect(pilot.body.position.y).toBe(before.y);
  });

  it('moves the way it is pointed, and stops when released', () => {
    pilot.point(1, 0);
    run(0.2);

    const moved = pilot.body.position.x;

    pilot.point(0, 0);
    run(0.2);

    expect(moved).toBeGreaterThan(FIELD_WIDTH / 2);
    expect(pilot.body.position.x).toBe(moved);
  });

  // A diagonal built from two unit inputs is 1.41 long. Left unnormalised,
  // corner-ward movement would be 41% faster — the oldest bug in top-down
  // movement.
  it('does not travel faster on the diagonal', () => {
    pilot.point(1, 0);
    run(0.3);

    const straight = pilot.body.position.x - FIELD_WIDTH / 2;
    const diagonal = createPilot(engine, { speedMultiplier: 1, powerMultiplier: 1 });
    const from = { ...diagonal.body.position };

    diagonal.point(1, 1);
    run(0.3, diagonal);

    const travelled = Math.hypot(
      diagonal.body.position.x - from.x,
      diagonal.body.position.y - from.y,
    );

    expect(travelled).toBeCloseTo(straight, 4);
  });

  it('covers more ground with a higher speed multiplier', () => {
    pilot.point(1, 0);
    run(0.2);

    const slow = pilot.body.position.x - FIELD_WIDTH / 2;
    const quick = createPilot(engine, { speedMultiplier: 3, powerMultiplier: 1 });

    quick.point(1, 0);
    run(0.2, quick);

    expect(quick.body.position.x - FIELD_WIDTH / 2).toBeGreaterThan(slow * 2);
  });

  it.each([
    ['right', 1, 0],
    ['left', -1, 0],
    ['up', 0, -1],
    ['down', 0, 1],
  ])('stops at the %s edge instead of flying out', (_way, x, y) => {
    pilot.point(x, y);
    run(10);

    const { position } = pilot.body;

    expect(position.x).toBeGreaterThanOrEqual(PLAYER_BOUNDS_INSET);
    expect(position.x).toBeLessThanOrEqual(FIELD_WIDTH - PLAYER_BOUNDS_INSET);
    expect(position.y).toBeGreaterThanOrEqual(PLAYER_BOUNDS_INSET);
    expect(position.y).toBeLessThanOrEqual(FIELD_HEIGHT - PLAYER_BOUNDS_INSET);
  });
});

describe('pilot · the guns fire themselves', () => {
  it('fires without being asked', () => {
    expect(run(1).length).toBeGreaterThan(1);
  });

  // 60 frames pass in that second; the cadence is one shot every 0.1s.
  it('fires on the cadence, not on every frame', () => {
    const shots = run(1);

    expect(shots.length).toBeLessThan(15);
    expect(shots.length).toBeGreaterThan(5);
  });

  it('fires upward, as the player', () => {
    for (const shot of run(0.5)) {
      expect(shot.vy).toBeLessThan(0);
      expect(shot.side).toBe('player');
    }
  });

  it('hits harder with a higher power multiplier', () => {
    const [weak] = run(0.2);
    const strong = createPilot(engine, { speedMultiplier: 1, powerMultiplier: 3 });
    const [heavy] = run(0.2, strong);

    expect(heavy.damage).toBeCloseTo(weak.damage * 3, 6);
  });

  it('fires from ahead of the aircraft, not from its centre', () => {
    const [shot] = run(0.2);

    expect(shot.y).toBeLessThan(pilot.body.position.y);
  });
});

describe('pilot · the roll', () => {
  it('reports whether it started', () => {
    expect(pilot.roll()).toBe(true);
    expect(pilot.roll()).toBe(false);
  });

  it('is rolling and invulnerable while it runs', () => {
    pilot.roll();

    expect(pilot.snapshot()).toEqual({ rolling: true, invulnerable: true });
  });

  // The cost that replaces a cooldown.
  it('silences the guns for its duration', () => {
    pilot.roll();

    expect(run(ROLL_DURATION * 0.9)).toHaveLength(0);
  });

  it('fires again once the roll ends', () => {
    pilot.roll();
    run(ROLL_DURATION * 0.9);

    expect(run(0.5).length).toBeGreaterThan(0);
  });

  it('is over, and available again, after its duration', () => {
    pilot.roll();
    run(ROLL_DURATION + 0.1);

    expect(pilot.snapshot().rolling).toBe(false);
    expect(pilot.roll()).toBe(true);
  });

  it('keeps moving while rolling', () => {
    pilot.point(1, 0);
    pilot.roll();
    run(0.3);

    expect(pilot.body.position.x).toBeGreaterThan(FIELD_WIDTH / 2);
  });

  // Chain-rolling is the intended equilibrium: invulnerability bought with
  // output. Not *zero* output — the frame a roll expires can fire before the
  // next one starts — but an order of magnitude less than flying straight,
  // which is what makes rolling forever a losing strategy rather than a free
  // one.
  it('trades away almost all of the output when chained', () => {
    let rolling = 0;

    for (let round = 0; round < 4; round += 1) {
      pilot.roll();
      rolling += run(ROLL_DURATION).length;
    }

    const straight = createPilot(engine, { speedMultiplier: 1, powerMultiplier: 1 });
    const free = run(ROLL_DURATION * 4, straight).length;

    expect(rolling).toBeLessThan(free / 3);
  });
});
