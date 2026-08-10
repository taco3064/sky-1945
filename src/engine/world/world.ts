import { Engine } from 'matter-js';
import type { Body } from 'matter-js';

import { createBulletField } from '../bullets';
import { createChannel, createKeyedChannel } from '../channel';
import type { Channel } from '../channel';
import { STARTING_LIVES } from '../combat';
import type { CombatSnapshot } from '../combat';
import { createCollisionWatch } from '../collisions';
import { createDirector } from '../director';
import { createEffectField } from '../effects';
import type { BurstSize, BurstTone } from '../effects';
import { createEnemyField } from '../enemies';
import { stepFrame } from '../frame';
import type { FrameParts, FrameResult } from '../frame';
import { createPilot } from '../pilot';

/**
 * The simulation's lifetime, and the channels the outside world listens on.
 *
 * What happens inside a frame lives in `../frame`; the field's dimensions in
 * `../field`; the player in `../pilot`; enemies, bullets and bursts in their
 * own fields. This module creates them, runs the one animation loop the repo
 * is allowed (the blueprint's `engine` layer owns `requestAnimationFrame`),
 * and publishes what changed.
 *
 * Matter runs in sensor mode throughout: gravity off, every body a sensor,
 * every position written directly. Matter reports contacts; nothing here is
 * ever pushed by anything.
 */

/**
 * One frame at 60Hz, and the ceiling on any single step.
 *
 * Matter warns above 16.667ms and its solver degrades past it, so a long gap
 * — a backgrounded tab, a stalled frame — is served as one normal step rather
 * than one huge one. The game slows down instead of teleporting, which in a
 * bullet-hell game is the kinder failure: a player can react to slow motion,
 * and cannot react to being moved 300 units into a wall of bullets.
 */
const MAX_STEP_SECONDS = 1 / 60;

/** Matter body ids, and burst ids — which count down from -1. */
export type EntityId = number;

/** Everything that can be on the field, flat enough for a lookup table. */
export type EntityKind
  = | 'player'
    | 'player-bullet'
    | 'enemy-bullet'
    | 'enemy-small'
    | 'enemy-medium'
    | 'enemy-large'
    | 'burst';

export interface EntityRecord {
  id: EntityId;
  kind: EntityKind;
  /** Bursts only: how big, and whose wreckage it is. */
  burst?: { size: BurstSize; tone: BurstTone };
}

export interface Vector2 {
  /** World units from the field's left edge. */
  x: number;
  /** World units from the field's top edge. */
  y: number;
}

export interface Transform extends Vector2 {
  /** Degrees, ready for a CSS rotate(). */
  angle: number;
}

export type FrameListener = (transform: Transform) => void;
export type RosterListener = (entities: EntityRecord[]) => void;
export type CombatListener = (snapshot: CombatSnapshot) => void;
export type RoundListener = (round: number) => void;
export type LivesListener = (remaining: number) => void;
export type GameOverListener = () => void;

export interface WorldOptions {
  /** The loadout's speed multiplier, 1–3. */
  speedMultiplier: number;
  /** The loadout's power multiplier, 1–3. */
  powerMultiplier: number;
}

