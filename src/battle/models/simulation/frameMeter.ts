/** The window closes once it holds this many milliseconds (game-spec 13.3). */
const WINDOW_MS = 500;

export interface FrameMeter {
  windowMs: number;
  frames: number;
  longestMs: number;
  /** Published readings; 0 until the first window closes. */
  fps: number;
  worst: number;
}

export function createFrameMeter(): FrameMeter {
  return { windowMs: 0, frames: 0, longestMs: 0, fps: 0, worst: 0 };
}

/** Adds one step's raw milliseconds; true when the window closed and published. */
export function recordFrame(meter: FrameMeter, frameMs: number): boolean {
  meter.windowMs += frameMs;
  meter.frames += 1;
  meter.longestMs = Math.max(meter.longestMs, frameMs);

  if (meter.windowMs < WINDOW_MS) {
    return false;
  }

  meter.fps = Math.round(meter.frames / (meter.windowMs / 1000));
  meter.worst = Math.round(meter.longestMs);
  meter.windowMs = 0;
  meter.frames = 0;
  meter.longestMs = 0;

  return true;
}
