import { Body, Composite, Engine } from 'matter-js';

import {
  BULLET_BASE_DAMAGE,
  PLAYER_BASE_SPEED,
  PLAYER_BOUNDS_INSET,
  PLAYER_MUZZLE_OFFSET,
  PLAYER_START_INSET,
  createPlayer,
} from '../entities';
import { createBulletField } from '../bullets';
import { canFire, createCombat, isInvulnerable, isRolling, startRoll } from '../combat';
import { createChannel, createKeyedChannel } from '../channel';
import type { Combat } from '../combat';

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
 * What lives elsewhere, and why: bullets are their own field (`../bullets`),
 * the roll and its protection are their own state (`../combat`), and the
 * three subscription channels are one shape used three times (`../channel`).
 * This module keeps the field, the player, and the order things happen in.
 */

/**
 * The field, in world units, on every device.
 *
 * Fixed rather than sized to the screen, because a wider field is an easier
 * field: the same wave would be more dodgeable on a tablet than on a phone.
 * The screen scales to these numbers (`useStageScale`); the numbers never
 * scale to the screen.
 */
export const WORLD_WIDTH = 540;
export const WORLD_HEIGHT = 960;

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

/** What a record in the roster is. */
export type EntityKind = 'player' | 'bullet';

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

/** What the aircraft is doing, as opposed to where it is. */
export interface CombatSnapshot {
  rolling: boolean;
  invulnerable: boolean;
}

export type FrameListener = (transform: Transform) => void;
export type RosterListener = (entities: EntityRecord[]) => void;
export type CombatListener = (snapshot: CombatSnapshot) => void;

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
  /** Point the player. Any vector; length is normalised away. */
  setPlayerDirection: (x: number, y: number) => void;
  /** Attempt a barrel roll. Ignored while one is already running. */
  roll: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Drives the player straight from input rather than through forces.
 *
 * Inertia on a dodge reads as input lag, and in a game where contact is fatal
 * the player has to be able to stop on the frame they let go.
 */
function movePlayer(body: Body, direction: Vector2, distance: number): void {
  const length = Math.hypot(direction.x, direction.y);

  if (length === 0) {
    return;
  }

  const x = body.position.x + (direction.x / length) * distance;
  const y = body.position.y + (direction.y / length) * distance;

  Body.setPosition(body, {
    x: clamp(x, PLAYER_BOUNDS_INSET, WORLD_WIDTH - PLAYER_BOUNDS_INSET),
    y: clamp(y, PLAYER_BOUNDS_INSET, WORLD_HEIGHT - PLAYER_BOUNDS_INSET),
  });
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
  const player = createPlayer(WORLD_WIDTH / 2, WORLD_HEIGHT - PLAYER_START_INSET);
  const bullets = createBulletField(engine);
  const speed = PLAYER_BASE_SPEED * options.speedMultiplier;
  const damage = BULLET_BASE_DAMAGE * options.powerMultiplier;

  const frames = createKeyedChannel<EntityId, Transform>();
  const roster = createChannel<EntityRecord[]>();
  const combatState = createChannel<CombatSnapshot>();
  const direction: Vector2 = { x: 0, y: 0 };

  let combat: Combat = createCombat();
  let frame: number | null = null;
  let previous = 0;
  let clock = 0;
  let wasRolling = false;

  Composite.add(engine.world, player);

  const rosterNow = (): EntityRecord[] => [
    { id: player.id, kind: 'player' },
    ...bullets.ids().map((id): EntityRecord => ({ id, kind: 'bullet' })),
  ];

  const step = (now: number): void => {
    // Held inside [0, MAX]. The ceiling covers a backgrounded tab; the floor
    // covers a clock that hands back a timestamp older than the last one —
    // rare in a browser, routine under fake timers, and a negative elapsed
    // flies the aircraft backwards rather than failing loudly.
    const elapsed = clamp((now - previous) / 1000, 0, MAX_STEP_SECONDS);

    previous = now;
    clock += elapsed;
    movePlayer(player, direction, speed * elapsed);

    const spawned = bullets.fire(elapsed, {
      allowed: canFire(combat, clock),
      x: player.position.x,
      y: player.position.y - PLAYER_MUZZLE_OFFSET,
      damage,
    });

    const despawned = bullets.advance(elapsed);
    const rolling = isRolling(combat, clock);

    Engine.update(engine, elapsed * 1000);
    frames.send(player.id, transformOf(player));

    for (const bullet of bullets.bodies()) {
      frames.send(bullet.id, transformOf(bullet));
    }

    if (spawned || despawned) {
      roster.send(rosterNow());
    }

    if (rolling !== wasRolling) {
      wasRolling = rolling;
      combatState.send({ rolling, invulnerable: isInvulnerable(combat, clock) });
    }

    frame = requestAnimationFrame(step);
  };

  return {
    playerId: player.id,

    start() {
      if (frame !== null) {
        return;
      }

      previous = performance.now();
      frame = requestAnimationFrame(step);
    },

    pause() {
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
    },

    dispose() {
      this.pause();
      frames.clear();
      roster.clear();
      combatState.clear();
      bullets.clear();
      Composite.clear(engine.world, false);
      Engine.clear(engine);
    },

    subscribe: (id, onFrame) => frames.subscribe(id, onFrame),

    subscribeRoster(onChange) {
      const stop = roster.subscribe(onChange);

      onChange(rosterNow());

      return stop;
    },

    subscribeCombat(onChange) {
      const stop = combatState.subscribe(onChange);

      onChange({ rolling: false, invulnerable: false });

      return stop;
    },

    setPlayerDirection(x, y) {
      direction.x = x;
      direction.y = y;
    },

    roll() {
      const next = startRoll(combat, clock);

      if (next !== combat) {
        combat = next;
        wasRolling = true;
        combatState.send({ rolling: true, invulnerable: true });
      }
    },
  };
}
