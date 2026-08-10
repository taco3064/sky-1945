import { useEntityTransform } from '~app/hooks/useEntityTransform';

import styles from './styles.module.css';

export interface FighterProps {
  /**
   * The engine's id for this aircraft.
   *
   * A plain number rather than the engine's `EntityId`, because `components`
   * may not import `engine` at all — and that ban is exactly why this
   * component can only ever draw. It receives an id and a ref; it never
   * learns that physics exists.
   */
  id: number;
}

/**
 * The player's aircraft, in HTML and CSS.
 *
 * Two elements deep on purpose. The outer one is written by the engine every
 * frame (`translate3d` + `rotate`); the inner one is where attitude
 * animations go — the barrel roll's `rotateY` in #10, hit flashes, tilt.
 * Both writing `transform` on the same element would overwrite each other
 * sixty times a second.
 */
export function Fighter({ id }: FighterProps) {
  const ref = useEntityTransform(id);

  return (
    <div ref={ref} className={styles.mount}>
      <div className={styles.craft}>
        <div className={styles.thrust} />
        <div className={styles.wing} />
        <div className={`${styles.fin} ${styles.finLeft}`} />
        <div className={`${styles.fin} ${styles.finRight}`} />
        <div className={styles.body} />
        <div className={styles.canopy} />
      </div>
    </div>
  );
}
