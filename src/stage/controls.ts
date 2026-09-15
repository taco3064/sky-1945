export type Vector = { x: number; y: number }

const ARROWS: Record<string, Vector> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
}

export function isArrowKey(key: string): boolean {
  return key in ARROWS
}

/**
 * X starts a Pulse Drive, with or without Shift or Caps Lock. The X key also does when an IME or a non-Latin
 * layout types something else there, but not when a Latin layout such as Dvorak puts another letter on it.
 */
export function isPulseKey(key: string, code: string): boolean {
  if (key === 'x' || key === 'X') return true
  return code === 'KeyX' && !/^[a-z]$/i.test(key)
}

/** Held arrow keys summed into a direction; opposite keys cancel. */
export function arrowsDirection(held: Iterable<string>): Vector {
  let x = 0
  let y = 0
  for (const key of held) {
    x += ARROWS[key].x
    y += ARROWS[key].y
  }
  return { x, y }
}

const DEAD_ZONE = 5
const TAP_MS = 200
/** round(22 × 1.2) */
const KNOB_REACH = 26

type Steering = { id: number; x: number; y: number; time: number; moved: boolean }

/**
 * Pointer steering: the first pointer down steers by its offset from where it touched down; another
 * pointer while one steers asks for a roll, and so does a short tap that never left the dead zone.
 */
export class PointerGesture {
  #steering: Steering | null = null

  /** Returns 'steer' when this pointer becomes the steering pointer, 'roll' otherwise. */
  down(id: number, x: number, y: number, time: number): 'steer' | 'roll' {
    if (this.#steering) return 'roll'
    this.#steering = { id, x, y, time, moved: false }
    return 'steer'
  }

  /** The steering pointer's direction and knob offset, or null for any other pointer. */
  move(id: number, x: number, y: number): { direction: Vector; knob: Vector } | null {
    const steering = this.#steering
    if (!steering || steering.id !== id) return null

    const dx = x - steering.x
    const dy = y - steering.y
    const distance = Math.hypot(dx, dy)
    if (distance >= DEAD_ZONE) steering.moved = true

    const cap = distance > KNOB_REACH ? KNOB_REACH / distance : 1
    return {
      direction: distance < DEAD_ZONE ? { x: 0, y: 0 } : { x: dx, y: dy },
      knob: { x: dx * cap, y: dy * cap },
    }
  }

  /** Ends steering; `roll` is true for a tap under 200 ms that never moved 5 px. Null for any other pointer. */
  up(id: number, time: number): { roll: boolean } | null {
    const steering = this.#steering
    if (!steering || steering.id !== id) return null

    this.#steering = null
    return { roll: time - steering.time < TAP_MS && !steering.moved }
  }
}
