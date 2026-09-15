import { frameMeterText, isSlowReading, type FrameReading } from './frameTiming.ts'
import { bossBarFraction, bossBarState, type BossHud, type HudState } from './hudState.ts'
import './Hud.css'

type HudProps = {
  hud: HudState
  frameReading: FrameReading | null
  phase: 'playing' | 'paused' | 'gameover'
  onTogglePause: () => void
}

export function Hud({ hud, frameReading, phase, onTogglePause }: HudProps) {
  return (
    <div className="hud">
      <div className="hud-lives">
        {Array.from({ length: hud.lives }, (_, i) => (
          <LifeIcon key={i} />
        ))}
      </div>
      <p className="hud-round">ROUND {hud.round}</p>
      {hud.boss && <BossBar boss={hud.boss} />}
      <p className="hud-meter" data-slow={isSlowReading(frameReading) || undefined}>
        {frameMeterText(frameReading)}
      </p>
      {phase !== 'gameover' && (
        <button
          className="hud-pause"
          type="button"
          aria-label={phase === 'paused' ? 'Resume' : 'Pause'}
          onClick={onTogglePause}
        >
          {phase === 'paused' ? '▶' : '❚❚'}
        </button>
      )}
    </div>
  )
}

function LifeIcon() {
  return (
    <span className="life-icon">
      <span className="life-icon-wing" />
      <span className="life-icon-body" />
    </span>
  )
}

function BossBar({ boss }: { boss: BossHud }) {
  const fraction = bossBarFraction(boss)

  return (
    <div className="boss-bar" data-state={bossBarState(boss)}>
      <div
        className="boss-bar-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={boss.maxHp}
        aria-valuenow={Math.max(boss.hp, 0)}
        aria-label={boss.shielded ? 'Boss health, shielded' : 'Boss health'}
      >
        <div className="boss-bar-fill" style={{ width: `${fraction * 100}%` }} />
      </div>
      {boss.shielded && <p className="boss-bar-note">ARRIVING</p>}
      {boss.warning && <p className="boss-bar-warning">ROLL</p>}
    </div>
  )
}
