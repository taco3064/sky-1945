import styles from './styles.module.css';

export interface StatBarProps {
  /** What the bar measures, e.g. `SPEED`. */
  label: string;
  /** Where the value sits, in whole percent. */
  percent: number;
  /** The scale's low end, in whole percent. */
  min: number;
  /** The scale's high end, in whole percent. */
  max: number;
}

/** One stat, drawn as a filled track. The scale ends are the engine's, so props. */
export function StatBar({ label, percent, min, max }: StatBarProps) {
  const fill = (percent - min) / (max - min);

  return (
    <div className={styles.bar}>
      <span className={styles.label}>{label}</span>
      <div className={styles.track}>
        {/* scaleX rather than width: it animates on the compositor. */}
        <div className={styles.fill} style={{ transform: `scaleX(${fill})` }} />
      </div>
      <span className={styles.value}>{`${percent}%`}</span>
    </div>
  );
}
