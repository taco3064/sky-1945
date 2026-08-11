import { ControlHints } from '~app/components/ControlHints';
import { StatBar } from '~app/components/StatBar';
import {
  BOOST_MAX_PERCENT,
  BOOST_MIN_PERCENT,
  LOADOUT_POINTS,
  boostsFromPoints,
} from '~app/engine/boosts';
import type { LoadoutPoints } from '~app/engine/boosts';
import { useKeyMap } from '~app/hooks/useKeyMap';

import styles from './styles.module.css';

export interface LoadoutScreenProps {
  /** Points currently on speed, 0–10. */
  speedPoints: LoadoutPoints;
  /** Set the allocation outright — what the slider sends. */
  onPoints: (value: number) => void;
  /** Move the allocation — what an arrow key sends. */
  onAdjust: (delta: number) => void;
  /** Take the allocation into the run. */
  onConfirm: () => void;
}

/**
 * Ten points across two stats, spent on one slider.
 *
 * One number of state gets one control. Two sets of +/- buttons would let the
 * player think of the stats as independent, which they are not — every point
 * on speed is a point off power, and a single handle sliding between them
 * says so without a word of explanation.
 *
 * The boosts are derived here rather than handed down: this screen is the
 * only place that needs both of them.
 */
export function LoadoutScreen({
  speedPoints,
  onPoints,
  onAdjust,
  onConfirm,
}: LoadoutScreenProps) {
  const boosts = boostsFromPoints(speedPoints);

  useKeyMap({
    ArrowLeft: () => onAdjust(-1),
    ArrowRight: () => onAdjust(1),
    Enter: onConfirm,
  });

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>LOADOUT</h1>
      <p className={styles.hint}>
        {LOADOUT_POINTS}
        {' '}
        POINTS · SPEND ONE, LOSE THE OTHER
      </p>

      <div className={styles.bars}>
        <div className={styles.speed}>
          <StatBar
            label="SPEED"
            percent={boosts.speed.percent}
            min={BOOST_MIN_PERCENT}
            max={BOOST_MAX_PERCENT}
          />
        </div>
        <div className={styles.power}>
          <StatBar
            label="POWER"
            percent={boosts.power.percent}
            min={BOOST_MIN_PERCENT}
            max={BOOST_MAX_PERCENT}
          />
        </div>
      </div>

      <div className={styles.slider}>
        <span className={styles.end}>POWER</span>
        <input
          className={styles.range}
          type="range"
          min={0}
          max={LOADOUT_POINTS}
          step={1}
          value={speedPoints}
          aria-label="Points spent on speed"
          onChange={(event) => onPoints(Number(event.target.value))}
        />
        <span className={styles.end}>SPEED</span>
      </div>

      {/* Same shape as the StatBar wrappers above: the component draws itself,
          the screen says where it sits and how wide it gets. */}
      <div className={styles.hints}>
        <ControlHints />
      </div>

      <button className={styles.start} type="button" onClick={onConfirm}>
        START
      </button>
    </div>
  );
}
