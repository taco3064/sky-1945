import { FIELD_HEIGHT, FIELD_WIDTH } from '../game/field.ts'
import { pulseProgress } from '../game/pulse.ts'

/** Scale that fits the 540 × 960 field inside the viewport's content box. */
export function fieldScale(viewportWidth: number, viewportHeight: number): number {
  return Math.min(viewportWidth / FIELD_WIDTH, viewportHeight / FIELD_HEIGHT)
}

/** Eases an entity's bank towards its sideways travel this frame; 4 u of travel is full lean. */
export function nextLean(lean: number, slide: number): number {
  const target = Math.min(Math.max(slide / 4, -1), 1)
  return lean + (target - lean) * 0.18
}

export function entityTransform(x: number, y: number, angle: number): string {
  return `translate3d(${x}px, ${y}px, 0) rotate(${angle}deg)`
}

/** The Pulse fades linearly from 0.85 at activation to 0.15 at 0.6 s. */
export function pulseOpacity(elapsed: number): number {
  return 0.85 + (0.15 - 0.85) * pulseProgress(elapsed)
}
