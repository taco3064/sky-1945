import type { Point } from '../field'

export type EnemyPath = 'dive' | 'weave' | 'arc' | 'hover' | 'feint'

export type EntryEdge = 'top' | 'left' | 'right'

/** Heading (hx, hy) of each entry edge (game-spec 12.7). */
const EDGE_HEADINGS: Record<EntryEdge, Point> = {
  top: { x: 0, y: 1 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
}

const WEAVE_FREQUENCY = 0.35
const WEAVE_AMPLITUDE = 70
const ARC_LENGTH = 700
const ARC_AMPLITUDE = 190
const HOVER_ARRIVE = 260
const HOVER_LEAVE = 600
const HOVER_HOLD = 340
const FEINT_LENGTH = 520
const FEINT_PUSH = 300

/** Offset in the path's own frame. */
export interface PathOffset {
  along: number
  across: number
}

/** The arc bends toward the field centre: sign of c, or 1 when c = 0. */
export function inwardSign(edge: EntryEdge, entry: Point): number {
  const heading = EDGE_HEADINGS[edge]
  const c = heading.x * (480 - entry.y) - heading.y * (270 - entry.x)
  return c === 0 ? 1 : Math.sign(c)
}

/** weave depends on time (`age`); the other paths on distance (`travelled`). */
export function pathOffset(path: EnemyPath, travelled: number, age: number, inward: number): PathOffset {
  switch (path) {
    case 'dive':
      return { along: travelled, across: 0 }
    case 'weave':
      return { along: travelled, across: Math.sin(age * WEAVE_FREQUENCY * 2 * Math.PI) * WEAVE_AMPLITUDE }
    case 'arc':
      return {
        along: travelled,
        across: Math.sin(Math.min(travelled / ARC_LENGTH, 1) * Math.PI) * ARC_AMPLITUDE * inward,
      }
    case 'hover':
      return { along: hoverAlong(travelled), across: 0 }
    case 'feint':
      return { along: feintAlong(travelled), across: 0 }
  }
}

function hoverAlong(travelled: number): number {
  if (travelled < HOVER_ARRIVE) {
    return travelled
  }
  return travelled < HOVER_LEAVE ? HOVER_ARRIVE : travelled - HOVER_HOLD
}

function feintAlong(travelled: number): number {
  if (travelled < FEINT_LENGTH) {
    return travelled / 2 + Math.sin((travelled / FEINT_LENGTH) * Math.PI) * FEINT_PUSH
  }
  return travelled - FEINT_LENGTH / 2
}

/** Field position of a craft that entered at `entry` from `edge`. */
export function pathPosition(path: EnemyPath, edge: EntryEdge, entry: Point, travelled: number, age: number): Point {
  const heading = EDGE_HEADINGS[edge]
  const { along, across } = pathOffset(path, travelled, age, inwardSign(edge, entry))
  return {
    x: entry.x + heading.x * along - heading.y * across,
    y: entry.y + heading.y * along + heading.x * across,
  }
}
