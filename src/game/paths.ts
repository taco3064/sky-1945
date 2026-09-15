export type Edge = 'top' | 'left' | 'right'

export type PathName = 'dive' | 'weave' | 'arc' | 'hover' | 'feint'

export type Point = { x: number; y: number }

/** Unit heading of a craft entering from each edge. */
const HEADINGS: Record<Edge, { hx: number; hy: number }> = {
  top: { hx: 0, hy: 1 },
  left: { hx: 1, hy: 0 },
  right: { hx: -1, hy: 0 },
}

/** Which way an arc bows: towards the field centre (270, 480), or 1 when the entry is already on it. */
export function inwardSign(edge: Edge, entry: Point): number {
  const { hx, hy } = HEADINGS[edge]
  const c = hx * (480 - entry.y) - hy * (270 - entry.x)
  return c === 0 ? 1 : Math.sign(c)
}

/** The path's offset in its own frame: `along` the heading and `across` it. */
export function pathOffset(
  path: PathName,
  travelled: number,
  age: number,
  inward: number,
): { along: number; across: number } {
  switch (path) {
    case 'dive':
      return { along: travelled, across: 0 }
    case 'weave':
      return { along: travelled, across: Math.sin(age * 0.35 * 2 * Math.PI) * 70 }
    case 'arc':
      return {
        along: travelled,
        across: Math.sin(Math.min(travelled / 700, 1) * Math.PI) * 190 * inward,
      }
    case 'hover':
      return {
        along: travelled < 260 ? travelled : travelled < 600 ? 260 : travelled - 340,
        across: 0,
      }
    case 'feint':
      return {
        along:
          travelled < 520
            ? travelled / 2 + Math.sin((travelled / 520) * Math.PI) * 300
            : travelled - 260,
        across: 0,
      }
  }
}

/** Field position of a craft that has flown `travelled` u for `age` s along its path. */
export function pathPosition(
  path: PathName,
  edge: Edge,
  entry: Point,
  travelled: number,
  age: number,
  inward: number,
): Point {
  const { hx, hy } = HEADINGS[edge]
  const { along, across } = pathOffset(path, travelled, age, inward)
  return {
    x: entry.x + hx * along - hy * across,
    y: entry.y + hy * along + hx * across,
  }
}
