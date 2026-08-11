/** A point in the field's coordinates. */
export interface Point {
  x: number;
  y: number;
}

/** Fixed on every device; the screen is fitted to them by `useStageScale`. */
export const FIELD_WIDTH = 540;
export const FIELD_HEIGHT = 960;

/** Whether a point has left the field. `margin` extends the boundary outward. */
export function isOutside(x: number, y: number, margin = 0): boolean {
  return x < -margin
    || x > FIELD_WIDTH + margin
    || y < -margin
    || y > FIELD_HEIGHT + margin;
}
