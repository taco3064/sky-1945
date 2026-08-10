import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WORLD_HEIGHT, WORLD_WIDTH, createWorld } from './world';
import type { Transform, World } from './world';

/** Advance far enough for several frames to run. */
function runFrames(ms = 200): void {
  vi.advanceTimersByTime(ms);
}

/** Read the player's transform without waiting for a subscriber callback. */
function positionOf(world: World): Transform {
  let seen: Transform = { x: 0, y: 0, angle: 0 };

  const stop = world.subscribe(world.playerId, (transform) => {
    seen = transform;
  });

  vi.advanceTimersByTime(20);
  stop();

  return seen;
}

let world: World;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  world?.dispose();
  vi.useRealTimers();
});

describe('createWorld · the loop', () => {
  it('publishes nothing until it is started', () => {
    world = createWorld({ speedMultiplier: 1 });

    const onFrame = vi.fn();

    world.subscribe(world.playerId, onFrame);
    runFrames();

    expect(onFrame).not.toHaveBeenCalled();
  });

  it('publishes every frame once started', () => {
    world = createWorld({ speedMultiplier: 1 });

    const onFrame = vi.fn();

    world.subscribe(world.playerId, onFrame);
    world.start();
    runFrames();

    expect(onFrame.mock.calls.length).toBeGreaterThan(1);
  });

  // Two starts opening two loops would double every frame's movement, and
  // the second handle would leak past dispose.
  it('does not open a second loop when started twice', () => {
    world = createWorld({ speedMultiplier: 1 });

    const onFrame = vi.fn();

    world.subscribe(world.playerId, onFrame);
    world.start();
    runFrames(100);

    const afterOne = onFrame.mock.calls.length;

    world.start();
    runFrames(100);

    expect(onFrame.mock.calls.length).toBeLessThanOrEqual(afterOne * 2 + 1);
  });

  it('stops publishing after dispose', () => {
    world = createWorld({ speedMultiplier: 1 });

    const onFrame = vi.fn();

    world.subscribe(world.playerId, onFrame);
    world.start();
    runFrames(100);
    world.dispose();

    const atDispose = onFrame.mock.calls.length;

    runFrames(500);

    expect(onFrame).toHaveBeenCalledTimes(atDispose);
  });

  it('survives a second dispose', () => {
    world = createWorld({ speedMultiplier: 1 });

    world.start();
    world.dispose();

    expect(() => world.dispose()).not.toThrow();
  });
});

describe('createWorld · subscriptions', () => {
  it('reports the player in world units', () => {
    world = createWorld({ speedMultiplier: 1 });
    world.start();

    const { x, y } = positionOf(world);

    expect(x).toBeCloseTo(WORLD_WIDTH / 2, 0);
    expect(y).toBeGreaterThan(WORLD_HEIGHT / 2);
    expect(y).toBeLessThan(WORLD_HEIGHT);
  });

  it('stops delivering to an unsubscribed listener', () => {
    world = createWorld({ speedMultiplier: 1 });

    const onFrame = vi.fn();
    const stop = world.subscribe(world.playerId, onFrame);

    world.start();
    runFrames(100);
    stop();

    const atStop = onFrame.mock.calls.length;

    runFrames(200);

    expect(onFrame).toHaveBeenCalledTimes(atStop);
  });

  it('delivers to every listener on one entity', () => {
    world = createWorld({ speedMultiplier: 1 });

    const first = vi.fn();
    const second = vi.fn();

    world.subscribe(world.playerId, first);
    world.subscribe(world.playerId, second);
    world.start();
    runFrames(100);

    expect(first).toHaveBeenCalled();
    expect(second).toHaveBeenCalled();
  });

  it('ignores a subscription to an entity that is not there', () => {
    world = createWorld({ speedMultiplier: 1 });

    const onFrame = vi.fn();

    world.subscribe(world.playerId + 999, onFrame);
    world.start();
    runFrames(100);

    expect(onFrame).not.toHaveBeenCalled();
  });
});

describe('createWorld · movement', () => {
  it('stays put with no direction set', () => {
    world = createWorld({ speedMultiplier: 1 });
    world.start();

    const before = positionOf(world);

    runFrames(200);

    const after = positionOf(world);

    expect(after.x).toBeCloseTo(before.x, 5);
    expect(after.y).toBeCloseTo(before.y, 5);
  });

  it('moves the way it is pointed', () => {
    world = createWorld({ speedMultiplier: 1 });
    world.start();

    const before = positionOf(world);

    world.setPlayerDirection(1, 0);
    runFrames(200);

    const after = positionOf(world);

    expect(after.x).toBeGreaterThan(before.x);
    expect(after.y).toBeCloseTo(before.y, 5);
  });

  // A diagonal built from two unit inputs is 1.41 long. Left unnormalised,
  // moving corner-ward would be 41% faster than moving straight — the oldest
  // bug in top-down movement.
  it('does not move faster on the diagonal', () => {
    const straight = createWorld({ speedMultiplier: 1 });

    straight.start();

    const straightFrom = positionOf(straight);

    straight.setPlayerDirection(1, 0);
    runFrames(200);

    const straightDistance = positionOf(straight).x - straightFrom.x;

    straight.dispose();

    world = createWorld({ speedMultiplier: 1 });
    world.start();

    const diagonalFrom = positionOf(world);

    world.setPlayerDirection(1, 1);
    runFrames(200);

    const diagonal = positionOf(world);

    const diagonalDistance = Math.hypot(
      diagonal.x - diagonalFrom.x,
      diagonal.y - diagonalFrom.y,
    );

    expect(diagonalDistance).toBeCloseTo(straightDistance, 0);
  });

  it('covers more ground with a higher speed multiplier', () => {
    const slow = createWorld({ speedMultiplier: 1 });

    slow.start();

    const slowFrom = positionOf(slow);

    slow.setPlayerDirection(1, 0);
    runFrames(200);

    const slowDistance = positionOf(slow).x - slowFrom.x;

    slow.dispose();

    world = createWorld({ speedMultiplier: 3 });
    world.start();

    const fastFrom = positionOf(world);

    world.setPlayerDirection(1, 0);
    runFrames(200);

    const fastDistance = positionOf(world).x - fastFrom.x;

    expect(fastDistance).toBeGreaterThan(slowDistance * 2);
  });

  it('stops at the field edges instead of flying out', () => {
    world = createWorld({ speedMultiplier: 3 });
    world.start();
    world.setPlayerDirection(1, -1);
    runFrames(4000);

    const { x, y } = positionOf(world);

    expect(x).toBeLessThan(WORLD_WIDTH);
    expect(x).toBeGreaterThan(WORLD_WIDTH - 40);
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(40);
  });
});
