/**
 * The play area, in world units.
 *
 * These numbers lived in `world` until bullets and enemies both needed to ask
 * "has this left the field?" — a question about the field, not about the loop
 * that steps it. Keeping them in `world` would have meant those modules
 * importing the module that imports them, and `cycles` is an error.
 *
 * Fixed on every device, and the screen is fitted to them (`useStageScale`).
 * A field sized to the viewport would be a *wider* field on a tablet, and a
 * wider field is an easier one: the same wave becomes more dodgeable on
 * bigger hardware.
 */

export const FIELD_WIDTH = 540;
export const FIELD_HEIGHT = 960;

/**
 * Whether a point has left the field.
 *
 * `margin` extends the boundary outward, which is what spawning above the top
 * edge needs: an enemy entering the field is outside it for its first second,
 * and must not be culled on the frame it appears.
 */
export function isOutside(x: number, y: number, margin = 0): boolean {
  return x < -margin
    || x > FIELD_WIDTH + margin
    || y < -margin
    || y > FIELD_HEIGHT + margin;
}
