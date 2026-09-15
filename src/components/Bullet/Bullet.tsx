import { useEntityTransform } from '~app/hooks/useEntityTransform';

import styles from './styles.module.css';
import type { BulletProps } from './types';

/** One shot: a single element, glow painted by a pseudo. There are ~150 at peak. */
export default function Bullet({ id, hostile = false }: BulletProps) {
  const ref = useEntityTransform(id);

  return <div ref={ref} className={`${styles.bullet} ${hostile ? styles.hostile : ''}`} />;
}
