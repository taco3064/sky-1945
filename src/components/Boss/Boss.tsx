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
}

/**
 * The boss, drawn nose-up like every other enemy and rotated by the transform
 * the engine already publishes.
 *
 * Eleven elements, where the small craft gets three. It can afford them: there
 * is exactly one on the field, and it is the only aircraft in the game whose
 * *state* has to be legible at a glance rather than just its position.
 *
 * That legibility is the component's real job. Every attack is announced before
 * it lands, and the announcement is here: the pose and the move go onto data
 * attributes so the CSS can pulse the core, light the arms, and — for the beam —
 * drop a thin charge line down the exact column that is about to become lethal.
 * A player who sees the line has 1.4 seconds to roll, which is the whole
 * difference between a fight and a coin flip.
 */
export function Boss({ id, pose, move }: BossProps) {
  const ref = useEntityTransform(id);

  return (
    <div ref={ref} className={styles.mount} data-pose={pose} data-move={move}>
      {/* The tell for the beam: a hairline that widens through the wind-up,
          down the column the beam itself will occupy. Drawn from the boss's
          nose so it tracks the patrol, exactly as the beam body does. */}
      <div className={styles.charge} />

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
  );
}
