import { FIELD_HEIGHT, FIELD_WIDTH } from '../game/field.ts'

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
