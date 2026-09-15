import type { CSSProperties } from 'react';

import { useEntityTransform } from '~app/hooks/useEntityTransform';

import styles from './styles.module.css';
import type { BossProps } from './types';

/** The boss. Pose and move go onto data attributes so the CSS can announce the attack. */
export default function Boss({ id, pose, move, size = 1 }: BossProps) {
  const ref = useEntityTransform(id);

  return (
    <div ref={ref} className={styles.mount} data-pose={pose} data-move={move}>
      {/* The beam's tell. Outside the scaled wrapper — the beam is a fixed width. */}
      <div className={styles.charge} />

      {/* The middle element holds only the size; the mount owns `transform`. */}
      <div className={styles.craft} style={{ '--boss-scale': size } as CSSProperties}>
        <div className={styles.wing} />
        <div className={`${styles.arm} ${styles.armLeft}`} />
        <div className={`${styles.arm} ${styles.armRight}`} />
        <div className={styles.armour} />
        <div className={`${styles.pod} ${styles.podLeft}`} />
        <div className={`${styles.pod} ${styles.podRight}`} />
        <div className={styles.body} />
        <div className={styles.spine} />
        <div className={styles.canopy} />
        <div className={styles.core} />
        <div className={styles.muzzle} />
      </div>
    </div>
  );
}
