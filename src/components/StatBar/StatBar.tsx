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

/**
 * One stat, drawn as a filled track.
 *
 * Deliberately not merged with the health bar arriving in #8: one shows
 * endurance and the other shows strength. The shapes rhyme; the
 * responsibilities do not, and merging them makes a bar that means blood
 * sometimes and damage other times.
 *
 * The scale ends arrive as props rather than being written in here, because
 * they are the engine's numbers — hardcoding 100 and 300 in a component would
 * put a second copy of them a layer away from the first.
 */
export function StatBar({ label, percent, min, max }: StatBarProps) {
  const fill = (percent - min) / (max - min);

  return (
    <div className={styles.bar}>
      <span className={styles.label}>{label}</span>
      <div className={styles.track}>
        {/* scaleX rather than width: it animates on the compositor instead of
            forcing a layout pass on every point the player moves. */}
        <div className={styles.fill} style={{ transform: `scaleX(${fill})` }} />
      </div>
      {/* One expression, not `{percent}%` — a number and its unit are one
          thing to read, and splitting them is what the JSX line rule would
          otherwise force. */}
      <span className={styles.value}>{`${percent}%`}</span>
    </div>
  );
}
