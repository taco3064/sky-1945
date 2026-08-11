import type { LoadoutPoints } from '~app/engine/boosts';

export interface LoadoutScreenProps {
  /** Points currently on speed, 0–10. */
  speedPoints: LoadoutPoints;
  /** Set the allocation outright — what the slider sends. */
  onPoints: (value: number) => void;
  /** Move the allocation — what an arrow key sends. */
  onAdjust: (delta: number) => void;
  /** Take the allocation into the run. */
  onConfirm: () => void;
}
