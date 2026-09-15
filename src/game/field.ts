export const FIELD_WIDTH = 540
export const FIELD_HEIGHT = 960

export type Point = { x: number; y: number }

/** A point is outside by margin M when it lies more than M beyond any field edge. */
export function isOutside(x: number, y: number, margin: number): boolean {
  return x < -margin || x > FIELD_WIDTH + margin || y < -margin || y > FIELD_HEIGHT + margin
}
