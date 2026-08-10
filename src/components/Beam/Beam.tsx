import { useEntityTransform } from '~app/hooks/useEntityTransform';

import styles from './styles.module.css';

export interface BeamProps {
  /** The engine's id for the beam body. */
  id: number;
}

/**
 * The boss's beam: one column, lethal for as long as it is on screen.
 *
 * It is drawn from the roster like an aircraft or a bullet, because in the
 * engine it *is* one body — a rectangle that appears when the attack starts and
 * is removed when it ends. Its transform comes from the same channel everything
 * else uses, so it tracks the boss's patrol without this component knowing that
 * the boss exists.
 *
 * Two elements: the column and its hot core. The wind-up warning is the Boss
 * component's charge line, not this — by the time this mounts, the time to
 * react has already passed.
 */
export function Beam({ id }: BeamProps) {
  const ref = useEntityTransform(id);

  return (
    <div ref={ref} className={styles.mount}>
      <div className={styles.core} />
    </div>
  );
}
