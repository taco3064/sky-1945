import styles from './styles.module.css';

export interface FrameMeterProps {
  /** Frames per second, averaged over the last window. */
  fps: number;
  /** The longest single frame in that window, in milliseconds. */
  worst: number;
}

/** Below this, the run is not holding the frame budget. */
const SMOOTH_ENOUGH = 55;

/** What the game is costing. The average says smooth; the worst frame says stutter. */
export function FrameMeter({ fps, worst }: FrameMeterProps) {
  const slow = fps > 0 && fps < SMOOTH_ENOUGH;

  return (
    <p className={styles.meter} data-slow={slow ? '' : undefined}>
      {fps > 0 ? `${fps} FPS · ${worst}ms` : '—'}
    </p>
  );
}
