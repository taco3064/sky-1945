/** How big, which is also how many shards. */
export type BurstSize = 'small' | 'large';

/** Whose wreckage — decides the palette, nothing else. */
export type BurstTone = 'ally' | 'enemy';

export interface BurstRecord {
  id: number;
  size: BurstSize;
  tone: BurstTone;
}

export interface BurstStyle {
  size: BurstSize;
  tone: BurstTone;
}

export interface BurstPlacement {
  id: number;
  x: number;
  y: number;
}

export interface EffectField {
  /** Start a burst at a point. */
  burst: (at: { x: number; y: number }, style: BurstStyle) => void;
  /** Age everything; drop what has finished. True if anything finished. */
  advance: (elapsed: number) => boolean;
  /** Live bursts, for the roster. */
  records: () => BurstRecord[];
  /** Where each one is, for publishing transforms. */
  placements: () => BurstPlacement[];
  clear: () => void;
}

export interface Burst extends BurstRecord, BurstPlacement {
  remaining: number;
}
