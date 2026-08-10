import { useEntityTransform } from '~app/hooks/useEntityTransform';

import styles from './styles.module.css';

export interface BulletProps {
  /** The engine's id for this bullet. */
  id: number;
  /**
   * Enemy fire.
   *
   * A boolean rather than a side name: what this component needs is which of
   * two ways to draw, and it has no business knowing the engine's vocabulary.
   */
  hostile?: boolean;
}

/**
 * One shot. Deliberately a single element with its glow painted by a pseudo
 * element: at peak there are around 150 of these, and every DOM node is
 * multiplied by that count. The Fighter can afford six; a bullet cannot.
 */
export function Bullet({ id, hostile = false }: BulletProps) {
  const ref = useEntityTransform(id);

  return <div ref={ref} className={`${styles.bullet} ${hostile ? styles.hostile : ''}`} />;
}
