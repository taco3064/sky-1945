import type { EnemySpec } from '../enemies';
import type { EnemyKind } from '../entities';
import { edgeFor, entryFor, pathFor } from '../paths';
import type { Edge, PathKind } from '../paths';

/**
 * What arrives, and when.
 *
 * The director schedules and nothing else. It does not know how an enemy
 * moves, what it fires, or how hard it hits — those come from the enemy's own
 * stats and from the round's boosts. That division is what keeps this module
 * small: "round 7 is harder" is a function of 7, not a seventh table.
 */

/**
 * Seconds between one wave and the next.
 *
 * Halved from 5.5 along with a doubling of the counts below: a round used to
 * hand the player one clump at a time with room to breathe between them, which
 * read as a queue rather than as pressure. Two waves now overlap on the field.
 */
const WAVE_GAP = 2.75;

/**
 * The shape of a round, in order.
 *
 * Fixed across rounds on purpose — the *rhythm* of a round should be
 * learnable, and what changes with the round number is how many arrive and
 * how hard they hit. A player who cannot predict the shape is not being
 * challenged, only surprised.
 */
const WAVE_KINDS: EnemyKind[] = ['small', 'small', 'medium', 'large'];

/**
 * Concurrency ceilings, from the DOM-node cost of each silhouette.
 *
 * Doubled with the counts. At the ceiling this is 16 small craft at three
 * elements each, eight medium at five, and four heavies at six — around 130
 * elements of aircraft before a single bullet, where the old ceiling was 62.
 * #11 is where that gets measured on a phone; the numbers are a play decision
 * and the measurement is a separate one.
 */
const MAX_PER_WAVE: Record<EnemyKind, number> = { small: 16, medium: 8, large: 4 };

/**
 * How many of a kind arrive in a given round.
 *
 * Doubled throughout — base, growth and ceiling — so the shape of the curve is
 * unchanged and only its scale moved. Halving `WAVE_GAP` at the same time is
 * what makes it read as density rather than as a longer round.
 */
function countFor(kind: EnemyKind, round: number): number {
  const base = { small: 8, medium: 4, large: 2 }[kind];
  const growth = Math.floor((round - 1) / 2) * 2;

  return Math.min(base + growth, MAX_PER_WAVE[kind]);
}

/**
 * How many craft fly together as one squad.
 *
 * A wave used to be one row on one path, which stopped working the moment the
 * counts doubled: sixteen craft abreast is a wall with no gaps, every one of them
 * doing the same thing, and the outermost lanes were pressed against the edges.
 *
 * Four is small enough that a squad reads as a *shape* — you can see three craft
 * weaving on the left while four dive down the middle — and large enough that
 * splitting a wave does not just produce sixteen squads of one.
 */
const SQUAD_SIZE = 4;

/**
 * Seconds between one squad of a wave and the next.
 *
 * Squads used to arrive together, which made a wave one event however many
 * formations it was split into — three shapes appearing at the same instant read
 * as noise rather than as three decisions. Staggered, the player sees the first
 * one commit before the second is on screen.
 *
 * Short enough that a wave still reads as one wave: four squads span 2.1s against
 * the 2.75s until the next wave begins.
 */
export const SQUAD_STAGGER = 0.7;

/** How many squads a count of craft splits into. */
function squadCount(total: number): number {
  return Math.max(1, Math.ceil(total / SQUAD_SIZE));
}

/**
 * How many craft this squad gets.
 *
 * The remainder goes to the earliest squads, so nine craft are 3/3/3 rather than
 * 4/4/1 — a squad of one is not a formation.
 */
function shareOf(total: number, squads: number, index: number): number {
  return Math.floor(total / squads) + (index < total % squads ? 1 : 0);
}

/**
 * Lanes for one squad, inside the slice of the field it owns.
 *
 * Each squad gets its own band across the width, so two squads on two paths can
 * fly at once without crossing through each other. A lane is 0–1 and the path
 * decides what it means — so the director still never learns the coordinate
 * system, or which paths come in from a side, or how much room each needs.
 */
function squadLanes(squad: number, squads: number, count: number): number[] {
  const band = 1 / squads;
  const step = band / (count + 1);

  return Array.from(
    { length: count },
    (_unused, index) => squad * band + step * (index + 1),
  );
}

/**
 * What the director produces, which is exactly what the enemy field consumes.
 *
 * An alias rather than a second declaration: the scheduler's output and the
 * field's input are one contract, and writing it twice is how the two drift.
 */
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

/**
 * Every squad of a round, in order — the schedule the director actually runs.
 *
 * Squads rather than waves, and that replaced a nested loop with a flat list. A
 * wave is still the unit the *counts* are derived from, but it is not the unit
 * anything arrives in: its squads come in one after another, `SQUAD_STAGGER`
 * apart, so two formations are on the field together with one already committed
 * by the time the next appears.
 *
 * The running `slot` is what feeds `pathFor` and `edgeFor`. Consecutive slots draw
 * consecutive shapes and edges, so the squads of one wave differ from each other
 * — and some of them come in from the sides — instead of all sharing the wave's
 * one dive from the top.
 */
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

/**
 * Which half of a round is running.
 *
 * A round used to end when its last wave had been sent and the field was clear.
 * The boss (#8) splits that in two: the same condition now ends the *waves* and
 * summons the boss, and only the boss's death ends the round. Without a phase,
 * the frame would have to infer which of the two "the field is clear" meant, and
 * it would infer wrong on the frame between the last mob dying and the boss
 * arriving.
 */
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

export function createDirector(): Director {
  let round = 1;
  let squads = squadsForRound(round);
  let clock = 0;
  let sent = 0;
  let phase: RoundPhase = 'waves';

  return {
    advance(elapsed) {
      const due: Spawn[] = [];

      // Nothing new arrives during the boss. Mobs on top of it would hide the
      // one thing the fight is about — reading the boss's tell.
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
