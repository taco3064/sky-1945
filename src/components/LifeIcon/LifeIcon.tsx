import styles from './styles.module.css';

/** One aircraft in the lives counter. A simplified planform — 14px keeps no detail. */
export function LifeIcon() {
  return (
    <span className={styles.icon}>
      <span className={styles.wing} />
      <span className={styles.body} />
    </span>
  );
}
