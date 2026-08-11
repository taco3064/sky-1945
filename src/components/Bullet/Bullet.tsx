import { useEntityTransform } from '~app/hooks/useEntityTransform';

import styles from './styles.module.css';

export interface BulletProps {
  /** The engine's id for this bullet. */
  id: number;
  /** Enemy fire. A boolean, not a side name — this only decides which way to draw. */
  hostile?: boolean;
}

/** One shot: a single element, glow painted by a pseudo. There are ~150 at peak. */
export function Bullet({ id, hostile = false }: BulletProps) {
  const ref = useEntityTransform(id);

  return <div ref={ref} className={`${styles.bullet} ${hostile ? styles.hostile : ''}`} />;
}
