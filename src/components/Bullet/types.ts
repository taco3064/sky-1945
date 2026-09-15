export interface BulletProps {
  /** The engine's id for this bullet. */
  id: number;
  /** Enemy fire. A boolean, not a side name — this only decides which way to draw. */
  hostile?: boolean;
}
