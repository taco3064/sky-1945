import { Body, Composite, Engine } from 'matter-js';

import {
  PLAYER_BASE_SPEED,
  PLAYER_BOUNDS_INSET,
  PLAYER_START_INSET,
  createPlayer,
} from '../entities';

/**
 * The simulation, and the only animation loop in the repo — the blueprint's
 * `engine` layer owns `requestAnimationFrame`, so a second one cannot be
 * opened anywhere else without lint saying so.
 *
 * Matter runs in sensor mode: gravity off, bodies flagged `isSensor`. What it
 * provides is broad-phase collision and motion integration, not rigid-body
 * dynamics — nothing in a bullet-hell game bounces off anything.
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

export interface WorldOptions {
  /** The loadout's speed multiplier, 1–3. */
  speedMultiplier: number;
}

export interface World {
  /** The player body's id, for subscribing to it. */
  readonly playerId: EntityId;
  /** Begin stepping. Calling it twice does not open a second loop. */
  start: () => void;
  /** Stop the loop and release everything. Safe to call more than once. */
  dispose: () => void;
  /** Watch an entity's transform. Returns its own unsubscribe. */
  subscribe: (id: EntityId, onFrame: FrameListener) => () => void;
  /** Point the player. Any vector; length is normalised away. */
  setPlayerDirection: (x: number, y: number) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Drives the player straight from input rather than through forces.
 *
 * Inertia on a dodge reads as input lag, and in a game where contact is fatal
 * the player has to be able to stop on the frame they let go. Enemies and
 * bullets keep their velocities — they are not being steered.
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

function publish(listeners: Map<EntityId, Set<FrameListener>>, body: Body): void {
  const watching = listeners.get(body.id);

  if (!watching) {
    return;
  }

  const transform: Transform = {
    x: body.position.x,
    y: body.position.y,
    angle: (body.angle * 180) / Math.PI,
  };

  for (const onFrame of watching) {
    onFrame(transform);
  }
}

export function createWorld({ speedMultiplier }: WorldOptions): World {
  const engine = Engine.create({ gravity: { x: 0, y: 0 } });
  const player = createPlayer(WORLD_WIDTH / 2, WORLD_HEIGHT - PLAYER_START_INSET);
  const speed = PLAYER_BASE_SPEED * speedMultiplier;
  const listeners = new Map<EntityId, Set<FrameListener>>();
  const direction: Vector2 = { x: 0, y: 0 };

  let frame: number | null = null;
  let previous = 0;

  Composite.add(engine.world, player);

  const step = (now: number): void => {
    // Held inside [0, MAX]. The ceiling covers a backgrounded tab; the floor
    // covers a clock that hands back a timestamp older than the last one —
    // rare in a browser, routine under fake timers, and a negative elapsed
    // flies the aircraft backwards rather than failing loudly.
    const elapsed = clamp((now - previous) / 1000, 0, MAX_STEP_SECONDS);

    previous = now;
    movePlayer(player, direction, speed * elapsed);
    Engine.update(engine, elapsed * 1000);
    publish(listeners, player);

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

    dispose() {
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }

      listeners.clear();
      Composite.clear(engine.world, false);
      Engine.clear(engine);
    },

    subscribe(id, onFrame) {
      const watching = listeners.get(id) ?? new Set<FrameListener>();

      watching.add(onFrame);
      listeners.set(id, watching);

      return () => {
        watching.delete(onFrame);
      };
    },

    setPlayerDirection(x, y) {
      direction.x = x;
      direction.y = y;
    },
  };
}
