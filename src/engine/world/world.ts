import { Engine } from 'matter-js';
import type { Body } from 'matter-js';

import { boostsForRound } from '../boosts';
import { createBulletField } from '../bullets';
import type { BulletField } from '../bullets';
import { createChannel, createKeyedChannel } from '../channel';
import type { Channel } from '../channel';
import type { CombatSnapshot } from '../combat';
import { createDirector } from '../director';
import { createEnemyField } from '../enemies';
import type { EnemyField } from '../enemies';
import { createPilot } from '../pilot';
import type { Pilot } from '../pilot';

/**
 * The simulation, and the only animation loop in the repo — the blueprint's
 * `engine` layer owns `requestAnimationFrame`, so a second one cannot be
 * opened anywhere else without lint saying so.
 *
 * Matter runs in sensor mode: gravity off, every body flagged `isSensor`, and
 * every position written directly rather than integrated. What Matter is here
 * for is broad-phase collision — nothing in a bullet-hell game bounces off
 * anything, and a solver stepping 150 bullets would be paying for physics the
 * game never asks about.
 *
 * What this module owns is the *order things happen in*, and the channels the
 * outside world listens on. Everything else lives where it belongs: the
 * player in `../pilot`, enemies in `../enemies`, bullets in `../bullets`, the
 * schedule in `../director`, the field's dimensions in `../field`.
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

/** Matter body ids. */
export type EntityId = number;

/** Everything that can be on the field, flat enough for a lookup table. */
export type EntityKind
  = | 'player'
    | 'player-bullet'
    | 'enemy-bullet'
    | 'enemy-small'
    | 'enemy-medium'
    | 'enemy-large';

export interface EntityRecord {
  id: EntityId;
  kind: EntityKind;
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
 * All three of the non-frame channels want this — a listener that had to wait
 * for the next change to learn the present state would render a round counter
 * showing nothing until the round ended.
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
 * Reads the three fields rather than closing over them, so it lives out here
 * with the other pure helpers instead of inside the factory.
 */
function rosterOf(
  pilot: Pilot,
  bullets: BulletField,
  enemies: EnemyField,
): EntityRecord[] {
  return [
    { id: pilot.id, kind: 'player' },
    ...bullets.records().map(({ id, hostile }): EntityRecord => ({
      id,
      kind: hostile ? 'enemy-bullet' : 'player-bullet',
    })),
    ...enemies.records().map(({ id, kind }): EntityRecord => ({
      id,
      kind: `enemy-${kind}`,
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

export function createWorld(options: WorldOptions): World {
  const engine = Engine.create({ gravity: { x: 0, y: 0 } });
  const pilot = createPilot(engine, options);
  const bullets = createBulletField(engine);
  const enemies = createEnemyField(engine);
  const director = createDirector();

  const channels = {
    frames: createKeyedChannel<EntityId, Transform>(),
    roster: createChannel<EntityRecord[]>(),
    combat: createChannel<CombatSnapshot>(),
    round: createChannel<number>(),
  };

  const loop = { frame: null as number | null, previous: 0 };

  let wasRolling = false;

  /** Everyone moves, everyone who is due fires. Returns whether the roster changed. */
  const advanceAll = (elapsed: number): boolean => {
    const boosts = boostsForRound(director.round());

    for (const spawn of director.advance(elapsed)) {
      enemies.spawn(spawn.kind, spawn.x);
    }

    const fromEnemies = enemies.advance(elapsed, {
      speed: boosts.speed.multiplier,
      power: boosts.power.multiplier,
    });

    const spawned = bullets.add([...pilot.advance(elapsed), ...fromEnemies.shots]);

    return spawned || bullets.advance(elapsed) || fromEnemies.changed;
  };

  const publishFrames = (): void => {
    channels.frames.send(pilot.id, transformOf(pilot.body));

    for (const body of [...bullets.bodies(), ...enemies.bodies()]) {
      channels.frames.send(body.id, transformOf(body));
    }
  };

  /** A round ends when its last wave has been sent and the field is clear. */
  const publishChanges = (rosterChanged: boolean): void => {
    const combat = pilot.snapshot();

    if (rosterChanged) {
      channels.roster.send(rosterOf(pilot, bullets, enemies));
    }

    if (combat.rolling !== wasRolling) {
      wasRolling = combat.rolling;
      channels.combat.send(combat);
    }

    if (director.isDrained() && enemies.count() === 0) {
      director.nextRound();
      channels.round.send(director.round());
    }
  };

  const step = (now: number): void => {
    // Held inside [0, MAX]. The ceiling covers a backgrounded tab; the floor
    // covers a clock that hands back a timestamp older than the last one —
    // rare in a browser, routine under fake timers, and a negative elapsed
    // flies the aircraft backwards rather than failing loudly.
    const elapsed = clamp((now - loop.previous) / 1000, 0, MAX_STEP_SECONDS);

    loop.previous = now;

    const rosterChanged = advanceAll(elapsed);

    Engine.update(engine, elapsed * 1000);
    publishFrames();
    publishChanges(rosterChanged);

    loop.frame = requestAnimationFrame(step);
  };

  return {
    playerId: pilot.id,

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
      bullets.clear();
      enemies.clear();

      for (const channel of Object.values(channels)) {
        channel.clear();
      }

      Engine.clear(engine);
    },

    subscribe: (id, onFrame) => channels.frames.subscribe(id, onFrame),

    subscribeRoster: openWith(channels.roster, () => rosterOf(pilot, bullets, enemies)),

    subscribeCombat: openWith(channels.combat, pilot.snapshot),

    subscribeRound: openWith(channels.round, director.round),

    setPlayerDirection: (x, y) => pilot.point(x, y),

    // Announced here rather than left to the next frame's publish: the
    // animation should start on the keypress, not 16ms after it.
    roll() {
      if (!pilot.roll()) {
        return;
      }

      const combat = pilot.snapshot();

      wasRolling = combat.rolling;
      channels.combat.send(combat);
    },
  };
}
