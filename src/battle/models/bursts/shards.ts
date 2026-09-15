import type { BurstSize } from './burst';

export interface Shard {
  dx: number;
  dy: number;
  /** Degrees. */
  spin: number;
}

/** Shard directions in paint order (game-spec 10.4). */
const SHARDS: readonly Shard[] = [
  { dx: -0.9, dy: -0.5, spin: 210 },
  { dx: 0.8, dy: -0.7, spin: -260 },
  { dx: 0.95, dy: 0.45, spin: 180 },
  { dx: -0.2, dy: 1, spin: -140 },
  { dx: -0.85, dy: 0.6, spin: 300 },
  { dx: 0.25, dy: -1, spin: -190 },
  { dx: -0.55, dy: -0.85, spin: 240 },
  { dx: 0.6, dy: 0.8, spin: -220 },
  { dx: 1, dy: -0.15, spin: 160 },
  { dx: -1, dy: 0.1, spin: -300 },
];

const SHARD_COUNT: Record<BurstSize, number> = { small: 6, large: 10 };

/** A small burst has shards 1–6, a large one 1–10. */
export function burstShards(size: BurstSize): readonly Shard[] {
  return SHARDS.slice(0, SHARD_COUNT[size]);
}
