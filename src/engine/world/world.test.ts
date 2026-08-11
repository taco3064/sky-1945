import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createWorld } from './world';
import { bossHpFor } from '../boss';
import { STARTING_LIVES } from '../combat';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import type { EntityRecord, Transform, World } from './world';

/** Advance far enough for several frames to run. */
function runFrames(ms = 200): void {
  vi.advanceTimersByTime(ms);
}

/**
 * Start the world and let the aircraft finish flying in.
 *
 * Every case about steering or reporting the player's position needs this: the
 * craft now arrives from below the bottom edge, and until it is at station the
 * entrance owns its position and input is ignored.
 */
function settle(subject: World): void {
  subject.start();
  runFrames(600);
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
    settle(world);

    const { x, y } = positionOf(world);

    expect(x).toBeCloseTo(FIELD_WIDTH / 2, 0);
    expect(y).toBeGreaterThan(FIELD_HEIGHT / 2);
    expect(y).toBeLessThan(FIELD_HEIGHT);
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
    settle(world);

    const before = positionOf(world);

    runFrames(200);

    const after = positionOf(world);

    expect(after.x).toBeCloseTo(before.x, 5);
    expect(after.y).toBeCloseTo(before.y, 5);
  });

  it('moves the way it is pointed', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });
    settle(world);

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

    settle(straight);

    const straightFrom = positionOf(straight);

    straight.setPlayerDirection(1, 0);
    runFrames(200);

    const straightDistance = positionOf(straight).x - straightFrom.x;

    straight.dispose();

    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });
    settle(world);

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

    settle(slow);

    const slowFrom = positionOf(slow);

    slow.setPlayerDirection(1, 0);
    runFrames(200);

    const slowDistance = positionOf(slow).x - slowFrom.x;

    slow.dispose();

    world = createWorld({ speedMultiplier: 3, powerMultiplier: 1 });
    settle(world);

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

    expect(x).toBeLessThan(FIELD_WIDTH);
    expect(x).toBeGreaterThan(FIELD_WIDTH - 40);
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(40);
  });
});

describe('createWorld · pause', () => {
  it('stops stepping without losing the aircraft', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    const at = trackerFor(world);

    settle(world);
    world.setPlayerDirection(1, 0);
    runFrames(100);

    const stopped = at().x;

    world.pause();
    runFrames(500);

    expect(at().x).toBe(stopped);
    expect(stopped).toBeGreaterThan(FIELD_WIDTH / 2);
  });

  it('resumes from where it stopped, without cashing in the lost time', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    const at = trackerFor(world);

    settle(world);
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

    const fired = latest.filter((entity) => entity.kind === 'player-bullet');

    expect(fired.length).toBeGreaterThan(1);
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
      const shot = entities.find((entity) => entity.kind === 'player-bullet');

      bulletId = shot?.id ?? bulletId;
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

    expect(onCombat).toHaveBeenLastCalledWith({
      rolling: true,
      invulnerable: true,
      ready: false,
    });

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

    expect(entities.filter((entity) => entity.kind === 'player-bullet')).toHaveLength(0);
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

    const bullets = entities.filter((entity) => entity.kind === 'player-bullet');

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

describe('createWorld · rounds', () => {
  it('starts on round one', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    const onRound = vi.fn();

    world.subscribeRound(onRound);

    expect(onRound).toHaveBeenCalledWith(1);
  });

  // The waves end when the last one has been sent *and* the field is clear —
  // not on a timer, so a player who kills nothing still waits for the slowest
  // craft to fly past. What that no longer does is end the round: it summons
  // the boss, and the round runs until the boss dies.
  //
  // Full power so the fight resolves inside the run: the player sits in the
  // centre firing continuously, which is exactly under where the boss settles.
  it('summons the boss when the waves clear, then advances once it dies', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 3 });

    const onRound = vi.fn();
    const onBoss = vi.fn();

    world.subscribeRound(onRound);
    world.subscribeBoss(onBoss);
    world.start();
    runFrames(60000);

    const summoned = onBoss.mock.calls.map(([boss]) => boss).filter(Boolean);

    expect(summoned.length).toBeGreaterThan(0);
    // Its own rolled size, since the pool now scales with it.
    expect(summoned[0].maxHp).toBe(bossHpFor(1, summoned[0].scale));
    expect(onRound.mock.calls.at(-1)?.[0]).toBeGreaterThan(1);
  });

  it('has no boss before the waves are done', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    const onBoss = vi.fn();

    world.subscribeBoss(onBoss);
    world.start();
    runFrames(2000);

    expect(onBoss).toHaveBeenCalledWith(null);
    expect(onBoss.mock.calls.every(([boss]) => boss === null)).toBe(true);
  });
});

