import styles from './styles.module.css';

export interface HealthBarProps {
  /** Hit points left. */
  hp: number;
  /** What it started with, which is what the bar is a fraction of. */
  maxHp: number;
  /** True while the boss is winding up its beam. */
  aiming?: boolean;
}

/** Never below zero and never above one, whatever it is handed. */
function fractionOf(hp: number, maxHp: number): number {
  if (maxHp <= 0) {
    return 0;
  }

  return Math.min(Math.max(hp / maxHp, 0), 1);
}

/**
 * The boss's health, across the top of the field.
 *
 * The one bar in the game, and the reason any hit points leave the engine at
 * all. A trash mob needs none: the player reads "it is still there". A fight
 * that lasts half a minute needs one, or there is no way to tell a boss at 90%
 * from one about to die, and no reason to keep taking risks.
 *
 * Width is a percentage rather than a transform, which is the opposite of how
 * every aircraft is moved (#4). It can be: this changes tens of times a second
 * at most and there is one of it, where positions change 60 times a second
 * across roughly 200 elements. The playbook's `measurable-perf` cuts both ways
 * — the cheap thing is only worth doing where the cost was real.
 *
 * `ROLL` rather than the attack's name: the player has 1.4 seconds and needs to
 * know what to *do*, not what it is called.
 */
export function HealthBar({ hp, maxHp, aiming = false }: HealthBarProps) {
  const fraction = fractionOf(hp, maxHp);

  return (
    <div className={styles.wrap}>
      <div
        className={styles.track}
        role="progressbar"
        aria-label="Boss health"
        aria-valuemin={0}
        aria-valuemax={maxHp}
        aria-valuenow={Math.max(hp, 0)}
        data-low={fraction <= 0.25 ? '' : undefined}
      >
        <div className={styles.fill} style={{ width: `${fraction * 100}%` }} />
      </div>

      {aiming && <p className={styles.warning}>ROLL</p>}
    </div>
  );
}
