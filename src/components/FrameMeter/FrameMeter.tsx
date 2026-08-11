import styles from './styles.module.css';
import type { FrameMeterProps } from './types';

/** Below this, the run is not holding the frame budget. */
const SMOOTH_ENOUGH = 55;

/** What the game is costing. The average says smooth; the worst frame says stutter. */
export default function FrameMeter({ fps, worst }: FrameMeterProps) {
  const slow = fps > 0 && fps < SMOOTH_ENOUGH;

  return (
    <p className={styles.meter} data-slow={slow ? '' : undefined}>
      {fps > 0 ? `${fps} FPS · ${worst}ms` : '—'}
    </p>
  );
}
