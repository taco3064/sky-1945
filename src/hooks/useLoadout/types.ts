import type { LoadoutPoints } from '~app/engine/boosts';

export interface Loadout {
  /** Points on movement speed, 0–10. The remainder is attack power. */
  speedPoints: LoadoutPoints;
  /** Set the allocation outright — what the slider does. */
  setSpeedPoints: (value: number) => void;
  /** Move the allocation — what an arrow key does. */
  adjustSpeedPoints: (delta: number) => void;
}
