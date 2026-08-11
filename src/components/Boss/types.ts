/** What the boss is doing. A plain union — components do not read engine types. */
export type BossPose = 'entering' | 'winding' | 'firing' | 'recovering';

/** Which attack it is on. */
export type BossMove = 'straight' | 'spread' | 'radial' | 'beam';

export interface BossProps {
  /** The engine's id for the boss body. */
  id: number;
  pose: BossPose;
  /** Absent while it is still flying in. */
  move?: BossMove;
  /** How large this one was rolled, as a multiple of the drawing's own size. */
  size?: number;
}
