import './LifeIcon.css';

/** ALLY-01 reduced to two parts for the HUD (game-spec 9.2). */
export function LifeIcon() {
  return (
    <span className="life-icon">
      <span className="life-icon__wing" />
      <span className="life-icon__body" />
    </span>
  );
}
