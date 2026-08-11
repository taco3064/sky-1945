import { useEntityTransform } from '~app/hooks/useEntityTransform';

import styles from './styles.module.css';
import type { FighterProps } from './types';

/** The player's aircraft. Two elements: the engine owns the outer transform. */
export function Fighter({
  id,
  rolling = false,
  invulnerable = false,
  ready = true,
}: FighterProps) {
  const ref = useEntityTransform(id);

  return (
    <div ref={ref} className={styles.mount}>
      <div
        className={[
          styles.craft,
          rolling ? styles.rolling : '',
          invulnerable ? styles.invulnerable : '',
        ].join(' ')}
      >
        <div className={`${styles.thrust} ${ready ? '' : styles.spent}`} />
        <div className={styles.wing} />
        <div className={`${styles.fin} ${styles.finLeft}`} />
        <div className={`${styles.fin} ${styles.finRight}`} />
        <div className={styles.body} />
        <div className={styles.canopy} />
      </div>
    </div>
  );
}
