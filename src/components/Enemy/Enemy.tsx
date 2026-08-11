import { useEntityTransform } from '~app/hooks/useEntityTransform';

import styles from './styles.module.css';

/** Which silhouette to draw. A plain union — components do not read engine types. */
export type EnemyVariant = 'small' | 'medium' | 'large';

export interface EnemyProps {
  /** The engine's id for this aircraft. */
  id: number;
  variant: EnemyVariant;
}

/** Drawn nose-up; the engine's 180° angle turns them over. */
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
      {/* The bank lives on an inner element; the mount carries the transform. */}
      <div className={styles.craft}>
        <Craft />
      </div>
    </div>
  );
}
