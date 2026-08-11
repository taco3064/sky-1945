import { useEntityTransform } from '~app/hooks/useEntityTransform';

import styles from './styles.module.css';

export interface FighterProps {
  /** The engine's id. A plain number: `components` cannot import `engine`. */
  id: number;
  /** True while a barrel roll is running. */
  rolling?: boolean;
  /** True while the aircraft cannot be hit. Drawn as a blink, never as invisible. */
  invulnerable?: boolean;
  /** False while the roll is recovering. Drawn on the thrust, so the refusal shows. */
  ready?: boolean;
}

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
