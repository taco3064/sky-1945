import type { CSSProperties } from 'react';

import styles from './styles.module.css';

export interface SpeedLinesProps {
  /**
   * How fast the streaks travel, as a multiple of the base rate.
   *
   * The loadout's speed boost, 1–3. Passed once when the run starts rather than
   * driven per frame: the whole effect is a CSS animation, so the only cost after
   * mount is compositing.
   */
  pace?: number;
}

/**
 * The sense of flying forward, with no background art.
 *
 * The requirement said no background, and this is not one: it is a field of
 * streaks with nothing behind them, so the black stays black. What sells the
 * motion is that the streaks are *short and sparse* — a solid scrolling texture
 * would read as ground moving past, where gaps read as air.
 *
 * Two layers at different rates, because one is a moving wallpaper and two is
 * parallax: the near layer is brighter, quicker and thinner, the far one slower
 * and dimmer, and the eye takes the difference as depth.
 *
 * No JavaScript runs for any of this. The rate arrives as a custom property and
 * the browser animates `background-position` on the compositor — nothing here
 * touches the 16.6ms the simulation is spending.
 */
export function SpeedLines({ pace = 1 }: SpeedLinesProps) {
  return (
    <div
      className={styles.rush}
      style={{ '--pace': pace } as CSSProperties}
      aria-hidden="true"
    >
      <div className={styles.far} />
      <div className={styles.near} />
    </div>
  );
}