export interface World {
  /** The player body's id, for subscribing to it. */
  readonly playerId: EntityId;
  /** Begin stepping. Also resumes from `pause`. Twice is a no-op. */
  start: () => void;
  /** Stop stepping, keeping every body. `start` resumes without a jump. */
  pause: () => void;
  /** Stop the loop and release everything. Safe to call more than once. */
  dispose: () => void;
  /** Watch an entity's transform. Returns its own unsubscribe. */
  subscribe: (id: EntityId, onFrame: FrameListener) => () => void;
  /** Watch which entities exist. Fires on spawn and despawn, not per frame. */
  subscribeRoster: (onChange: RosterListener) => () => void;
  /** Watch the player's combat state. Fires on change, not per frame. */
  subscribeCombat: (onChange: CombatListener) => () => void;
  /** Watch the round number. Fires when a round is cleared. */
  subscribeRound: (onChange: RoundListener) => () => void;
  /**
   * Watch how many aircraft the run has left.
   *
   * Lives live here rather than in React because they and the death that
   * spends them are one decision: the world knows the player was hit, so it is
   * the only place that can subtract a life and respawn in the same breath.
   * Holding a copy upstairs would be two numbers that can disagree.
   */
  subscribeLives: (onChange: LivesListener) => () => void;
  /** Fires when the last life is gone. */
  subscribeGameOver: (onGameOver: GameOverListener) => () => void;
  /** Point the player. Any vector; length is normalised away. */
  setPlayerDirection: (x: number, y: number) => void;
  /** Attempt a barrel roll. Ignored while one is already running. */
  roll: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Subscribe, and deliver the current value straight away.
 *
 * A listener that had to wait for the next change to learn the present state
 * would render a round counter showing nothing until the round ended.
 */
function openWith<T>(channel: Channel<T>, current: () => T) {
  return (onChange: (value: T) => void) => {
    const stop = channel.subscribe(onChange);

    onChange(current());

    return stop;
  };
}

/**
 * Everything on the field, right now.
 *
 * Reads the parts rather than closing over them, so it lives out here with the
 * other pure helpers instead of inside the factory.
 */
function rosterOf(parts: FrameParts): EntityRecord[] {
  return [
    { id: parts.pilot.id, kind: 'player' },
    ...parts.bullets.records().map(({ id, hostile }): EntityRecord => ({
      id,
      kind: hostile ? 'enemy-bullet' : 'player-bullet',
    })),
    ...parts.enemies.records().map(({ id, kind }): EntityRecord => ({
      id,
      kind: `enemy-${kind}`,
    })),
    ...parts.effects.records().map(({ id, size, tone }): EntityRecord => ({
      id,
      kind: 'burst',
      burst: { size, tone },
    })),
  ];
}

function transformOf(body: Body): Transform {
  return {
    x: body.position.x,
    y: body.position.y,
    angle: (body.angle * 180) / Math.PI,
  };
}

/** Build the simulation's moving parts. */
function assemble(engine: Engine, options: WorldOptions): FrameParts {
  return {
    engine,
    pilot: createPilot(engine, options),
    bullets: createBulletField(engine),
    enemies: createEnemyField(engine),
    effects: createEffectField(),
    collisions: createCollisionWatch(engine),
    director: createDirector(),
  };
}

export function createWorld(options: WorldOptions): World {
  const engine = Engine.create({ gravity: { x: 0, y: 0 } });
  const parts = assemble(engine, options);

  const channels = {
    frames: createKeyedChannel<EntityId, Transform>(),
    roster: createChannel<EntityRecord[]>(),
    combat: createChannel<CombatSnapshot>(),
    round: createChannel<number>(),
    lives: createChannel<number>(),
    gameOver: createChannel<void>(),
  };

  const loop = { frame: null as number | null, previous: 0 };

  let wasRolling = false;
  let lives = STARTING_LIVES;

  /**
   * Spend a life, and end the run if that was the last one.
   *
   * The fresh aircraft is already up and already protected — `pilot.kill()`
   * does both, because a frame resolves in several collision passes and a craft
   * left unprotected between them would die again on the next one.
   */
  const spendLife = (): void => {
    // The run is already over. Whoever is watching stops the world when they
    // hear about it, but the engine holds the invariant itself rather than
    // trusting that to arrive before the next contact does.
    if (lives === 0) {
      return;
    }

    lives -= 1;
    channels.lives.send(lives);

    if (lives > 0) {
      return;
    }

    channels.gameOver.send(undefined);
  };

  const publishFrames = (): void => {
    channels.frames.send(parts.pilot.id, transformOf(parts.pilot.body));

    for (const body of [...parts.bullets.bodies(), ...parts.enemies.bodies()]) {
      channels.frames.send(body.id, transformOf(body));
    }

    // Bursts do not move, but a subscriber mounting after one began still has
    // to hear a position from somewhere.
    for (const { id, x, y } of parts.effects.placements()) {
      channels.frames.send(id, { x, y, angle: 0 });
    }
  };

  const publish = (result: FrameResult): void => {
    const combat = parts.pilot.snapshot();

    if (result.rosterChanged) {
      channels.roster.send(rosterOf(parts));
    }

    if (combat.rolling !== wasRolling) {
      wasRolling = combat.rolling;
      channels.combat.send(combat);
    }

    if (result.roundAdvanced) {
      channels.round.send(parts.director.round());
    }

    if (result.playerDied) {
      spendLife();
    }
  };

  const step = (now: number): void => {
    // Held inside [0, MAX]. The ceiling covers a backgrounded tab; the floor
    // covers a clock that hands back a timestamp older than the last one —
    // rare in a browser, routine under fake timers, and a negative elapsed
    // flies the aircraft backwards rather than failing loudly.
    const elapsed = clamp((now - loop.previous) / 1000, 0, MAX_STEP_SECONDS);

    loop.previous = now;
    publishFrames();
    publish(stepFrame(parts, elapsed));

    loop.frame = requestAnimationFrame(step);
  };

  return {
    playerId: parts.pilot.id,

    start() {
      if (loop.frame !== null) {
        return;
      }

      loop.previous = performance.now();
      loop.frame = requestAnimationFrame(step);
    },

    pause() {
      if (loop.frame !== null) {
        cancelAnimationFrame(loop.frame);
        loop.frame = null;
      }
    },

    dispose() {
      this.pause();
      parts.collisions.dispose();
      parts.bullets.clear();
      parts.enemies.clear();
      parts.effects.clear();

      for (const channel of Object.values(channels)) {
        channel.clear();
      }

      Engine.clear(engine);
    },

    subscribe: (id, onFrame) => channels.frames.subscribe(id, onFrame),

    subscribeRoster: openWith(channels.roster, () => rosterOf(parts)),

    subscribeCombat: openWith(channels.combat, parts.pilot.snapshot),

    subscribeRound: openWith(channels.round, parts.director.round),

    subscribeLives: openWith(channels.lives, () => lives),

    subscribeGameOver: (onGameOver) => channels.gameOver.subscribe(onGameOver),

    setPlayerDirection: (x, y) => parts.pilot.point(x, y),

    // Announced here rather than left to the next frame's publish: the
    // animation should start on the keypress, not 16ms after it.
    roll() {
      if (!parts.pilot.roll()) {
        return;
      }

      const combat = parts.pilot.snapshot();

      wasRolling = combat.rolling;
      channels.combat.send(combat);
    },
  };
}
