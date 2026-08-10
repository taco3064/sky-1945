/**
 * What the boss does, and when — as pure arithmetic.
 *
 * No bodies and no clock of its own: the caller owns time and asks what should
 * be happening at a given point in an attack. Same discipline as `../patterns`
 * (how a bullet flies) and `../paths` (how a craft flies); this is *when a gun
 * speaks*, which the trash mobs did not need because a metronome was enough for
 * them.
 */

import type { PatternKind } from '../patterns';

/** The boss's four moves: the three the trash mobs use, plus its own. */
export type BossAttack = PatternKind | 'beam';

/**
 * What the boss is doing right now.
 *
 * `winding` is not decoration. Every attack is announced before it lands, and
 * the beam's announcement is the reason the roll exists — 1.2s of
 * invulnerability with the guns silent is precisely the trade a beam should
 * force. An attack that simply appears is not a fight, it is a coin flip.
 */
export type BossStance = 'entering' | 'winding' | 'firing' | 'recovering';

/** How long the boss rests between attacks, whichever attack it was. */
export const RECOVER_SECONDS = 0.7;

interface AttackShape {
  /** Seconds of tell before anything leaves the boss. */
  windUp: number;
  /** Seconds the attack lasts once it starts. */
  duration: number;
  /** Seconds between volleys while it fires. The beam ignores this. */
  cadence: number;
}

/**
 * The four attacks, timed so each one asks a different question.
 *
 * The three shapes are the same arithmetic the trash mobs fire, and their
 * *timing* is what makes them a boss's version of it: a mob fires a spread and
 * moves on, the boss holds the spread open for two beats. `straight` is the
 * cheapest to dodge, so it is the one that comes in a burst.
 *
 * The beam's wind-up is nearly three times the longest of the others, and that
 * is the number that makes the fight fair rather than the one that makes it
 * easy: it has to be long enough to see, recognise, and answer with a roll.
 */
const SHAPES: Record<BossAttack, AttackShape> = {
  straight: { windUp: 0.45, duration: 1.2, cadence: 0.14 },
  spread: { windUp: 0.6, duration: 1, cadence: 0.5 },
  radial: { windUp: 0.7, duration: 0.9, cadence: 0.45 },
  beam: { windUp: 1.4, duration: 1.1, cadence: 0 },
};

/** Every attack the boss has, in one place so a test can sweep them. */
export const ALL_ATTACKS: BossAttack[] = ['straight', 'spread', 'radial', 'beam'];

/** Seconds of tell this attack opens with. */
export function windUpOf(attack: BossAttack): number {
  return SHAPES[attack].windUp;
}

/** Seconds this attack runs once the tell is over. */
export function durationOf(attack: BossAttack): number {
  return SHAPES[attack].duration;
}

/** Seconds between volleys while it fires. */
export function cadenceOf(attack: BossAttack): number {
  return SHAPES[attack].cadence;
}

/** One full attack, tell through to rest. */
export function cycleOf(attack: BossAttack): number {
  return windUpOf(attack) + durationOf(attack) + RECOVER_SECONDS;
}

/** Every attack the boss cycles through freely. The beam is scheduled. */
const SHAPED: PatternKind[] = ['straight', 'spread', 'radial'];

/** How often the beam comes: every fourth attack. */
const BEAM_EVERY = 4;

/**
 * A 32-bit integer hash of the round and the attack's index.
 *
 * `Math.imul` rather than plain multiplication so every step stays inside 32
 * bits — the products here run past 2^53, where `*` silently starts rounding
 * and the "same input, same answer" promise below quietly stops being true.
 * Integer-only also means no reliance on a platform's `Math.sin`, which is free
 * to differ in its last bit between engines.
 */
function mix(round: number, index: number): number {
  const seeded = Math.imul(round, 374761393) + Math.imul(index, 668265263);
  const stirred = Math.imul(seeded ^ (seeded >>> 13), 1274126177);

  return (stirred ^ (stirred >>> 16)) >>> 0;
}

/**
 * Which attack comes next — derived, not drawn from a die.
 *
 * The opposite intent to `../paths`, reached through the same means. A wave's
 * path is a short repeating sum *because* a player should be able to learn what
 * round four opens with. A boss's attack is a hash *because* the player should
 * have to read the tell instead of counting beats — memorising "spread, radial,
 * straight" would let them start dodging before the boss moves, and then the
 * wind-up animations are decoration rather than information.
 *
 * Still not `Math.random`, and for the same two reasons as everywhere else in
 * this engine: a test cannot assert on a die, and a run that cannot be
 * reproduced cannot be debugged when a player reports something impossible.
 *
 * The beam is the exception — every fourth attack, and predictably so. That
 * looks like the thing this function exists to avoid, and is the opposite: the
 * beam demands a specific answer at a specific moment, so knowing roughly when
 * it is due is what lets a player save the roll for it. Predictability is the
 * gift here, and the tell is what confirms it.
 */
export function attackAt(round: number, index: number): BossAttack {
  if ((index + 1) % BEAM_EVERY === 0) {
    return 'beam';
  }

  return SHAPED[mix(round, index) % SHAPED.length];
}
