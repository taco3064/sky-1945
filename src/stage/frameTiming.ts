const MAX_STEP = 1 / 60
const WINDOW_MS = 500
const SLOW_FPS = 55

/** Simulated seconds for a frame: never negative, never more than 1/60 s, so slow frames are not caught up. */
export function stepSeconds(rawMs: number): number {
  return Math.min(Math.max(rawMs / 1000, 0), MAX_STEP)
}

export type FrameReading = { fps: number; worst: number }

/** Collects raw frame times and closes a window every 500 ms. */
export class FrameMeter {
  #frames = 0
  #windowMs = 0
  #longest = 0

  /** Adds one step's raw milliseconds; returns a reading when the window closes. */
  add(rawMs: number): FrameReading | null {
    this.#frames += 1
    this.#windowMs += rawMs
    this.#longest = Math.max(this.#longest, rawMs)
    if (this.#windowMs < WINDOW_MS) return null

    const reading = {
      fps: Math.round(this.#frames / (this.#windowMs / 1000)),
      worst: Math.round(this.#longest),
    }
    this.#frames = 0
    this.#windowMs = 0
    this.#longest = 0
    return reading
  }
}

/** `—` until something is measured, or while the rate rounds to 0. */
export function frameMeterText(reading: FrameReading | null): string {
  return !reading || reading.fps === 0 ? '—' : `${reading.fps} FPS · ${reading.worst}ms`
}

/** A measured rate below 55 fps shows in warning amber. */
export function isSlowReading(reading: FrameReading | null): boolean {
  return !!reading && reading.fps > 0 && reading.fps < SLOW_FPS
}
