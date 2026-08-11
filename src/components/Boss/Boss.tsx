import type { CSSProperties } from 'react';

import { useEntityTransform } from '~app/hooks/useEntityTransform';

import styles from './styles.module.css';

/** What the boss is doing. A plain union — components do not read engine types. */
export type BossPose = 'entering' | 'winding' | 'firing' | 'recovering';

/** Which attack it is on. */
export type BossMove = 'straight' | 'spread' | 'radial' | 'beam';

export interface BossProps {
  /** The engine's id for the boss body. */
  id: number;
  pose: BossPose;
  /** Absent while it is still flying in. */
  move?: BossMove;
  /** How large this one was rolled, as a multiple of the drawing's own size. */
  size?: number;
}

/** The boss. Pose and move go onto data attributes so the CSS can announce the attack. */
export function Boss({ id, pose, move, size = 1 }: BossProps) {
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
