import { useEntityTransform } from '~app/hooks/useEntityTransform';

import styles from './styles.module.css';
import type { BeamProps } from './types';

/** The boss's beam: one column, lethal for as long as it is on screen. */
export function Beam({ id }: BeamProps) {
  const ref = useEntityTransform(id);

  return (
    <div ref={ref} className={styles.mount}>
      <div className={styles.core} />
    </div>
  );
}
