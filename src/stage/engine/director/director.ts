import type { EnemyKind } from '../entities';
import { edgeFor, entryFor, pathFor } from '../paths';
import type { Director, RoundPhase, ScheduledSquad, Spawn, Wave } from './types';

/** Seconds between one wave and the next. */
const WAVE_GAP = 2.75;

/** The shape of a round, in order. Fixed across rounds so it stays learnable. */
const WAVE_KINDS: EnemyKind[] = ['small', 'small', 'medium', 'large'];

/** Concurrency ceilings, from the DOM-node cost of each silhouette. */
const MAX_PER_WAVE: Record<EnemyKind, number> = { small: 16, medium: 8, large: 4 };

/** How many of a kind arrive in a given round. */
function countFor(kind: EnemyKind, round: number): number {
  const base = { small: 8, medium: 4, large: 2 }[kind];
  const growth = Math.floor((round - 1) / 2) * 2;

  return Math.min(base + growth, MAX_PER_WAVE[kind]);
}

/** How many craft fly together as one squad. */
const SQUAD_SIZE = 4;

/** Seconds between one squad of a wave and the next. */
export const SQUAD_STAGGER = 0.7;

/** How many squads a count of craft splits into. */
function squadCount(total: number): number {
  return Math.max(1, Math.ceil(total / SQUAD_SIZE));
}

/** How many craft this squad gets. The remainder goes to the earliest squads. */
function shareOf(total: number, squads: number, index: number): number {
  return Math.floor(total / squads) + (index < total % squads ? 1 : 0);
}

/** Lanes for one squad, inside the band of the field it owns. A lane is 0–1. */
function squadLanes(squad: number, squads: number, count: number): number[] {
  const band = 1 / squads;
  const step = band / (count + 1);

  return Array.from(
    { length: count },
    (_unused, index) => squad * band + step * (index + 1),
  );
}

/** Every squad of a round, in order — the schedule the director actually runs. */
export function squadsForRound(round: number): ScheduledSquad[] {
  const scheduled: ScheduledSquad[] = [];
  let slot = 0;

  for (const [index, wave] of wavesForRound(round).entries()) {
    const squads = squadCount(wave.count);

    for (let squad = 0; squad < squads; squad += 1) {
      scheduled.push({
        at: index * WAVE_GAP + squad * SQUAD_STAGGER,
        kind: wave.kind,
        path: pathFor(round, slot),
        edge: edgeFor(round, slot),
        lanes: squadLanes(squad, squads, shareOf(wave.count, squads, squad)),
      });

      slot += 1;
    }
  }

  return scheduled;
}

/** Every wave of a round, derived rather than authored. */
export function wavesForRound(round: number): Wave[] {
  return WAVE_KINDS.map((kind, index) => ({
    at: index * WAVE_GAP,
    kind,
    count: countFor(kind, round),
  }));
}

export function createDirector(): Director {
  let round = 1;
  let squads = squadsForRound(round);
  let clock = 0;
  let sent = 0;
  let phase: RoundPhase = 'waves';

  return {
    advance(elapsed) {
      const due: Spawn[] = [];

      // Nothing new arrives during the boss: see #8.
      if (phase === 'boss') {
        return due;
      }

      clock += elapsed;

      while (sent < squads.length && squads[sent].at <= clock) {
        const squad = squads[sent];

        due.push(...squad.lanes.map((lane): Spawn => ({
          kind: squad.kind,
          path: squad.path,
          edge: squad.edge,
          entry: entryFor(squad.edge, squad.path, lane),
        })));

        sent += 1;
      }

      return due;
    },

    round: () => round,

    phase: () => phase,

    isDrained: () => sent >= squads.length,

    beginBoss() {
      phase = 'boss';
    },

    nextRound() {
      round += 1;
      squads = squadsForRound(round);
      clock = 0;
      sent = 0;
      phase = 'waves';
    },
  };
}
