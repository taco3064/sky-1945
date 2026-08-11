/** How big the wreck is. Also how many shards it throws. */
export type BurstSize = 'small' | 'large';

/** Whose wreckage. Decides the palette and nothing else. */
export type BurstTone = 'ally' | 'enemy';

export interface BurstProps {
  /** The engine's id for this burst — negative, since bursts have no body. */
  id: number;
  size: BurstSize;
  tone: BurstTone;
}
