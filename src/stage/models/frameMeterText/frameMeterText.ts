/** Readings under this show in warning amber (game-spec 8.9). */
const SLOW_FPS = 55;

/** `—` until a reading exists (or it rounds to 0), else `{fps} FPS · {worst}ms`. */
export function frameMeterText(fps: number, worst: number): string {
  return fps === 0 ? '—' : `${fps} FPS · ${worst}ms`;
}

export function isSlowFrameRate(fps: number): boolean {
  return fps > 0 && fps < SLOW_FPS;
}
