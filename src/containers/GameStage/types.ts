import type { LoadoutPoints } from '~app/engine/boosts';
import type { World } from '~app/engine/world';

/** Where the run is, as one value rather than a pile of booleans. */
export type StagePhase = 'playing' | 'paused' | 'gameover';

export interface GameStageProps {
  /** The run's allocation. Both boosts are derived here. */
  speedPoints: LoadoutPoints;
  /** Playing, paused, or finished. Anything but `playing` stops the world. */
  phase: StagePhase;
  /** Pause, or resume from paused. */
  onPause: () => void;
  /** Leave the run for the title screen. */
  onQuit: () => void;
  /** The last life is gone. */
  onGameOver: () => void;
}

export interface FieldProps {
  /** A world that is already built and is this component's for its lifetime. */
  world: World;
  /** How fast the speed lines travel — the loadout's speed boost, 1–3. */
  pace: number;
  phase: StagePhase;
  onPause: () => void;
  onQuit: () => void;
  onGameOver: () => void;
}
