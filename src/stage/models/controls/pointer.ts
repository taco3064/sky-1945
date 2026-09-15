import type { Direction } from './keyboard';

/** A steering offset shorter than this steers nowhere (game-spec 12.4). */
const DEAD_ZONE = 5;
/** A steering pointer released sooner than this, without moving, is a tap. */
const TAP_MS = 200;
/** The knob's offset is capped to this length, in screen px (game-spec 8.8). */
export const KNOB_REACH = Math.round(22 * 1.2);

export interface Steering {
  readonly pointerId: number;
  readonly downX: number;
  readonly downY: number;
  readonly downTime: number;
  /** Ever moved at least the dead zone away from the down point. */
  moved: boolean;
}

/** `down` is where the pointer went down, in screen px. */
export function startSteering(
  pointerId: number,
  down: Direction,
  time: number,
): Steering {
  return { pointerId, downX: down.x, downY: down.y, downTime: time, moved: false };
}

export interface SteeringMove {
  direction: Direction;
  /** Screen px. */
  knob: Direction;
}

/**
 * The finger's offset from the down point: a direction outside the dead zone, and the
 * capped knob offset.
 */
export function moveSteering(steering: Steering, x: number, y: number): SteeringMove {
  const offset = { x: x - steering.downX, y: y - steering.downY };
  const distance = Math.hypot(offset.x, offset.y);

  if (distance >= DEAD_ZONE) {
    steering.moved = true;
  }

  const scale = distance > KNOB_REACH ? KNOB_REACH / distance : 1;

  return {
    direction: distance < DEAD_ZONE ? { x: 0, y: 0 } : offset,
    knob: { x: offset.x * scale, y: offset.y * scale },
  };
}

/** Held under 200 ms and never moved 5 px from the down point. */
export function isTap(steering: Steering, upTime: number): boolean {
  return upTime - steering.downTime < TAP_MS && !steering.moved;
}
