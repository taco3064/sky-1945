import { Body, Composite } from 'matter-js';
import type { Engine } from 'matter-js';

import {
  RESPAWN_INVULNERABILITY,
  canFire,
  createCombat,
  grantInvulnerability,
  isInvulnerable,
  isRolling,
  startRoll,
} from '../combat';
import type { Combat, CombatSnapshot } from '../combat';
import {
  BULLET_BASE_DAMAGE,
  BULLET_SPEED,
  PLAYER_BASE_SPEED,
  PLAYER_BOUNDS_INSET,
  PLAYER_FIRE_INTERVAL,
  PLAYER_MUZZLE_OFFSET,
  PLAYER_START_INSET,
  createPlayer,
} from '../entities';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import { shotsFor } from '../patterns';
import type { BulletSpawn } from '../patterns';

/**
 * The player's aircraft: where it is, where it is pointed, whether it is
 * rolling, and what it fires.
 *
 * Extracted from `world` when enemies arrived and pushed that module past the
 * SRP gate for the second time. `world` was doing four things; this is the one
 * that had the clearest edge — everything about the aircraft the player
 * controls, and nothing about anyone else's.
 *
 * It keeps its own clock, so nothing outside has to pass a timestamp in to ask
 * whether a roll is still running.
 */

/** Up the screen, in the degrees `patterns` speaks. */
const UPWARD = -90;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface PilotOptions {
  /** The loadout's speed multiplier, 1–3. */
  speedMultiplier: number;
  /** The loadout's power multiplier, 1–3. */
  powerMultiplier: number;
}

export interface Pilot {
  readonly id: number;
  readonly body: Body;
  /** Point it. Any vector; length is normalised away. */
  point: (x: number, y: number) => void;
  /** Move, advance the cadence, and hand back whatever fired this frame. */
  advance: (elapsed: number) => BulletSpawn[];
  /** Attempt a roll. True if one started. */
  roll: () => boolean;
  /** Rolling and invulnerable, right now. */
  snapshot: () => CombatSnapshot;
  /** Whether a contact right now would be fatal. */
  isVulnerable: () => boolean;
  /**
   * Killed by contact.
   *
   * Returns where the wreck was, puts the aircraft back at its start with no
   * heading — a fresh craft, not a corpse — and grants respawn protection
   * immediately. The protection belongs to dying rather than to whoever is
   * watching, because a frame resolves in several collision passes: without it,
   * one death repeats on the very next pass.
   */
  kill: () => { x: number; y: number };
}

export function createPilot(engine: Engine, options: PilotOptions): Pilot {
  const body = createPlayer(FIELD_WIDTH / 2, FIELD_HEIGHT - PLAYER_START_INSET);
  const speed = PLAYER_BASE_SPEED * options.speedMultiplier;
  const damage = BULLET_BASE_DAMAGE * options.powerMultiplier;
  const direction = { x: 0, y: 0 };

  let combat: Combat = createCombat();
  let clock = 0;
  let sinceShot = 0;

  Composite.add(engine.world, body);

  /**
   * Driven straight from input rather than through forces. Inertia on a dodge
   * reads as input lag, and in a game where contact is fatal the player has to
   * be able to stop on the frame they let go.
   */
  const move = (distance: number): void => {
    const length = Math.hypot(direction.x, direction.y);

    if (length === 0) {
      return;
    }

    const x = body.position.x + (direction.x / length) * distance;
    const y = body.position.y + (direction.y / length) * distance;

    Body.setPosition(body, {
      x: clamp(x, PLAYER_BOUNDS_INSET, FIELD_WIDTH - PLAYER_BOUNDS_INSET),
      y: clamp(y, PLAYER_BOUNDS_INSET, FIELD_HEIGHT - PLAYER_BOUNDS_INSET),
    });
  };

  /**
   * The cadence keeps running while the guns are silent, capped at one
   * interval — so the first shot after a roll is immediate rather than delayed
   * by the roll's length, and a long roll cannot bank up a burst either.
   */
  const fire = (elapsed: number): BulletSpawn[] => {
    if (!canFire(combat, clock)) {
      sinceShot = Math.min(sinceShot + elapsed, PLAYER_FIRE_INTERVAL);

      return [];
    }

    sinceShot += elapsed;

    const shots: BulletSpawn[] = [];

    while (sinceShot >= PLAYER_FIRE_INTERVAL) {
      sinceShot -= PLAYER_FIRE_INTERVAL;

      shots.push(...shotsFor({
        kind: 'straight',
        x: body.position.x,
        y: body.position.y - PLAYER_MUZZLE_OFFSET,
        speed: BULLET_SPEED,
        damage,
        side: 'player',
        heading: UPWARD,
      }));
    }

    return shots;
  };

  return {
    id: body.id,
    body,

    point(x, y) {
      direction.x = x;
      direction.y = y;
    },

    advance(elapsed) {
      clock += elapsed;
      move(speed * elapsed);

      return fire(elapsed);
    },

    roll() {
      const next = startRoll(combat, clock);

      if (next === combat) {
        return false;
      }

      combat = next;

      return true;
    },

    snapshot: () => ({
      rolling: isRolling(combat, clock),
      invulnerable: isInvulnerable(combat, clock),
    }),

    isVulnerable: () => !isInvulnerable(combat, clock),

    kill() {
      const wreck = { x: body.position.x, y: body.position.y };

      Body.setPosition(body, {
        x: FIELD_WIDTH / 2,
        y: FIELD_HEIGHT - PLAYER_START_INSET,
      });

      direction.x = 0;
      direction.y = 0;
      combat = grantInvulnerability(combat, clock, RESPAWN_INVULNERABILITY);

      return wreck;
    },
  };
}
