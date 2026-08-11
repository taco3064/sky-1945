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
import type { Combat, CombatSnapshot } from '../combat';
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

/** Where the aircraft holds station once it has flown in. */
const STATION_Y = FIELD_HEIGHT - PLAYER_START_INSET;

/** Where it comes in from, below the bottom edge. */
const ENTRY_Y = FIELD_HEIGHT - PLAYER_ENTRY_INSET;

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
   * Returns where the wreck was, sends a fresh aircraft in from below the bottom
   * edge — a new craft arriving, not a corpse teleported back to its post — and
   * grants protection immediately. The protection belongs to dying rather than to
   * whoever is watching, because a frame resolves in several collision passes:
   * without it, one death repeats on the very next pass.
   */
  kill: () => { x: number; y: number };
  /** True while it is still flying in and input is not its own yet. */
  isArriving: () => boolean;
}

export function createPilot(engine: Engine, options: PilotOptions): Pilot {
  const body = createPlayer(FIELD_WIDTH / 2, ENTRY_Y);
  const speed = PLAYER_BASE_SPEED * options.speedMultiplier;
  const damage = BULLET_BASE_DAMAGE * options.powerMultiplier;
  const direction = { x: 0, y: 0 };

  /**
   * Everything about this aircraft that changes, in one place.
   *
   * Collected when the entrance pushed the factory past its statement budget, and
   * it reads better for it — four loose `let`s at the top of a closure say less
   * about what belongs together than one object does. `combat` stays separate
   * because it is replaced wholesale rather than mutated.
   *
   * `arriving` is a flag rather than a position test, and that distinction is
   * load-bearing: "is it below its station" looks equivalent and is not, because
   * the player can fly below the station under their own power. Read that way, the
   * entrance takes the controls back mid-flight and drags the aircraft to the
   * centre of the screen.
   */
  const state = { clock: 0, sinceShot: 0, arriving: false };

  let combat: Combat = createCombat();

  Composite.add(engine.world, body);

  /**
   * Fly in from below, and take the controls on arrival.
   *
   * The first spawn does this as well as every respawn — the aircraft arrives the
   * same way whether or not it is replacing one, because "where did that come
   * from" should have one answer.
   *
   * Input is ignored throughout. It is a fixed cue rather than a stretch of
   * gameplay, and a player steering during it would arrive somewhere they did not
   * choose while still protected.
   */
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

    /*
     * From a clean combat state, not the dead craft's.
     *
     * A fresh aircraft should not inherit the last one's roll recovery — it never
     * rolled. Safe to discard rather than merge, because a roll makes the player
     * invulnerable, so a craft that died was by definition neither rolling nor
     * protected when it happened.
     */
    combat = grantInvulnerability(createCombat(), state.clock, RESPAWN_INVULNERABILITY);
  };

  const isArriving = (): boolean => state.arriving;

  launch();

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
    if (!canFire(combat, state.clock)) {
      state.sinceShot = Math.min(state.sinceShot + elapsed, PLAYER_FIRE_INTERVAL);

      return [];
    }

    state.sinceShot += elapsed;

    const shots: BulletSpawn[] = [];

    while (state.sinceShot >= PLAYER_FIRE_INTERVAL) {
      state.sinceShot -= PLAYER_FIRE_INTERVAL;

      // One cannon per wing, firing parallel. Two `straight` volleys rather than
      // a `spread`: a fan would make the aircraft's own width decide whether a
      // shot lands, and that is not a decision the player gets to make.
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

      // Flying in: the entrance owns the position, and the guns are already
      // running — arriving under fire of your own is the point of arriving.
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
