export interface FighterProps {
  /** The engine's id. A plain number: `components` cannot import `engine`. */
  id: number;
  /** True while a barrel roll is running. */
  rolling?: boolean;
  /** True while the aircraft cannot be hit. Drawn as a blink, never as invisible. */
  invulnerable?: boolean;
  /** False while the roll is recovering. Drawn on the thrust, so the refusal shows. */
  ready?: boolean;
}
