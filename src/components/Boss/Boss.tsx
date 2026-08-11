import type { CSSProperties } from 'react';

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
  /**
   * How large this one was rolled, as a multiple of the drawing's own size.
   *
   * Applied on the mount, above the element the pose animations scale — two
   * transforms on one element overwrite each other, and the engine already owns a
   * third on the element above.
   */
  size?: number;
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
export function Boss({ id, pose, move, size = 1 }: BossProps) {
  const ref = useEntityTransform(id);

  return (
    <div ref={ref} className={styles.mount} data-pose={pose} data-move={move}>
      {/* The tell for the beam: a hairline that widens through the wind-up, down
          the column the beam itself will occupy. Outside the scaled wrapper on
          purpose — the beam body's width does not scale with the body either, and a
          warning that grew would promise a wider hazard than the one that arrives. */}
      <div className={styles.charge} />

      {/*
        * Three elements deep, and the middle one exists only to hold the size.
        *
        * The engine writes `transform` on the mount every frame. Putting the rolled
        * size on that same element means two sources of geometry on one element, and
        * the silhouette drifted away from its own hit circle — visible in play as
        * shooting an empty patch of sky and hearing the boss take damage. The
        * Fighter has carried the same note since #4 for the same reason.
        */}
      <div className={styles.craft} style={{ '--boss-scale': size } as CSSProperties}>
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
    </div>
  );
}
