import './StatBar.css';

interface StatBarProps {
  label: string;
  percent: number;
}

/** One loadout stat (game-spec 7.2); the hue comes from the wrapper's `color`. */
export function StatBar({ label, percent }: StatBarProps) {
  return (
    <div className="stat-bar">
      <span className="stat-bar__label">{label}</span>
      <div className="stat-bar__track">
        <div className="stat-bar__fill" style={{ transform: `scaleX(${(percent - 100) / 100})` }} />
      </div>
      <span className="stat-bar__value">
        {percent}
        %
      </span>
    </div>
  );
}
