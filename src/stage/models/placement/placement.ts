/** Sideways travel in one displayed frame that gives full lean (game-spec 8.4). */
const FULL_LEAN_SLIDE = 4;
const LEAN_EASING = 0.18;

/**
 * Eases an entity's bank toward its sideways travel, once per displayed frame.
 * `slide` is `x − previousX`, 0 on an entity's first frame.
 */
export function nextLean(lean: number, slide: number): number {
  const target = Math.min(1, Math.max(-1, slide / FULL_LEAN_SLIDE));

  return lean + (target - lean) * LEAN_EASING;
}

/** The outer element's transform for an entity centred at (x, y). */
export function placementTransform(x: number, y: number, angle: number): string {
  return `translate3d(${x}px, ${y}px, 0) rotate(${angle}deg)`;
}

/** `--lean` is written with 3 decimals. */
export function formatLean(lean: number): string {
  return lean.toFixed(3);
}

/** `--radius` is a unitless u count with 2 decimals; the drawing multiplies it by 1px. */
export function formatRadius(radius: number): string {
  return radius.toFixed(2);
}
