import type { CSSProperties } from 'react';
import './SpeedLines.css';

interface SpeedLinesProps {
  /** The loadout speed multiplier. */
  pace: number;
}

/** The only background: two layers of rushing streaks (game-spec 10.5). */
export function SpeedLines({ pace }: SpeedLinesProps) {
  return (
    <div className="speed-lines" aria-hidden="true" style={{ '--pace': pace } as CSSProperties}>
      <div className="speed-lines__layer speed-lines__layer--far" />
      <div className="speed-lines__layer speed-lines__layer--near" />
    </div>
  );
}
