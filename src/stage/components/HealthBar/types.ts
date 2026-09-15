export interface HealthBarProps {
  /** Hit points left. */
  hp: number;
  /** What it started with, which is what the bar is a fraction of. */
  maxHp: number;
  /** True while the boss is winding up its beam. */
  aiming?: boolean;
  /** True while the boss is still flying in and cannot be hurt. */
  shielded?: boolean;
}
