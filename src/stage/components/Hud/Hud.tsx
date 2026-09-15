import type { BossView } from '~app/battle/models/simulation';
import { BossHealthBar } from '../BossHealthBar';
import { LifeIcon } from '../LifeIcon';
import { PulseButton } from '../PulseButton';
import { PulseMeter } from '../PulseMeter';
import { frameMeterText, isSlowFrameRate } from '~app/stage/models/frameMeterText';
import './Hud.css';

export type StagePhase = 'playing' | 'paused' | 'gameover';

interface HudProps {
  lives: number;
  round: number;
  boss: BossView | null;
  fps: number;
  worst: number;
  /** PULSE energy, 0–100. */
  energy: number;
  phase: StagePhase;
  onPause: () => void;
  onPulse: () => void;
}

/** The HUD frame over the scaled field, unscaled itself (game-spec 8.5). */
export function Hud({
  lives,
  round,
  boss,
  fps,
  worst,
  energy,
  phase,
  onPause,
  onPulse,
}: HudProps) {
  const paused = phase === 'paused';

  const meterClass = isSlowFrameRate(fps)
    ? 'hud__frame-meter hud__frame-meter--slow'
    : 'hud__frame-meter';

  return (
    <div className="hud">
      <div className="hud__lives">
        {Array.from({ length: lives }, (_, index) => (
          <LifeIcon key={index} />
        ))}
      </div>
      <p className="hud__round">{`ROUND ${round}`}</p>
      {boss && (
        <BossHealthBar
          hp={boss.hp}
          maxHp={boss.maxHp}
          pose={boss.pose}
          move={boss.move}
        />
      )}
      <p className={meterClass}>
        {frameMeterText(fps, worst)}
      </p>
      <PulseMeter energy={energy} />
      {phase !== 'gameover' && (
        <>
          <PulseButton energy={energy} onPulse={onPulse} />
          <button
            className="hud__pause"
            type="button"
            aria-label={paused ? 'Resume' : 'Pause'}
            onClick={onPause}
          >
            {paused ? '▶' : '❚❚'}
          </button>
        </>
      )}
    </div>
  );
}
