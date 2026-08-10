import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import type { Point } from '../field';

/**
 * How a craft flies — the mirror of `patterns`, which is how a bullet flies.
 *
 * Same discipline: pure arithmetic, one entry, no bodies and no physics. A path
 * turns "how far along am I" into "where am I", and knows nothing about speed —
 * the caller multiplies speed by time and hands over the distance, which is what
 * keeps a path independent of the round's difficulty.
 *
 * **Two independent questions, deliberately kept apart**: which edge a craft
 * comes in from, and what shape it flies once it is in. They used to be one — a
 * path owned its own entry point, so five of the six came from the top and the
 * sixth was the only way in from a side. Every shape now works from every edge,
 * which is fifteen behaviours out of five definitions, and the old `sweep` turned
 * out to be nothing more than "enter from a side and fly straight".
 *
 * A path describes itself in `along` (down its heading) and `across`
 * (perpendicular to it), and `place` rotates that into the field. Nothing here
 * mentions x or y except the three functions that have to.
 *
 * Every path must eventually leave the field. A craft that parks forever is not
 * a hard enemy, it is a stuck one, and the round can never end.
 */

/** Which edge a craft comes in from. */
export type Edge = 'top' | 'left' | 'right';

/** The shape it flies once it is in. */
export type PathKind = 'dive' | 'weave' | 'arc' | 'hover' | 'feint';

/** Every edge and every shape, for callers that have to cover them all. */
export const ALL_EDGES: Edge[] = ['top', 'left', 'right'];
export const ALL_PATHS: PathKind[] = ['dive', 'weave', 'arc', 'hover', 'feint'];

export interface PathState {
  /** Which edge it came in from, which sets the direction of travel. */
  edge: Edge;
  /** Where the craft entered the field. */
  entry: Point;
  /** How far it has travelled along its path, in world units. */
  travelled: number;
  /** Seconds since it entered — what an oscillation is a function of. */
  age: number;
}

/** A position in the path's own terms, before it is rotated into the field. */
interface Offset {
  /** Distance along the heading. */
  along: number;
  /** Distance perpendicular to it. */
  across: number;
}

