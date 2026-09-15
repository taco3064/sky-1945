import type { Point } from '../field';

/** Which edge a craft comes in from. */
export type Edge = 'top' | 'left' | 'right';

/** The shape it flies once it is in. Every shape must eventually leave the field. */
export type PathKind = 'dive' | 'weave' | 'arc' | 'hover' | 'feint';

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
export interface Offset {
  /** Distance along the heading. */
  along: number;
  /** Distance perpendicular to it. */
  across: number;
}