describe('createWorld · lives', () => {
  it('starts with a full set', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    const onLives = vi.fn();

    world.subscribeLives(onLives);

    expect(onLives).toHaveBeenCalledWith(STARTING_LIVES);
  });

  /*
   * Left where it spawns, and shot down where it stands.
   *
   * It used to climb into the descending waves, which stopped working: a fresh
   * craft now flies in from below and ignores input for the first third of a
   * second, and three seconds of protection cover most of what follows — so a
   * heading sent between deaths is absent for most of the run. Flown to the top
   * edge it also ends up *above* the boss, where nothing aimed down the screen can
   * reach it.
   *
   * Standing still is now the reliable way to die: the aircraft respawns in the
   * centre of the lower field, and both the waves and the boss fire down it.
   */
  it(
    'spends a life on contact, and ends the run when they are gone',
    { timeout: 30_000 },
    () => {
      world = createWorld({ speedMultiplier: 3, powerMultiplier: 1 });

      const onLives = vi.fn();
      const onGameOver = vi.fn();

      world.subscribeLives(onLives);
      world.subscribeGameOver(onGameOver);
      world.start();

      /*
     * Two and a half minutes of simulated time, measured rather than reasoned: 45
     * seconds spent exactly one life, 150 spends all three.
     *
     * It is slow because nothing here is *playing*. The aircraft stands where it
     * spawned — it does not dodge, does not chase the boss, and does not clear a
     * path. That is the point of the setup, since standing still is what makes the
     * contact reliable, but it is also why the clock has to be this long.
     *
     * Hence the explicit timeout above. This runs about 9,000 frames at four
     * collision passes each, which is half a second on a developer's machine and
     * comfortably past vitest's 5s default on a shared CI runner — where it failed,
     * after merging, because nothing had run the suite on the pull request.
     */
      runFrames(150_000);

      const spent = onLives.mock.calls.map(([remaining]) => remaining as number);

      expect(spent).toContain(STARTING_LIVES - 1);
      expect(spent.at(-1)).toBe(0);
      expect(onGameOver).toHaveBeenCalledOnce();

      /*
     * The run is over, and the engine still has to hold the line on its own.
     *
     * Whoever is watching stops the world when it hears about the game ending,
     * but nothing here has, so the aircraft is still flying and can still be hit.
     * Back down into the boss's fire: a fourth contact must not take the count
     * negative or announce a second game over.
     *
     * It is standing in the lower field with fire coming down at it, so all this
     * has to do is let more of it arrive.
     */
      runFrames(12_000);

      const after = onLives.mock.calls.map(([remaining]) => remaining as number);

      expect(Math.min(...after)).toBe(0);
      expect(onGameOver).toHaveBeenCalledOnce();
    });
});

describe('createWorld · a fresh aircraft does not inherit the last one', () => {
  it('clears the heading on death, so it does not fly on unattended', () => {
    world = createWorld({ speedMultiplier: 3, powerMultiplier: 1 });

    const at = trackerFor(world);

    world.start();
    world.setPlayerDirection(0, -1);
    runFrames(8000);

    const settled = at().y;

    runFrames(2000);

    // Whether or not it has died by now, it is not still climbing under an
    // input nobody gave it.
    expect(Math.abs(at().y - settled)).toBeLessThan(FIELD_HEIGHT / 2);
  });
});

describe('createWorld · a new subscriber is placed immediately', () => {
  /*
   * The transform channel used to be push-only, so anything that mounted between
   * two frames was drawn at the field's origin until the next one arrived.
   *
   * Invisible for a bullet — 16ms at 6×10 units. Not invisible for the boss's
   * beam, which is 88×1000: the whole column flashed at the top-left corner
   * before snapping under the boss, and if the run ended on that frame it simply
   * stayed there. Reported from play as "the beam looks wrong".
   */
  it('tells a fresh subscriber where the entity already is', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });
    world.start();
    runFrames(400);

    const onFrame = vi.fn();

    world.subscribe(world.playerId, onFrame);

    expect(onFrame).toHaveBeenCalledTimes(1);

    expect(onFrame.mock.calls[0][0]).toMatchObject({
      x: expect.any(Number),
      y: expect.any(Number),
    });
  });

  it('places every enemy on the field, not just the player', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });
    world.start();
    runFrames(400);

    let roster: EntityRecord[] = [];

    world.subscribeRoster((entities) => {
      roster = entities;
    });

    const enemy = roster.find(({ kind }) => kind.startsWith('enemy-'));
    const onFrame = vi.fn();

    world.subscribe(enemy?.id as number, onFrame);

    expect(onFrame).toHaveBeenCalledTimes(1);
  });

  // Nothing to say about an id that is not on the field — a burst that has faded,
  // or a bullet removed on the frame its component mounted.
  it('says nothing about an entity that is gone', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });
    world.start();
    runFrames(400);

    const onFrame = vi.fn();

    world.subscribe(999_999, onFrame);

    expect(onFrame).not.toHaveBeenCalled();
  });

  it('holds nothing once disposed', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });
    world.start();
    runFrames(400);

    const id = world.playerId;

    world.dispose();

    const onFrame = vi.fn();

    world.subscribe(id, onFrame);

    expect(onFrame).not.toHaveBeenCalled();
  });
});

describe('createWorld · the frame meter', () => {
  /*
   * Twice a second, not sixty times. A reading per frame would be a React render per
   * frame — exactly what the transform channel exists to avoid — where a window of
   * 500ms is two renders of one small element.
   */
  it('reports at the window rate, not per frame', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    const onRate = vi.fn();

    world.subscribeFrameRate(onRate);
    world.start();
    runFrames(2000);

    expect(onRate.mock.calls.length).toBeGreaterThan(1);
    expect(onRate.mock.calls.length).toBeLessThan(12);
  });

  it('reports a plausible rate and a worst frame', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    const onRate = vi.fn();

    world.subscribeFrameRate(onRate);
    world.start();
    runFrames(1500);

    const [rate] = onRate.mock.calls.at(-1) ?? [];

    expect(rate.fps).toBeGreaterThan(0);
    expect(rate.worst).toBeGreaterThanOrEqual(0);
  });

  it('says nothing before the first window closes', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    const onRate = vi.fn();

    world.subscribeFrameRate(onRate);
    world.start();
    runFrames(100);

    expect(onRate).not.toHaveBeenCalled();
  });

  it('stops reporting once disposed', () => {
    world = createWorld({ speedMultiplier: 1, powerMultiplier: 1 });

    const onRate = vi.fn();

    world.subscribeFrameRate(onRate);
    world.start();
    runFrames(1200);
    world.dispose();

    const seen = onRate.mock.calls.length;

    runFrames(2000);

    expect(onRate.mock.calls.length).toBe(seen);
  });
});
