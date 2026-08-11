import type { CSSProperties } from 'react';

import styles from './styles.module.css';
import type { SpeedLinesProps } from './types';

/** The sense of flying forward, with no background art. Two layers, for parallax. */
export default function SpeedLines({ pace = 1 }: SpeedLinesProps) {
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
