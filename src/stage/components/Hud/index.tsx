import type { BossView } from '~app/battle/lib/view'
import { BossHealthBar } from '../BossHealthBar'
import { LifeIcon } from '../LifeIcon'
import { frameMeterText, isSlowFrameRate } from '~app/stage/lib/frameMeterText'
import './Hud.css'

export type StagePhase = 'playing' | 'paused' | 'gameover'

interface HudProps {
  lives: number
  round: number
  boss: BossView | null
  fps: number
  worst: number
  phase: StagePhase
  onPause: () => void
}

/** The HUD frame over the scaled field, unscaled itself (game-spec 8.5). */
export function Hud({ lives, round, boss, fps, worst, phase, onPause }: HudProps) {
  const paused = phase === 'paused'

  return (
    <div className="hud">
      <div className="hud__lives">
        {Array.from({ length: lives }, (_, index) => (
          <LifeIcon key={index} />
        ))}
      </div>
      <p className="hud__round">{`ROUND ${round}`}</p>
      {boss && <BossHealthBar hp={boss.hp} maxHp={boss.maxHp} pose={boss.pose} move={boss.move} />}
      <p className={isSlowFrameRate(fps) ? 'hud__frame-meter hud__frame-meter--slow' : 'hud__frame-meter'}>
        {frameMeterText(fps, worst)}
      </p>
      {phase !== 'gameover' && (
        <button className="hud__pause" type="button" aria-label={paused ? 'Resume' : 'Pause'} onClick={onPause}>
          {paused ? '▶' : '❚❚'}
        </button>
      )}
    </div>
  )
}
