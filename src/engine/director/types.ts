import type { EnemySpec } from '../enemies';
import type { EnemyKind } from '../entities';
import type { Edge, PathKind } from '../paths';

/** What the director produces, which is exactly what the enemy field consumes. */
export type Spawn = EnemySpec;

export interface Wave {
  /** Seconds into the round when it arrives. */
  at: number;
  kind: EnemyKind;
  count: number;
}

/** One squad, with everything about it decided except when it is sent. */
export interface ScheduledSquad {
  /** Seconds into the round when it arrives. */
  at: number;
  kind: EnemyKind;
  /** The shape every craft in it flies. */
  path: PathKind;
  /** The edge every craft in it comes in from. */
  edge: Edge;
  /** Where its members sit inside the band of the field it owns. */
  lanes: number[];
}

/** Which half of a round is running. */
export type RoundPhase = 'waves' | 'boss';

export interface Director {
  /** Advance the clock; returns what to put on the field this frame. */
  advance: (elapsed: number) => Spawn[];
  /** Current round, 1-based. */
  round: () => number;
  /** Which half of the round is running. */
  phase: () => RoundPhase;
  /** True once every squad of this round has been sent. */
  isDrained: () => boolean;
  /** The waves are done; the boss is the rest of the round. */
  beginBoss: () => void;
  /** Begin the next round, back at its waves. */
  nextRound: () => void;
}
