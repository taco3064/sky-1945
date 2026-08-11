import styles from './styles.module.css';
import type { HealthBarProps } from './types';

/** Never below zero and never above one, whatever it is handed. */
function fractionOf(hp: number, maxHp: number): number {
  if (maxHp <= 0) {
    return 0;
  }

  return Math.min(Math.max(hp / maxHp, 0), 1);
}

/** The boss's health, across the top. The labels say what to do, not what it is. */
export default function HealthBar({
  hp,
  maxHp,
  aiming = false,
  shielded = false,
}: HealthBarProps) {
  const fraction = fractionOf(hp, maxHp);

  return (
    <div className={styles.wrap}>
      <div
        className={styles.track}
        role="progressbar"
        aria-label={shielded ? 'Boss health, shielded' : 'Boss health'}
        aria-valuemin={0}
        aria-valuemax={maxHp}
        aria-valuenow={Math.max(hp, 0)}
        data-low={!shielded && fraction <= 0.25 ? '' : undefined}
        data-shielded={shielded ? '' : undefined}
      >
        <div className={styles.fill} style={{ width: `${fraction * 100}%` }} />
      </div>

      {shielded && <p className={styles.note}>ARRIVING</p>}
      {aiming && <p className={styles.warning}>ROLL</p>}
    </div>
  );
}
