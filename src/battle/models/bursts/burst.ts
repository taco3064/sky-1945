/** Palette: ally for the player, enemy for enemies and the boss (game-spec 10.4). */
export type BurstTone = 'ally' | 'enemy';

/** small for enemy aircraft; large for the boss and the player. */
export type BurstSize = 'small' | 'large';

/** A burst exists for the scatter duration of simulated time, then is removed. */
export const BURST_LIFETIME = 0.6;

export interface Burst {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly tone: BurstTone;
  readonly size: BurstSize;
  age: number;
}

/** Where a burst appears and how it looks. */
export type BurstSpec = Omit<Burst, 'id' | 'age'>;

export function createBurst(id: number, spec: BurstSpec): Burst {
  return { id, ...spec, age: 0 };
}

/** Ages a burst by `dt`; returns true once it is finished. */
export function ageBurst(burst: Burst, dt: number): boolean {
  burst.age += dt;

  return burst.age >= BURST_LIFETIME;
}
