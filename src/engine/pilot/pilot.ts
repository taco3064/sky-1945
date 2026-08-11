import { Body, Composite } from 'matter-js';
import type { Engine } from 'matter-js';

import {
  RESPAWN_INVULNERABILITY,
  canFire,
  createCombat,
  grantInvulnerability,
  isInvulnerable,
  isReady,
  isRolling,
  startRoll,
} from '../combat';
import type { Combat } from '../combat';
import {
  BULLET_BASE_DAMAGE,
  BULLET_SPEED,
  PLAYER_BASE_SPEED,
  PLAYER_BOUNDS_INSET,
  PLAYER_ENTRY_INSET,
  PLAYER_ENTRY_SPEED,
  PLAYER_FIRE_INTERVAL,
  PLAYER_MUZZLE_OFFSET,
  PLAYER_START_INSET,
  PLAYER_WING_SPAN,
  createPlayer,
} from '../entities';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import { shotsFor } from '../patterns';
import type { BulletSpawn } from '../patterns';
import type { Pilot, PilotOptions } from './types';

/** Up the screen, in the degrees `patterns` speaks. */
const UPWARD = -90;

/** Where the aircraft holds station once it has flown in. */
const STATION_Y = FIELD_HEIGHT - PLAYER_START_INSET;

/** Where it comes in from, below the bottom edge. */
const ENTRY_Y = FIELD_HEIGHT - PLAYER_ENTRY_INSET;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createPilot(engine: Engine, options: PilotOptions): Pilot {
  const body = createPlayer(FIELD_WIDTH / 2, ENTRY_Y);
  const speed = PLAYER_BASE_SPEED * options.speedMultiplier;
  const damage = BULLET_BASE_DAMAGE * options.powerMultiplier;
  const direction = { x: 0, y: 0 };

  // `arriving` is a flag, not a position test: the player can fly below the station.
  const state = { clock: 0, sinceShot: 0, arriving: false };

  let combat: Combat = createCombat();

  Composite.add(engine.world, body);

  /** Fly in from below, and take the controls on arrival. Input is ignored throughout. */
  const arrive = (elapsed: number): void => {
    const next = body.position.y - PLAYER_ENTRY_SPEED * elapsed;

    if (next <= STATION_Y) {
      state.arriving = false;
      Body.setPosition(body, { x: FIELD_WIDTH / 2, y: STATION_Y });

      return;
    }

    Body.setPosition(body, { x: FIELD_WIDTH / 2, y: next });
  };

  /** Sent in from below, protected, with no heading of its own yet. */
  const launch = (): void => {
    Body.setPosition(body, { x: FIELD_WIDTH / 2, y: ENTRY_Y });

    state.arriving = true;
    direction.x = 0;
    direction.y = 0;

    // From a clean combat state: a fresh aircraft never rolled.
    combat = grantInvulnerability(createCombat(), state.clock, RESPAWN_INVULNERABILITY);
  };

  const isArriving = (): boolean => state.arriving;

  launch();

  /** Driven straight from input, not through forces — inertia reads as input lag. */
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

  /** The cadence keeps running while the guns are silent, capped at one interval. */
  const fire = (elapsed: number): BulletSpawn[] => {
    if (!canFire(combat, state.clock)) {
      state.sinceShot = Math.min(state.sinceShot + elapsed, PLAYER_FIRE_INTERVAL);

      return [];
    }

    state.sinceShot += elapsed;

    const shots: BulletSpawn[] = [];

    while (state.sinceShot >= PLAYER_FIRE_INTERVAL) {
      state.sinceShot -= PLAYER_FIRE_INTERVAL;

      // One cannon per wing, firing parallel — two `straight` volleys, not a fan.
      for (const wing of [-PLAYER_WING_SPAN, PLAYER_WING_SPAN]) {
        shots.push(...shotsFor({
          kind: 'straight',
          x: body.position.x + wing,
          y: body.position.y - PLAYER_MUZZLE_OFFSET,
          speed: BULLET_SPEED,
          damage,
          side: 'player',
          heading: UPWARD,
        }));
      }
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
      state.clock += elapsed;

      // Flying in: the entrance owns the position, and the guns are already running.
      if (state.arriving) {
        arrive(elapsed);

        return fire(elapsed);
      }

      move(speed * elapsed);

      return fire(elapsed);
    },

    roll() {
      const next = startRoll(combat, state.clock);

      if (next === combat) {
        return false;
      }

      combat = next;

      return true;
    },

    snapshot: () => ({
      rolling: isRolling(combat, state.clock),
      invulnerable: isInvulnerable(combat, state.clock),
      ready: isReady(combat, state.clock),
    }),

    isVulnerable: () => !isInvulnerable(combat, state.clock),

    isArriving,

    kill() {
      const wreck = { x: body.position.x, y: body.position.y };

      launch();

      return wreck;
    },
  };
}
