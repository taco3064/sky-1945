import { BOSS_STATS, bossMuzzleOffset } from '../entities';
import type { Point } from '../field';
import { shotsFor } from '../patterns';
import type { BulletSpawn } from '../patterns';
import {
  RECOVER_SECONDS,
  attackAt,
  cadenceOf,
  durationOf,
  windUpOf,
} from './attacks';
import type { BossAttack, BossStance } from './attacks';

/**
 * The fight's state machine: enter, wind up, fire, rest, repeat.
 *
 * Split out of `boss.ts` when the factory holding the bodies passed its line
 * budget. The division it fell along is a real one — this owns *what happens
 * next* and touches no body at all, while `boss.ts` owns the bodies and the
 * hit points. The one thing the machine has to reach out for is the beam, which
 * arrives as two functions rather than as a body.
 *
 * Same shape as the split between `../frame` and `../world`, one layer down.
 */

/** Down the screen, in the degrees `../patterns` speaks. */
const DOWNWARD = 90;

/** Bullet speed. Fixed, unlike a mob's — a boss cannot outrun its own fire. */
const BOSS_BULLET_SPEED = 320;

/** What the boss is made of while it is alive. */
export interface Duel {
  hp: number;
  maxHp: number;
  /** Seconds since it entered — what the patrol is a function of. */
  age: number;
  /** Distance flown on the way in, before it settles. */
  travelled: number;
  stance: BossStance;
  /** Seconds spent in the current stance. */
  since: number;
  /** Which attack of the fight this is. Feeds `attackAt`. */
  index: number;
  /** Seconds since the last volley of the current attack. */
  sinceVolley: number;
  /** Volleys thrown by the current attack, so the first is never delayed. */
  volleys: number;
  /** The round it was summoned for, so its attacks differ between rounds. */
  round: number;
  /**
   * The column a ram is committed to, locked when its wind-up ends.
   *
   * Null except during a ram. Locked at the *end* of the tell rather than tracked
   * continuously: a dive that followed the player would be unavoidable, and the
   * whole point of a one-second wind-up is that moving out of the way is the
   * answer.
   */
  aimedX: number | null;
}

/**
 * The beam, as the two things the machine can do to it.
 *
 * Not the body: this module has no business creating one, and handing it a
 * `Body | null` would make every step have to know whether one exists.
 */
export interface BeamControl {
  open: (at: Point) => void;
  close: () => void;
}

/** Everything one step of the machine needs, as one argument. */
export interface StanceStep {
  duel: Duel;
  /** Where the boss is this frame, so a volley leaves the right place. */
  at: Point;
  /** The round's power multiplier, applied to bullet damage. */
  power: number;
  /** Where the player is, which only the ram reads, and only once. */
  playerX: number;
  beam: BeamControl;
}

export interface StanceResult {
  /** The stance changed, or the beam opened or closed. React needs telling. */
  changed: boolean;
  shots: BulletSpawn[];
}

/** Nothing to report. */
const HELD: StanceResult = { changed: false, shots: [] };

/** A fresh fight, at the top of the screen with nothing charged. */
export function newDuel(round: number, hp: number): Duel {
  return {
    hp,
    maxHp: hp,
    age: 0,
    travelled: 0,
    stance: 'entering',
    since: 0,
    index: 0,
    sinceVolley: 0,
    volleys: 0,
    round,
    aimedX: null,
  };
}

/** The attack it is on. */
export function attackOf(duel: Duel): BossAttack {
  return attackAt(duel.round, duel.index);
}

/** Move to a stance, resetting everything measured within one. */
function enter(duel: Duel, stance: BossStance): void {
  duel.stance = stance;
  duel.since = 0;
  duel.sinceVolley = 0;
  duel.volleys = 0;
}

/** Whether the current attack owes a volley right now. */
function volleyDue(duel: Duel): boolean {
  // The first one is never held back. Otherwise the wind-up finishes and
  // nothing happens for a whole cadence — up to half a second on the radial
  // burst, which makes the tell look like a lie.
  return duel.volleys === 0 || duel.sinceVolley >= cadenceOf(attackOf(duel));
}

/**
 * One volley of whichever shape is firing.
 *
 * Two of the five attacks throw no bullets at all: the beam *is* its own hazard,
 * and the ram makes a projectile of the boss. Checked by listing the ones that do
 * fire rather than the ones that do not, so a sixth attack has to opt in — the
 * failure mode of the other spelling is a new attack silently firing a shape it
 * was never given.
 */
function volley(step: StanceStep): BulletSpawn[] {
  const attack = attackOf(step.duel);

  if (attack !== 'straight' && attack !== 'spread' && attack !== 'radial') {
    return [];
  }

  return shotsFor({
    kind: attack,
    x: step.at.x,
    y: step.at.y + bossMuzzleOffset(),
    speed: BOSS_BULLET_SPEED,
    damage: BOSS_STATS.damage * step.power,
    side: 'enemy',
    heading: DOWNWARD,
  });
}

/** Flying in. Ends the moment it reaches its altitude, which the caller knows. */
function stepEntering(duel: Duel, arrived: boolean): StanceResult {
  if (!arrived) {
    return HELD;
  }

  enter(duel, 'winding');

  return { changed: true, shots: [] };
}

/** The tell. Nothing leaves the boss until it is over. */
function stepWinding(step: StanceStep): StanceResult {
  if (step.duel.since < windUpOf(attackOf(step.duel))) {
    return HELD;
  }

  const opening = attackOf(step.duel);

  enter(step.duel, 'firing');

  if (opening === 'beam') {
    step.beam.open(step.at);
  }

  // The ram commits to a column here and nowhere else. Read once, at the instant
  // the tell ends, which is the last moment the player could still have moved.
  step.duel.aimedX = opening === 'ram' ? step.playerX : null;

  return { changed: true, shots: [] };
}

/**
 * Firing. The beam is one body held for the attack's whole duration; the other
 * three throw a volley every cadence.
 */
function stepFiring(step: StanceStep): StanceResult {
  if (step.duel.since >= durationOf(attackOf(step.duel))) {
    step.beam.close();
    step.duel.aimedX = null;
    enter(step.duel, 'recovering');

    return { changed: true, shots: [] };
  }

  if (!volleyDue(step.duel)) {
    return HELD;
  }

  step.duel.sinceVolley = 0;
  step.duel.volleys += 1;

  return { changed: false, shots: volley(step) };
}

/** Resting. Ends by picking up the next attack. */
function stepRecovering(duel: Duel): StanceResult {
  if (duel.since < RECOVER_SECONDS) {
    return HELD;
  }

  duel.index += 1;
  enter(duel, 'winding');

  return { changed: true, shots: [] };
}

/**
 * Advance the fight by one slice.
 *
 * `arrived` is the caller's answer, not this module's: where the boss is takes
 * the field's dimensions, and the machine deliberately knows nothing about
 * them.
 */
export function stepStance(step: StanceStep, arrived: boolean): StanceResult {
  if (step.duel.stance === 'entering') {
    return stepEntering(step.duel, arrived);
  }

  if (step.duel.stance === 'winding') {
    return stepWinding(step);
  }

  if (step.duel.stance === 'firing') {
    return stepFiring(step);
  }

  return stepRecovering(step.duel);
}
