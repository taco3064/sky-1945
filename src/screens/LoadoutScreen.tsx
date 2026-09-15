import { useEffect, useEffectEvent } from 'react'
import {
  clampSpeedPoints,
  powerPercent,
  speedPercent,
  statFill,
  LOADOUT_POINTS,
} from '../game/loadout.ts'
import './LoadoutScreen.css'

type LoadoutScreenProps = {
  speedPoints: number
  onChange: (speedPoints: number) => void
  onStart: () => void
}

const CONTROLS: [action: string, keys: string, touch: string][] = [
  ['STEER', 'ARROW KEYS', 'DRAG ANYWHERE'],
  ['ROLL', 'SPACE', 'TAP OR 2ND FINGER'],
  ['PAUSE', 'ESC', '❚❚ BUTTON'],
  ['PULSE', 'X', 'PULSE BUTTON'],
]

export function LoadoutScreen({ speedPoints, onChange, onStart }: LoadoutScreenProps) {
  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        onChange(clampSpeedPoints(speedPoints - 1))
        break
      case 'ArrowRight':
        event.preventDefault()
        onChange(clampSpeedPoints(speedPoints + 1))
        break
      case 'Enter':
        event.preventDefault()
        onStart()
        break
    }
  })

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="loadout-screen">
      <h1 className="loadout-heading">LOADOUT</h1>
      <p className="loadout-hint">10 POINTS · SPEND ONE, LOSE THE OTHER</p>
      <div className="loadout-stats">
        <div className="loadout-stat-speed">
          <StatBar label="SPEED" percent={speedPercent(speedPoints)} />
        </div>
        <div className="loadout-stat-power">
          <StatBar label="POWER" percent={powerPercent(speedPoints)} />
        </div>
      </div>
      <div className="loadout-slider-row">
        <span className="loadout-slider-end">POWER</span>
        <input
          className="loadout-slider"
          type="range"
          min="0"
          max={LOADOUT_POINTS}
          step="1"
          value={speedPoints}
          aria-label="Points spent on speed"
          onChange={(event) => onChange(clampSpeedPoints(Number(event.target.value)))}
        />
        <span className="loadout-slider-end">SPEED</span>
      </div>
      <div className="loadout-controls">
        <table className="controls-table">
          <caption>CONTROLS</caption>
          <thead>
            <tr>
              <td />
              <th scope="col">KEYS</th>
              <th scope="col">TOUCH</th>
            </tr>
          </thead>
          <tbody>
            {CONTROLS.map(([action, keys, touch]) => (
              <tr key={action}>
                <th scope="row">{action}</th>
                <td>{keys}</td>
                <td>{touch}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="loadout-start" type="button" onClick={onStart}>
        START
      </button>
    </div>
  )
}

type StatBarProps = {
  label: string
  percent: number
}

function StatBar({ label, percent }: StatBarProps) {
  return (
    <div className="stat-bar">
      <span className="stat-bar-label">{label}</span>
      <div className="stat-bar-track">
        <div className="stat-bar-fill" style={{ transform: `scaleX(${statFill(percent)})` }} />
      </div>
      <span className="stat-bar-value">{percent}%</span>
    </div>
  )
}
