/** What the aircraft is doing, as opposed to where it is. */
export interface CombatSnapshot {
  rolling: boolean;
  invulnerable: boolean;
  /** False during the recovery after a roll, when another is refused. */
  ready: boolean;
}

export interface Combat {
  /** Time until which the player cannot be hit. Writers take the later, never the sum. */
  invulnerableUntil: number;
  /** Time until which the roll itself is running. Respawn never touches it. */
  rollingUntil: number;
  /** Time until which a new roll is refused. Always `rollingUntil + ROLL_COOLDOWN`. */
  readyAt: number;
}
