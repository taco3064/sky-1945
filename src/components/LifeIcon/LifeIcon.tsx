import styles from './styles.module.css';

/**
 * One aircraft in the lives counter.
 *
 * A simplified ALLY-01 rather than the real thing: at 14px the fuselage
 * highlight, the spine light and the wingtip lamps all collapse into a smudge,
 * so the icon keeps only what survives — the planform, and the canopy glow.
 *
 * It draws itself and reads nothing. Three of these in a row say "three
 * aircraft left" faster than a numeral does, and the HUD needs to be readable
 * without being looked at.
 */
export function LifeIcon() {
  return (
    <span className={styles.icon}>
      <span className={styles.wing} />
      <span className={styles.body} />
    </span>
  );
}
