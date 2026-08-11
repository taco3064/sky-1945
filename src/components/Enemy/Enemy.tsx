import { useEntityTransform } from '~app/hooks/useEntityTransform';

import styles from './styles.module.css';

/** Which silhouette to draw. A plain union — components do not read engine types. */
export type EnemyVariant = 'small' | 'medium' | 'large';

export interface EnemyProps {
  /** The engine's id for this aircraft. */
  id: number;
  variant: EnemyVariant;
}

/**
 * Three enemy silhouettes, drawn nose-up.
 *
 * They appear nose-*down* on the field because the engine publishes a 180°
 * angle on every enemy body — the rotation rides on the transform that is
 * already being written, rather than costing a wrapper element per enemy.
 *
 * Node counts are deliberate and unequal: the small craft is three elements
 * because ten of them share the screen, and the large one is six because two
 * do. At peak the field carries roughly 200 elements, and every node here is
 * multiplied by its concurrency ceiling.
 */
function SmallCraft() {
  return (
    <>
      <div className={styles.wing} />
      <div className={styles.body} />
      <div className={styles.core} />
    </>
  );
}

function MediumCraft() {
  return (
    <>
      <div className={styles.wing} />
      <div className={`${styles.pod} ${styles.podLeft}`} />
      <div className={`${styles.pod} ${styles.podRight}`} />
      <div className={styles.body} />
      <div className={styles.canopy} />
    </>
  );
}

function LargeCraft() {
  return (
    <>
      <div className={styles.wing} />
      <div className={styles.armour} />
      <div className={`${styles.pod} ${styles.podLeft}`} />
      <div className={`${styles.pod} ${styles.podRight}`} />
      <div className={styles.body} />
      <div className={styles.core} />
    </>
  );
}

const CRAFT = { small: SmallCraft, medium: MediumCraft, large: LargeCraft };

export function Enemy({ id, variant }: EnemyProps) {
  const ref = useEntityTransform(id);
  const Craft = CRAFT[variant];

  return (
    <div ref={ref} className={`${styles.mount} ${styles[variant]}`}>
      {/* The bank lives on an inner element: the mount carries the engine's
          transform, written sixty times a second, and two sources of geometry on
          one element is how the boss's drawing came adrift from its hit circle. */}
      <div className={styles.craft}>
        <Craft />
      </div>
    </div>
  );
}