/** The unit vector a craft advances along, per edge. */
const HEADINGS: Record<Edge, Point> = {
  top: { x: 0, y: 1 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
};

/** How far outside the field a craft starts, so it flies in rather than appears. */
const ENTRY_MARGIN = 40;

/** Clearance for the widest silhouette, so a craft is never half off an edge. */
const EDGE_KEEP = 36;

/** Weave: how far it swings, and how often. */
const WEAVE_REACH = 70;
const WEAVE_RATE = 0.35;

/** Arc: how far out it bows, and over what distance the bow completes. */
const ARC_REACH = 190;
const ARC_SPAN = 700;

/** Hover: how far in it comes before holding, and how much travel it holds for. */
const HOVER_DEPTH = 260;
const HOVER_SPAN = 340;

/** Feint: how deep the fake goes, and how far into the run it resolves. */
const FEINT_DEPTH = 300;
const FEINT_SPAN = 520;

/**
 * Rotate a path's own (along, across) into the field's (x, y).
 *
 * The whole reason a shape does not care which edge it came from: `across` is the
 * heading turned a quarter turn, so a weave that swings left and right when it
 * enters from the top swings up and down when it enters from a side, with no
 * second definition of weaving.
 */
function place(state: PathState, offset: Offset): Point {
  const heading = HEADINGS[state.edge];

  return {
    x: state.entry.x + heading.x * offset.along - heading.y * offset.across,
    y: state.entry.y + heading.y * offset.along + heading.x * offset.across,
  };
}

/**
 * Which way "toward the middle of the field" is, in this path's own terms.
 *
 * Either +1 or -1 on the `across` axis, so `arc` can bow inward from any edge
 * without knowing which one it is on — and therefore without ever bowing out of
 * the field.
 */
function inward(state: PathState): number {
  const heading = HEADINGS[state.edge];

  const toCentre = {
    x: FIELD_WIDTH / 2 - state.entry.x,
    y: FIELD_HEIGHT / 2 - state.entry.y,
  };

  const across = heading.x * toCentre.y - heading.y * toCentre.x;

  return Math.sign(across) || 1;
}

/** Straight along the heading. */
function dive(state: PathState): Offset {
  return { along: state.travelled, across: 0 };
}

/**
 * Along the heading, oscillating around the line it entered on.
 *
 * A function of age rather than of distance, so the swing has the same rhythm
 * however fast the round has made the craft — and because it is absolute rather
 * than accumulated, it can never drift off that line.
 */
function weave(state: PathState): Offset {
  return {
    along: state.travelled,
    across: Math.sin(state.age * WEAVE_RATE * Math.PI * 2) * WEAVE_REACH,
  };
}

/**
 * Bows toward the middle of the field, then straightens.
 *
 * The bow is half a sine, so it leans out and comes back rather than curling
 * round — a craft that turned all the way would end up flying back the way it
 * came. Always inward, so it cannot bow off an edge from any entry.
 */
function arc(state: PathState): Offset {
  const progress = Math.min(state.travelled / ARC_SPAN, 1);

  return {
    along: state.travelled,
    across: Math.sin(progress * Math.PI) * ARC_REACH * inward(state),
  };
}

/**
 * Advances, holds position for a while, then carries on.
 *
 * The hold is expressed in *distance* rather than seconds, so a faster craft
 * holds for less time — which is the right way round: a harder round should not
 * hand the player a longer stationary target.
 */
function hover(state: PathState): Offset {
  if (state.travelled < HOVER_DEPTH) {
    return { along: state.travelled, across: 0 };
  }

  if (state.travelled < HOVER_DEPTH + HOVER_SPAN) {
    return { along: HOVER_DEPTH, across: 0 };
  }

  return { along: state.travelled - HOVER_SPAN, across: 0 };
}

/**
 * Presses in, pulls back, then commits.
 *
 * The pull-back is deliberately incomplete — it recovers about half of what it
 * gave up, so the craft is always net further in than it was. A feint that
 * returned to its entry would leave the field the way it came in and never
 * threaten anything.
 */
function feint(state: PathState): Offset {
  if (state.travelled >= FEINT_SPAN) {
    return { along: state.travelled - FEINT_SPAN / 2, across: 0 };
  }

  const progress = state.travelled / FEINT_SPAN;

  return {
    along: state.travelled / 2 + Math.sin(progress * Math.PI) * FEINT_DEPTH,
    across: 0,
  };
}

const PATHS: Record<PathKind, (state: PathState) => Offset> = {
  dive,
  weave,
  arc,
  hover,
  feint,
};

/** Where a craft on this path is now. The only entry. */
export function positionOn(path: PathKind, state: PathState): Point {
  return place(state, PATHS[path](state));
}

/**
 * How far a shape swings sideways from the line it entered on.
 *
 * What makes a lane safe. `weave` reaches WEAVE_REACH either side, so a craft
 * given the outermost lane of a crowded wave used to swing straight off the field
 * and be culled — the bug a doubled enemy count exposed, because at four per wave
 * no lane was ever near an edge in the first place.
 *
 * `arc` is zero despite reaching further than anything, because it only ever bows
 * inward.
 */
function reachOf(path: PathKind): number {
  return path === 'weave' ? WEAVE_REACH : 0;
}

/**
 * Where a squad enters, given its edge, its shape and a lane.
 *
 * The lane is 0–1 and this decides what it means, so the director never learns
 * the coordinate system, which edges exist, or how much room a shape needs in
 * order to fly itself without leaving.
 */
export function entryFor(edge: Edge, path: PathKind, lane: number): Point {
  const inset = reachOf(path) + EDGE_KEEP;

  if (edge === 'top') {
    // The lane spans what is left after both margins, so lane 0 and lane 1 are
    // the outermost columns this shape can actually hold.
    return { x: inset + lane * (FIELD_WIDTH - inset * 2), y: -ENTRY_MARGIN };
  }

  return {
    x: edge === 'left' ? -ENTRY_MARGIN : FIELD_WIDTH + ENTRY_MARGIN,
    // The upper half only. A craft crossing along the bottom would sit in the
    // player's own row, at the one altitude they cannot leave.
    y: FIELD_HEIGHT * (0.12 + lane * 0.3),
  };
}

/**
 * Which shapes a round may use.
 *
 * Early rounds stay legible: the first is nothing but straight lines and swings,
 * and the awkward ones arrive once the player knows what normal looks like.
 * Difficulty is as much about what a player has already seen as about numbers.
 */
function poolFor(round: number): PathKind[] {
  if (round <= 1) {
    return ['dive', 'weave'];
  }

  if (round <= 3) {
    return ['dive', 'weave', 'arc'];
  }

  return ALL_PATHS;
}

/**
 * The shape a squad flies, derived rather than drawn.
 *
 * Deterministic on purpose. `Math.random` would cost two things and buy nothing:
 * the engine's tests could no longer assert a position, and — the real reason — a
 * player could not learn the level. A 1945-style shooter is authored, and
 * clearing round four on the third attempt happens *because they remember what
 * comes next*. Randomness turns learning into gambling.
 *
 * One shape per squad rather than per craft, so a squad reads as one intent: this
 * group dives, that one weaves in from the left.
 */
export function pathFor(round: number, slot: number): PathKind {
  const pool = poolFor(round);

  return pool[(round * 3 + slot) % pool.length];
}

/**
 * Which edge a squad comes in from.
 *
 * The first two rounds are top-only, because a player has to learn where the
 * threat normally comes from before an exception can mean anything. After that
 * every third squad comes in from a side, alternating left and right.
 *
 * One in three rather than one in two: this is a vertical shooter, and the top is
 * meant to be where the pressure lives. A side entry is punctuation.
 */
export function edgeFor(round: number, slot: number): Edge {
  if (round <= 2 || slot % 3 !== 2) {
    return 'top';
  }

  return slot % 6 === 2 ? 'left' : 'right';
}
