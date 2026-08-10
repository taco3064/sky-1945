import { useEntityTransform } from '~app/hooks/useEntityTransform';

import styles from './styles.module.css';

/** How big the wreck is. Also how many shards it throws. */
export type BurstSize = 'small' | 'large';

/** Whose wreckage. Decides the palette and nothing else. */
export type BurstTone = 'ally' | 'enemy';

export interface BurstProps {
  /** The engine's id for this burst — negative, since bursts have no body. */
  id: number;
  size: BurstSize;
  tone: BurstTone;
}

/** Small wrecks throw six shards, large ones ten. */
const SHARDS: Record<BurstSize, number> = { small: 6, large: 10 };

/**
 * An aircraft coming apart.
 *
 * One implementation for both sides — the player breaking up and an enemy
 * exploding are the same move (parts flying apart on different vectors), and
 * they differ only in palette and shard count. Written once because it was
 * always going to be needed twice.
 *
 * Two beats: a white flash that reads as the hit, then the shards scattering.
 * Pure CSS, so nothing here runs per frame.
 */
export function Burst({ id, size, tone }: BurstProps) {
  const ref = useEntityTransform(id);

  return (
    <div ref={ref} className={`${styles.burst} ${styles[size]} ${styles[tone]}`}>
      <div className={styles.flash} />
      {Array.from({ length: SHARDS[size] }, (_unused, index) => (
        <div key={index} className={styles.shard} />
      ))}
    </div>
  );
}
