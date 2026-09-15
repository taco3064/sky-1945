/** Play field size in world units (game-spec 12.1). Origin top-left, +y down. */
export const FIELD_WIDTH = 540
export const FIELD_HEIGHT = 960

export interface Point {
  x: number
  y: number
}

/** A point is outside by margin M when x < −M, x > 540 + M, y < −M or y > 960 + M. */
export function isOutsideBy({ x, y }: Point, margin: number): boolean {
  return x < -margin || x > FIELD_WIDTH + margin || y < -margin || y > FIELD_HEIGHT + margin
}
