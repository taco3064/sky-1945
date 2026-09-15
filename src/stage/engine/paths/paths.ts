import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import type { Point } from '../field';
import type { Edge, Offset, PathKind, PathState } from './types';

/** Every edge and every shape, for callers that have to cover them all. */
export const ALL_EDGES: Edge[] = ['top', 'left', 'right'];
export const ALL_PATHS: PathKind[] = ['dive', 'weave', 'arc', 'hover', 'feint'];

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

/** Rotate a path's own (along, across) into the field's (x, y). */
function place(state: PathState, offset: Offset): Point {
  const heading = HEADINGS[state.edge];

  return {
    x: state.entry.x + heading.x * offset.along - heading.y * offset.across,
    y: state.entry.y + heading.y * offset.along + heading.x * offset.across,
  };
}

/** Which way "toward the middle of the field" is, in this path's own terms. */
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

/** Along the heading, oscillating around the line it entered on. Keyed to age. */
function weave(state: PathState): Offset {
  return {
    along: state.travelled,
    across: Math.sin(state.age * WEAVE_RATE * Math.PI * 2) * WEAVE_REACH,
  };
}

/** Bows toward the middle of the field, then straightens. Always inward. */
function arc(state: PathState): Offset {
  const progress = Math.min(state.travelled / ARC_SPAN, 1);

  return {
    along: state.travelled,
    across: Math.sin(progress * Math.PI) * ARC_REACH * inward(state),
  };
}

/** Advances, holds for a while, then carries on. The hold is a distance, not a time. */
function hover(state: PathState): Offset {
  if (state.travelled < HOVER_DEPTH) {
    return { along: state.travelled, across: 0 };
  }

  if (state.travelled < HOVER_DEPTH + HOVER_SPAN) {
    return { along: HOVER_DEPTH, across: 0 };
  }

  return { along: state.travelled - HOVER_SPAN, across: 0 };
}

/** Presses in, pulls back, then commits. The pull-back is deliberately incomplete. */
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

/** How far a shape swings sideways from the line it entered on. `arc` bows inward. */
function reachOf(path: PathKind): number {
  return path === 'weave' ? WEAVE_REACH : 0;
}

/** Where a squad enters, given its edge, its shape and a lane of 0–1. */
export function entryFor(edge: Edge, path: PathKind, lane: number): Point {
  const inset = reachOf(path) + EDGE_KEEP;

  if (edge === 'top') {
    // The lane spans what is left after both margins.
    return { x: inset + lane * (FIELD_WIDTH - inset * 2), y: -ENTRY_MARGIN };
  }

  return {
    x: edge === 'left' ? -ENTRY_MARGIN : FIELD_WIDTH + ENTRY_MARGIN,
    // The upper half only: the bottom row is the one the player cannot leave.
    y: FIELD_HEIGHT * (0.12 + lane * 0.3),
  };
}

/** Which shapes a round may use. Early rounds stay legible. */
function poolFor(round: number): PathKind[] {
  if (round <= 1) {
    return ['dive', 'weave'];
  }

  if (round <= 3) {
    return ['dive', 'weave', 'arc'];
  }

  return ALL_PATHS;
}

/** The shape a squad flies, derived rather than drawn, so a player can learn it. */
export function pathFor(round: number, slot: number): PathKind {
  const pool = poolFor(round);

  return pool[(round * 3 + slot) % pool.length];
}

/** Which edge a squad comes in from. Top-only for two rounds, then one in three. */
export function edgeFor(round: number, slot: number): Edge {
  if (round <= 2 || slot % 3 !== 2) {
    return 'top';
  }

  return slot % 6 === 2 ? 'left' : 'right';
}
