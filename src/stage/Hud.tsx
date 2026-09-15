import { PULSE_MAX } from '../game/pulse.ts'
import { frameMeterText, isSlowReading, type FrameReading } from './frameTiming.ts'
import {
  bossBarFraction,
  bossBarState,
  isPulseReady,
  pulseMeterFill,
  pulseMeterText,
  type BossHud,
  type HudState,
} from './hudState.ts'
import './Hud.css'

type HudProps = {
  hud: HudState
  frameReading: FrameReading | null
  phase: 'playing' | 'paused' | 'gameover'
  onTogglePause: () => void
  onPulse: () => void
}

export function Hud({ hud, frameReading, phase, onTogglePause, onPulse }: HudProps) {
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
      <PulseMeter pulse={hud.pulse} />
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
      {phase !== 'gameover' && <PulseButton ready={isPulseReady(hud.pulse)} onPulse={onPulse} />}
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

function PulseMeter({ pulse }: { pulse: number }) {
  return (
    <div className="pulse-meter" data-ready={isPulseReady(pulse) || undefined}>
      <div className="pulse-meter-label">
        <span>PULSE</span>
        <span className="pulse-meter-value">{pulseMeterText(pulse)}</span>
      </div>
      <div
        className="pulse-meter-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={PULSE_MAX}
        aria-valuenow={pulse}
        aria-label="Pulse energy"
      >
        <div className="pulse-meter-fill" style={{ width: `${pulseMeterFill(pulse) * 100}%` }} />
      </div>
    </div>
  )
}

/**
 * Starts a Pulse Drive on pointer down, so a finger can press it while another one steers; a second
 * finger's tap may never become a click. A click from the keyboard (detail 0) presses it too.
 */
function PulseButton({ ready, onPulse }: { ready: boolean; onPulse: () => void }) {
  return (
    <button
      className="hud-pulse"
      type="button"
      data-ready={ready || undefined}
      aria-disabled={!ready}
      onPointerDown={onPulse}
      onClick={(event) => {
        if (event.detail === 0) onPulse()
      }}
    >
      PULSE
    </button>
  )
}
