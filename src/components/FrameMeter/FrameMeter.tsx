import styles from './styles.module.css';

export interface FrameMeterProps {
  /** Frames per second, averaged over the last window. */
  fps: number;
  /** The longest single frame in that window, in milliseconds. */
  worst: number;
}

/** Below this, the run is not holding the frame budget. */
const SMOOTH_ENOUGH = 55;

/**
 * What the game is costing, in the corner of the screen.
 *
 * Both numbers, because they answer different questions. The average says whether
 * the game is smooth; the worst frame says whether it *stuttered* — and a single
 * 40ms frame in a otherwise perfect second is exactly what a player reports as "it
 * felt like it lagged once", while the average of that second still reads 58.
 *
 * Bottom left: the aircraft lives at the bottom centre and the lives and round sit
 * top left, so this is the one corner nothing else is using and nothing important
 * passes through.
 */
export function FrameMeter({ fps, worst }: FrameMeterProps) {
  const slow = fps > 0 && fps < SMOOTH_ENOUGH;

  return (
    <p className={styles.meter} data-slow={slow ? '' : undefined}>
      {fps > 0 ? `${fps} FPS · ${worst}ms` : '—'}
    </p>
  );
}
