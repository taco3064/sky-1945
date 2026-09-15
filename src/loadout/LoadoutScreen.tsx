import { useLoadoutKeys } from '~app/loadout/hooks/useLoadoutKeys'
import { clampPoints, powerPercent, speedPercent } from '~app/loadout/models/allocation'
import { ControlsTable } from '~app/loadout/components/ControlsTable'
import { StatBar } from '~app/loadout/components/StatBar'
import './LoadoutScreen.css'

interface LoadoutScreenProps {
  speedPoints: number
  onSpeedPointsChange: (speedPoints: number) => void
  onStart: () => void
}

/** The loadout screen (game-spec 7). */
export function LoadoutScreen({ speedPoints, onSpeedPointsChange, onStart }: LoadoutScreenProps) {
  useLoadoutKeys({
    onStep: (delta) => onSpeedPointsChange(clampPoints(speedPoints + delta)),
    onStart,
  })

  return (
    <div className="loadout">
      <h1 className="loadout__heading">LOADOUT</h1>
      <p className="loadout__rule">10 POINTS · SPEND ONE, LOSE THE OTHER</p>
      <div className="loadout__stats">
        <div className="loadout__stat loadout__stat--speed">
          <StatBar label="SPEED" percent={speedPercent(speedPoints)} />
        </div>
        <div className="loadout__stat loadout__stat--power">
          <StatBar label="POWER" percent={powerPercent(speedPoints)} />
        </div>
      </div>
      <div className="loadout__slider-row">
        <span className="loadout__slider-end">POWER</span>
        <input
          className="loadout__slider"
          type="range"
          min="0"
          max="10"
          step="1"
          value={speedPoints}
          aria-label="Points spent on speed"
          onChange={(event) => onSpeedPointsChange(clampPoints(Number(event.currentTarget.value)))}
        />
        <span className="loadout__slider-end">SPEED</span>
      </div>
      <div className="loadout__controls">
        <ControlsTable />
      </div>
      <button className="loadout__start" type="button" onClick={onStart}>
        START
      </button>
    </div>
  )
}
