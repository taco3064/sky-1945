import { useEntityTransform } from '~app/hooks/useEntityTransform';

import styles from './styles.module.css';
import type { BurstProps, BurstSize } from './types';

/** Small wrecks throw six shards, large ones ten. */
const SHARDS: Record<BurstSize, number> = { small: 6, large: 10 };

/** An aircraft coming apart: a flash, then shards. One implementation for both sides. */
export default function Burst({ id, size, tone }: BurstProps) {
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
