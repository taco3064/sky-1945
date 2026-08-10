import { useEntityTransform } from '~app/hooks/useEntityTransform';

import styles from './styles.module.css';

export interface BulletProps {
  /** The engine's id for this bullet. */
  id: number;
}

/**
 * One shot. Deliberately a single element with its glow painted by a pseudo
 * element: at peak there are around 150 of these, and every DOM node is
 * multiplied by that count. The Fighter can afford six; a bullet cannot.
 */
export function Bullet({ id }: BulletProps) {
  const ref = useEntityTransform(id);

  return <div ref={ref} className={styles.bullet} />;
}
