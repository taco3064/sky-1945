import ControlHints from '~app/components/ControlHints';
import StatBar from '~app/components/StatBar';
import {
  BOOST_MAX_PERCENT,
  BOOST_MIN_PERCENT,
  LOADOUT_POINTS,
  boostsFromPoints,
} from '~app/engine/boosts';
import { useKeyMap } from '~app/hooks/useKeyMap';

import styles from './styles.module.css';
import type { LoadoutScreenProps } from './types';

/** Ten points across two stats, spent on one slider — one number, one control. */
export default function LoadoutScreen({
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

      {/* The component draws itself; the screen says where it sits. */}
      <div className={styles.hints}>
        <ControlHints />
      </div>

      <button className={styles.start} type="button" onClick={onConfirm}>
        START
      </button>
    </div>
  );
}
