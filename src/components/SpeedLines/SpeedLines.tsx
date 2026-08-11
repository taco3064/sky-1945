import type { CSSProperties } from 'react';

import styles from './styles.module.css';

export interface SpeedLinesProps {
  /** How fast the streaks travel, as a multiple of the base rate. The loadout's, 1–3. */
  pace?: number;
}

/** The sense of flying forward, with no background art. Two layers, for parallax. */
export function SpeedLines({ pace = 1 }: SpeedLinesProps) {
  return (
    <div
      className={styles.rush}
      style={{ '--pace': pace } as CSSProperties}
      aria-hidden="true"
    >
      <div className={styles.far} />
      <div className={styles.near} />
    </div>
  );
}
