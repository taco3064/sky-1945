import type { CSSProperties } from 'react'
import './SpeedLines.css'

type SpeedLinesProps = {
  /** The loadout speed multiplier. */
  pace: number
}

export function SpeedLines({ pace }: SpeedLinesProps) {
  return (
    <div className="speed-lines" aria-hidden="true" style={{ '--pace': pace } as CSSProperties}>
      <div className="speed-lines-far" />
      <div className="speed-lines-near" />
    </div>
  )
}
