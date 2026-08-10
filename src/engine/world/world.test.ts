import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WORLD_HEIGHT, WORLD_WIDTH, createWorld } from './world';
import type { EntityRecord, Transform, World } from './world';

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

/**
 * Reads the last transform delivered, without advancing anything.
 *
 * `positionOf` waits a frame for one, which is exactly wrong while paused —
 * no frame is coming, and it reads back its own zero.
 */
function trackerFor(world: World): () => Transform {
  let last: Transform = { x: 0, y: 0, angle: 0 };

  world.subscribe(world.playerId, (transform) => {
    last = transform;
  });

  return () => last;
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
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    const onFrame = vi.fn();

    world.subscribe(world.playerId, onFrame);
    runFrames();

    expect(onFrame).not.toHaveBeenCalled();
  });

  it('publishes every frame once started', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    const onFrame = vi.fn();

    world.subscribe(world.playerId, onFrame);
    world.start();
    runFrames();

    expect(onFrame.mock.calls.length).toBeGreaterThan(1);
  });

  // Two starts opening two loops would double every frame's movement, and
  // the second handle would leak past dispose.
  it('does not open a second loop when started twice', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

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
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

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
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    world.start();
    world.dispose();

    expect(() => world.dispose()).not.toThrow();
  });
});

describe('createWorld · subscriptions', () => {
  it('reports the player in world units', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });
    world.start();

    const { x, y } = positionOf(world);

    expect(x).toBeCloseTo(WORLD_WIDTH / 2, 0);
    expect(y).toBeGreaterThan(WORLD_HEIGHT / 2);
    expect(y).toBeLessThan(WORLD_HEIGHT);
  });

  it('stops delivering to an unsubscribed listener', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

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
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

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
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    const onFrame = vi.fn();

    world.subscribe(world.playerId + 999, onFrame);
    world.start();
    runFrames(100);

    expect(onFrame).not.toHaveBeenCalled();
  });
});

describe('createWorld · movement', () => {
  it('stays put with no direction set', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });
    world.start();

    const before = positionOf(world);

    runFrames(200);

    const after = positionOf(world);

    expect(after.x).toBeCloseTo(before.x, 5);
    expect(after.y).toBeCloseTo(before.y, 5);
  });

  it('moves the way it is pointed', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });
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
    const straight = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    straight.start();

    const straightFrom = positionOf(straight);

    straight.setPlayerDirection(1, 0);
    runFrames(200);

    const straightDistance = positionOf(straight).x - straightFrom.x;

    straight.dispose();

    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });
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
    const slow = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    slow.start();

    const slowFrom = positionOf(slow);

    slow.setPlayerDirection(1, 0);
    runFrames(200);

    const slowDistance = positionOf(slow).x - slowFrom.x;

    slow.dispose();

    world = createWorld({ speedMultiplier: 3, powerMultiplier: 1 });
    world.start();

    const fastFrom = positionOf(world);

    world.setPlayerDirection(1, 0);
    runFrames(200);

    const fastDistance = positionOf(world).x - fastFrom.x;

    expect(fastDistance).toBeGreaterThan(slowDistance * 2);
  });

  it('stops at the field edges instead of flying out', () => {
    world = createWorld({ speedMultiplier: 3, powerMultiplier: 1 });
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

describe('createWorld · pause', () => {
  it('stops stepping without losing the aircraft', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    const at = trackerFor(world);

    world.start();
    world.setPlayerDirection(1, 0);
    runFrames(100);

    const stopped = at().x;

    world.pause();
    runFrames(500);

    expect(at().x).toBe(stopped);
    expect(stopped).toBeGreaterThan(WORLD_WIDTH / 2);
  });

  it('resumes from where it stopped, without cashing in the lost time', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    const at = trackerFor(world);

    world.start();
    world.setPlayerDirection(1, 0);
    runFrames(100);
    world.pause();
    runFrames(5000);

    const before = at().x;

    world.start();
    runFrames(20);

    // A step is capped at one frame, so five seconds of pause cannot arrive
    // as one enormous move — a frame at 300 units/s is five units.
    expect(at().x - before).toBeLessThan(20);
  });

  it('is safe to pause twice', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });
    world.start();
    world.pause();

    expect(() => world.pause()).not.toThrow();
  });
});

describe('createWorld · the guns fire themselves', () => {
  it('puts bullets in the roster with no input at all', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    const onRoster = vi.fn();

    world.subscribeRoster(onRoster);
    world.start();
    runFrames(500);

    const latest = onRoster.mock.calls.at(-1)?.[0] as EntityRecord[];

    expect(latest.filter((entity) => entity.kind === 'bullet').length).toBeGreaterThan(1);
  });

  it('always keeps the player in the roster', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    const onRoster = vi.fn();

    world.subscribeRoster(onRoster);

    expect(onRoster.mock.calls[0][0]).toEqual([{ id: world.playerId, kind: 'player' }]);
  });

  it('publishes transforms for bullets, not only the player', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    let bulletId = 0;

    world.subscribeRoster((entities) => {
      bulletId = entities.find((entity) => entity.kind === 'bullet')?.id ?? bulletId;
    });

    world.start();
    runFrames(300);

    const onFrame = vi.fn();

    world.subscribe(bulletId, onFrame);
    runFrames(100);

    expect(onFrame).toHaveBeenCalled();
  });

  it('stops delivering roster changes after unsubscribing', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    const onRoster = vi.fn();
    const stop = world.subscribeRoster(onRoster);

    world.start();
    runFrames(300);
    stop();

    const settled = onRoster.mock.calls.length;

    runFrames(500);

    expect(onRoster).toHaveBeenCalledTimes(settled);
  });
});

describe('createWorld · the roll', () => {
  it('announces immediately, then again when it ends', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    const onCombat = vi.fn();

    world.subscribeCombat(onCombat);
    world.start();
    runFrames(50);
    world.roll();

    expect(onCombat).toHaveBeenLastCalledWith({ rolling: true, invulnerable: true });

    runFrames(1500);

    expect(onCombat).toHaveBeenLastCalledWith(
      expect.objectContaining({ rolling: false }),
    );
  });

  // The cost that replaces a cooldown: rolling forever means killing nothing.
  it('silences the guns while it runs', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    let entities: EntityRecord[] = [];

    world.subscribeRoster((next) => {
      entities = next;
    });

    world.start();
    world.roll();
    runFrames(900);

    expect(entities.filter((entity) => entity.kind === 'bullet')).toHaveLength(0);
  });

  it('fires again once the roll ends', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    let entities: EntityRecord[] = [];

    world.subscribeRoster((next) => {
      entities = next;
    });

    world.start();
    world.roll();
    runFrames(1600);

    const bullets = entities.filter((entity) => entity.kind === 'bullet');

    expect(bullets.length).toBeGreaterThan(0);
  });

  it('ignores a roll requested mid-roll', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    const onCombat = vi.fn();

    world.subscribeCombat(onCombat);
    world.start();
    world.roll();

    const announced = onCombat.mock.calls.length;

    world.roll();

    expect(onCombat).toHaveBeenCalledTimes(announced);
  });

  it('stops delivering combat changes after unsubscribing', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    const onCombat = vi.fn();
    const stop = world.subscribeCombat(onCombat);

    stop();
    world.start();
    world.roll();
    runFrames(1500);

    expect(onCombat).toHaveBeenCalledOnce();
  });
});
