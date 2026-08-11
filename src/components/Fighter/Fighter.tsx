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
  /**
   * True while a barrel roll is running.
   *
   * A boolean rather than anything the engine owns — this component is told
   * what to draw, never where the state came from.
   */
  rolling?: boolean;
  /**
   * True while the aircraft cannot be hit — after a respawn, or mid-roll.
   *
   * Drawn as a blink rather than left invisible: the player has to be able to
   * tell "I am safe" from "I am about to die", and a craft that looks normal
   * while protected teaches the wrong lesson about what is survivable.
   */
  invulnerable?: boolean;
  /**
   * False while the roll is recovering and another would be refused.
   *
   * Drawn on the thrust, because a player who presses the key and sees nothing
   * happen has been told the game is broken. The engine refuses the roll either
   * way; this is the difference between a rule and a bug.
   */
  ready?: boolean;
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
