import type { Point } from './field';

/**
 * Velocity for a heading in degrees: 0° points right, 90° points down the screen
 * (game-spec 0). The result is `(cos θ × speed, sin θ × speed)`.
 */
export function headingVelocity(heading: number, speed: number): Point {
  const radians = (heading * Math.PI) / 180;

  return { x: Math.cos(radians) * speed, y: Math.sin(radians) * speed };
}
