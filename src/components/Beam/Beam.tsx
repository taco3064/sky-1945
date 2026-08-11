import { useEntityTransform } from '~app/hooks/useEntityTransform';

import styles from './styles.module.css';

export interface BeamProps {
  /** The engine's id for the beam body. */
  id: number;
}

/** The boss's beam: one column, lethal for as long as it is on screen. */
export function Beam({ id }: BeamProps) {
  const ref = useEntityTransform(id);

  return (
    <div ref={ref} className={styles.mount}>
      <div className={styles.core} />
    </div>
  );
}
