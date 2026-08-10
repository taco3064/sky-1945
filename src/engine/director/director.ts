import type { EnemyKind } from '../entities';
import type { Point } from '../field';
import { entryFor, pathFor } from '../paths';
import type { PathKind } from '../paths';

/**
 * What arrives, and when.
 *
 * The director schedules and nothing else. It does not know how an enemy
 * moves, what it fires, or how hard it hits — those come from the enemy's own
 * stats and from the round's boosts. That division is what keeps this module
 * small: "round 7 is harder" is a function of 7, not a seventh table.
 */

/** Seconds between one wave and the next. */
const WAVE_GAP = 5.5;

/**
 * The shape of a round, in order.
 *
 * Fixed across rounds on purpose — the *rhythm* of a round should be
 * learnable, and what changes with the round number is how many arrive and
 * how hard they hit. A player who cannot predict the shape is not being
 * challenged, only surprised.
 */
const WAVE_KINDS: EnemyKind[] = ['small', 'small', 'medium', 'large'];

/** Concurrency ceilings, from the DOM-node cost of each silhouette. */
const MAX_PER_WAVE: Record<EnemyKind, number> = { small: 8, medium: 4, large: 2 };

/** How many of a kind arrive in a given round. */
function countFor(kind: EnemyKind, round: number): number {
  const base = { small: 4, medium: 2, large: 1 }[kind];
  const growth = Math.floor((round - 1) / 2);

  return Math.min(base + growth, MAX_PER_WAVE[kind]);
}

/**
 * Lanes for a wave, evenly spread and clear of both ends.
 *
 * A lane is 0–1 and the path decides what it means — so the director never has
 * to know the coordinate system, or which paths come in from a side at all.
 */
function lanes(count: number): number[] {
  const step = 1 / (count + 1);

  return Array.from({ length: count }, (_unused, index) => step * (index + 1));
}

export interface Spawn {
  kind: EnemyKind;
  /** Which trajectory it flies. One per wave, so a wave reads as one intent. */
  path: PathKind;
  /** Where it comes in, decided by the path from its lane. */
  entry: Point;
}

export interface Wave {
  /** Seconds into the round when it arrives. */
  at: number;
  kind: EnemyKind;
  count: number;
}

/** Every wave of a round, derived rather than authored. */
export function wavesForRound(round: number): Wave[] {
  return WAVE_KINDS.map((kind, index) => ({
    at: index * WAVE_GAP,
    kind,
    count: countFor(kind, round),
  }));
}

export interface Director {
  /** Advance the clock; returns what to put on the field this frame. */
  advance: (elapsed: number) => Spawn[];
  /** Current round, 1-based. */
  round: () => number;
  /** True once every wave of this round has been sent. */
  isDrained: () => boolean;
  /** Begin the next round. */
  nextRound: () => void;
}

export function createDirector(): Director {
  let round = 1;
  let waves = wavesForRound(round);
  let clock = 0;
  let sent = 0;

  return {
    advance(elapsed) {
      const due: Spawn[] = [];

      clock += elapsed;

      while (sent < waves.length && waves[sent].at <= clock) {
        const wave = waves[sent];
        const path = pathFor(round, sent);

        due.push(...lanes(wave.count).map((lane): Spawn => ({
          kind: wave.kind,
          path,
          entry: entryFor(path, lane),
        })));

        sent += 1;
      }

      return due;
    },

    round: () => round,

    isDrained: () => sent >= waves.length,

    nextRound() {
      round += 1;
      waves = wavesForRound(round);
      clock = 0;
      sent = 0;
    },
  };
}
