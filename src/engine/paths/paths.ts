import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import type { Point } from '../field';

/**
 * How a craft flies — the mirror of `patterns`, which is how a bullet flies.
 *
 * Same discipline: pure arithmetic, one entry, no bodies and no physics. A path
 * turns "how far along am I" into "where am I", and knows nothing about speed —
 * the caller multiplies speed by time and hands over the distance, which is
 * what keeps a path independent of the round's difficulty.
 *
 * Every path must eventually leave the field. A craft that parks forever is not
 * a hard enemy, it is a stuck one, and the round can never end.
 */

/** Where a craft enters from. */
export type PathKind = 'dive' | 'weave' | 'arc' | 'hover' | 'sweep' | 'feint';

export interface PathState {
  /** Where the craft entered the field. */
  entry: Point;
  /** How far it has travelled along its path, in world units. */
  travelled: number;
  /** Seconds since it entered — what an oscillation is a function of. */
  age: number;
}

/** How far outside the field a craft starts, so it flies in rather than appears. */
const ENTRY_MARGIN = 40;

/** Weave: how far it swings, and how often. */
const WEAVE_REACH = 70;
const WEAVE_RATE = 0.35;

/** Arc: how far out it bows, and over what distance the bow completes. */
const ARC_REACH = 190;
const ARC_SPAN = 700;

/** Hover: how deep it comes before holding, and how much travel it holds for. */
const HOVER_DEPTH = 260;
const HOVER_SPAN = 340;

/** Feint: how deep the fake goes, and how far into the run it resolves. */
const FEINT_DEPTH = 300;
const FEINT_SPAN = 520;

/** Straight down from where it entered. */
function dive({ entry, travelled }: PathState): Point {
  return { x: entry.x, y: entry.y + travelled };
}

/**
 * Down, oscillating around the entry column.
 *
 * A function of age rather than of distance, so the swing has the same rhythm
 * however fast the round has made the craft — and because it is absolute rather
 * than accumulated, it can never drift off its column.
 */
function weave({ entry, travelled, age }: PathState): Point {
  return {
    x: entry.x + Math.sin(age * WEAVE_RATE * Math.PI * 2) * WEAVE_REACH,
    y: entry.y + travelled,
  };
}

/**
 * Enters from a top corner and bows toward the middle before straightening.
 *
 * The bow is half a sine, so it leans out and comes back rather than curling
 * round — a craft that turned all the way would end up flying back up.
 */
function arc({ entry, travelled }: PathState): Point {
  const inward = entry.x < FIELD_WIDTH / 2 ? 1 : -1;
  const progress = Math.min(travelled / ARC_SPAN, 1);

  return {
    x: entry.x + Math.sin(progress * Math.PI) * ARC_REACH * inward,
    y: entry.y + travelled,
  };
}

/**
 * Descends, holds its altitude for a while, then carries on down.
 *
 * The hold is expressed in *distance* rather than seconds, so a faster craft
 * holds for less time — which is the right way round: a harder round should not
 * hand the player a longer stationary target.
 */
function hover({ entry, travelled }: PathState): Point {
  if (travelled < HOVER_DEPTH) {
    return { x: entry.x, y: entry.y + travelled };
  }

  if (travelled < HOVER_DEPTH + HOVER_SPAN) {
    return { x: entry.x, y: entry.y + HOVER_DEPTH };
  }

  return { x: entry.x, y: entry.y + travelled - HOVER_SPAN };
}

/** Enters from a side edge and crosses, drifting down as it goes. */
function sweep({ entry, travelled }: PathState): Point {
  const across = entry.x < FIELD_WIDTH / 2 ? 1 : -1;

  return {
    x: entry.x + travelled * across,
    y: entry.y + travelled * 0.25,
  };
}

/**
 * Dives, pulls back up, then commits.
 *
 * The pull-up is deliberately incomplete — it recovers about half of what it
 * gave up, so the craft is always net closer than it was. A feint that returned
 * to its entry would leave the field through the top and never threaten
 * anything.
 */
function feint({ entry, travelled }: PathState): Point {
  if (travelled >= FEINT_SPAN) {
    return { x: entry.x, y: entry.y + travelled - FEINT_SPAN / 2 };
  }

  const progress = travelled / FEINT_SPAN;
  const dip = Math.sin(progress * Math.PI) * FEINT_DEPTH;

  return { x: entry.x, y: entry.y + travelled / 2 + dip };
}

const PATHS: Record<PathKind, (state: PathState) => Point> = {
  dive,
  weave,
  arc,
  hover,
  sweep,
  feint,
};

/** Where a craft on this path is now. The only entry. */
export function positionOn(path: PathKind, state: PathState): Point {
  return PATHS[path](state);
}

/**
 * Where a path starts, given a lane.
 *
 * The lane is 0–1 and the path decides what it means, so the director never has
 * to know the coordinate system — or which paths come in from a side at all.
 */
export function entryFor(path: PathKind, lane: number): Point {
  if (path === 'sweep') {
    return {
      x: lane < 0.5 ? -ENTRY_MARGIN : FIELD_WIDTH + ENTRY_MARGIN,
      // The upper half only: a sweep across the bottom would cross the player's
      // own column at the one altitude they cannot leave.
      y: FIELD_HEIGHT * (0.12 + lane * 0.3),
    };
  }

  if (path === 'arc') {
    return {
      x: lane < 0.5 ? ENTRY_MARGIN * 2 : FIELD_WIDTH - ENTRY_MARGIN * 2,
      y: -ENTRY_MARGIN,
    };
  }

  return { x: lane * FIELD_WIDTH, y: -ENTRY_MARGIN };
}

/**
 * Which paths a round may use.
 *
 * Early rounds stay legible: the first is nothing but straight lines and
 * swings, and the awkward ones arrive once the player knows what normal looks
 * like. Difficulty is as much about what a player has already seen as about
 * numbers.
 */
function poolFor(round: number): PathKind[] {
  if (round <= 1) {
    return ['dive', 'weave'];
  }

  if (round <= 3) {
    return ['dive', 'weave', 'arc'];
  }

  return ['dive', 'weave', 'arc', 'hover', 'sweep', 'feint'];
}

/**
 * The path a wave flies, derived rather than drawn.
 *
 * Deterministic on purpose. `Math.random` would cost two things and buy
 * nothing: the engine's tests could no longer assert a position, and — the real
 * reason — a player could not learn the level. A 1945-style shooter is
 * authored, and clearing round four on the third attempt happens *because they
 * remember what comes next*. Randomness turns learning into gambling.
 *
 * One path per wave rather than per craft, so a wave reads as one intent: this
 * one dives, that one sweeps in from the left.
 */
export function pathFor(round: number, wave: number): PathKind {
  const pool = poolFor(round);

  return pool[(round * 3 + wave) % pool.length];
}
