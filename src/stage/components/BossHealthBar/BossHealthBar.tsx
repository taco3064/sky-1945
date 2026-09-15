import type { BossAttack, BossPose } from '~app/battle/models/boss';
import './BossHealthBar.css';

const LOW_FRACTION = 0.25;

interface BossHealthBarProps {
  hp: number;
  maxHp: number;
  pose: BossPose;
  move: BossAttack | null;
}

/** The boss health bar in the HUD (game-spec 8.6). */
export function BossHealthBar({ hp, maxHp, pose, move }: BossHealthBarProps) {
  const shielded = pose === 'entering';
  const fraction = maxHp > 0 ? Math.min(1, Math.max(0, hp / maxHp)) : 0;
  const state = shielded ? 'shielded' : fraction <= LOW_FRACTION ? 'low' : 'normal';

  return (
    <div className={`boss-bar boss-bar--${state}`}>
      <div
        className="boss-bar__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={maxHp}
        aria-valuenow={Math.max(hp, 0)}
        aria-label={shielded ? 'Boss health, shielded' : 'Boss health'}
      >
        <div className="boss-bar__fill" style={{ width: `${fraction * 100}%` }} />
      </div>
      {shielded && <p className="boss-bar__note">ARRIVING</p>}
      {pose === 'winding' && move === 'beam' && <p className="boss-bar__warning">ROLL</p>}
    </div>
  );
}
