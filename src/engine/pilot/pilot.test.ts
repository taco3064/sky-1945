import { Engine } from 'matter-js';
import { beforeEach, describe, expect, it } from 'vitest';

import { createPilot } from './pilot';
import { ROLL_COOLDOWN, ROLL_DURATION } from '../combat';
import { PLAYER_BOUNDS_INSET, PLAYER_START_INSET } from '../entities';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import type { Pilot } from './types';

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

/**
 * Fly the aircraft in and stop the moment it is at station.
 *
 * Every case about steering and firing needs this first: an aircraft is not the
 * player's until it has arrived, and before that the entrance owns its position.
 */
function land(subject = pilot): void {
  for (let step = 0; step < 600 && subject.isArriving(); step += 1) {
    subject.advance(1 / 60);
  }
}

describe('pilot · the entrance', () => {
  // The first spawn arrives the same way every respawn does, because "where did
  // that come from" should have exactly one answer.
  it('starts below the bottom edge, centred', () => {
    expect(pilot.body.position.x).toBe(FIELD_WIDTH / 2);
    expect(pilot.body.position.y).toBeGreaterThan(FIELD_HEIGHT);
    expect(pilot.isArriving()).toBe(true);
  });

  it('is on the physics world', () => {
    expect(engine.world.bodies).toContain(pilot.body);
  });

  it('flies up to its station and stops there', () => {
    land();

    expect(pilot.isArriving()).toBe(false);
    expect(pilot.body.position.y).toBe(FIELD_HEIGHT - PLAYER_START_INSET);
    expect(pilot.body.position.x).toBe(FIELD_WIDTH / 2);
  });

  it('holds station rather than flying on past it', () => {
    land();
    run(2);

    expect(pilot.body.position.y).toBe(FIELD_HEIGHT - PLAYER_START_INSET);
  });

  // Input is ignored throughout: a player steering during the entrance would
  // arrive somewhere they did not choose, while still protected.
  it('ignores input while flying in', () => {
    pilot.point(1, 0);
    run(0.1);

    expect(pilot.body.position.x).toBe(FIELD_WIDTH / 2);
    expect(pilot.isArriving()).toBe(true);
  });

  // Arriving under your own fire is the point of arriving.
  it('fires on the way in', () => {
    expect(run(0.25).length).toBeGreaterThan(0);
  });

  it('cannot be killed while it arrives', () => {
    expect(pilot.isVulnerable()).toBe(false);
  });

  // Three seconds covers the flight in and a moment at station afterwards. A
  // player who lands with no protection left was given an animation, not a
  // chance.
  it('is still protected for a while after it lands', () => {
    land();

    expect(pilot.isVulnerable()).toBe(false);

    run(3);

    expect(pilot.isVulnerable()).toBe(true);
  });
});

describe('pilot · movement', () => {
  beforeEach(() => {
    land();
  });

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

    land(diagonal);

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

    land(quick);
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
  beforeEach(() => {
    land();
  });

  it('fires without being asked', () => {
    expect(run(1).length).toBeGreaterThan(1);
  });

  /*
   * 60 frames pass in that second, the rate is seven and a half volleys, and a volley
   * is two shots — one per wing. So fifteen, not sixty and not seven.
   *
   * Asserted as a range rather than exactly fifteen: where the leftover cadence
   * falls depends on the frame the second starts on.
   */
  it('fires on the cadence, not on every frame', () => {
    const shots = run(1);

    expect(shots.length).toBeLessThan(18);
    expect(shots.length).toBeGreaterThan(12);
  });

  // Two cannons, one per wing, firing parallel rather than converging.
  it('fires two trails, one either side of centre', () => {
    const [left, right] = run(0.2).slice(0, 2);
    const centre = pilot.body.position.x;

    expect(left.x).toBeLessThan(centre);
    expect(right.x).toBeGreaterThan(centre);
  });

  it('always fires them as a pair, never one alone', () => {
    expect(run(1).length % 2).toBe(0);
  });

  it('sends both trails straight up, not fanned out', () => {
    const [left, right] = run(0.2).slice(0, 2);

    // Close to zero rather than zero: the heading goes through cos(-90°), which
    // is 6e-17 rather than 0 in a double.
    expect(left.vx).toBeCloseTo(0, 6);
    expect(right.vx).toBeCloseTo(0, 6);
    expect(left.vy).toBe(right.vy);
  });

  it('keeps both cannons the same distance from centre', () => {
    const [left, right] = run(0.2).slice(0, 2);
    const centre = pilot.body.position.x;

    expect(centre - left.x).toBeCloseTo(right.x - centre, 6);
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
  beforeEach(() => {
    land();
  });

  it('reports whether it started', () => {
    expect(pilot.roll()).toBe(true);
    expect(pilot.roll()).toBe(false);
  });

  it('is rolling and invulnerable while it runs', () => {
    pilot.roll();

    expect(pilot.snapshot()).toEqual({ rolling: true, invulnerable: true, ready: false });
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

  // Over, but not yet available: the recovery is the whole point of the change.
  it('is over after its duration, and still recovering', () => {
    pilot.roll();
    run(ROLL_DURATION + 0.1);

    expect(pilot.snapshot().rolling).toBe(false);
    expect(pilot.snapshot().ready).toBe(false);
    expect(pilot.roll()).toBe(false);
  });

  it('is available again once the recovery is done', () => {
    pilot.roll();
    run(ROLL_DURATION + ROLL_COOLDOWN + 0.1);

    expect(pilot.snapshot().ready).toBe(true);
    expect(pilot.roll()).toBe(true);
  });

  // The guns come back the moment the roll ends, not when the recovery does —
  // silence is the roll's cost, and the recovery is a separate limit.
  it('fires again during the recovery', () => {
    pilot.roll();
    run(ROLL_DURATION + 0.02);

    expect(run(0.3).length).toBeGreaterThan(0);
  });

  it('keeps moving while rolling', () => {
    pilot.point(1, 0);
    pilot.roll();
    run(0.3);

    expect(pilot.body.position.x).toBeGreaterThan(FIELD_WIDTH / 2);
  });

  /*
   * Rolling as often as the rules allow costs about half the output, and that is
   * the equilibrium now: protection for half the time, fire for the other half.
   *
   * It used to be nearly *all* of the output, because rolls chained end to end. A
   * recovery window equal to the roll's own length is what turns permanent
   * invulnerability into a rhythm.
   */
  it('trades away about half the output when rolled as often as allowed', () => {
    let rolling = 0;

    /*
     * One frame past the roll's length, not exactly it.
     *
     * `run` accumulates 1/60 seconds at a time, so after 72 frames the clock is a
     * few floating-point ulps *short* of 1.2 — enough for the next roll to be
     * refused as "one is still running", after which no time advances and every
     * later roll is refused too. The extra frame steps over that boundary rather
     * than asserting that decimal arithmetic is exact.
     */
    for (let round = 0; round < 4; round += 1) {
      pilot.roll();
      rolling += run(ROLL_DURATION + 1 / 60).length;
    }

    const straight = createPilot(engine, { speedMultiplier: 1, powerMultiplier: 1 });
    const free = run(ROLL_DURATION * 4, straight).length;

    expect(rolling).toBeLessThan(free * 0.75);
    expect(rolling).toBeGreaterThan(free / 4);
  });
});
