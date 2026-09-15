import type { PatternKind } from '../patterns';
import type { AttackShape, BossAttack } from './types';

/** How long the boss rests between attacks, whichever attack it was. */
export const RECOVER_SECONDS = 0.4;

const SHAPES: Record<BossAttack, AttackShape> = {
  straight: { windUp: 0.45, duration: 1.5, cadence: 0.08 },
  spread: { windUp: 0.6, duration: 1.4, cadence: 0.25 },
  radial: { windUp: 0.7, duration: 1.2, cadence: 0.28 },
  beam: { windUp: 1.4, duration: 1.1, cadence: 0 },
  ram: { windUp: 1, duration: 1.3, cadence: 0 },
};

/** Every attack the boss has, in one place so a test can sweep them. */
export const ALL_ATTACKS: BossAttack[] = ['straight', 'spread', 'radial', 'beam', 'ram'];

/** Seconds of tell this attack opens with. */
export function windUpOf(attack: BossAttack): number {
  return SHAPES[attack].windUp;
}

/** Seconds this attack runs once the tell is over. */
export function durationOf(attack: BossAttack): number {
  return SHAPES[attack].duration;
}

/** Seconds between volleys while it fires. */
export function cadenceOf(attack: BossAttack): number {
  return SHAPES[attack].cadence;
}

/** One full attack, tell through to rest. */
export function cycleOf(attack: BossAttack): number {
  return windUpOf(attack) + durationOf(attack) + RECOVER_SECONDS;
}

/** The shapes the trash mobs also fire. The slot a player shoots back on. */
const SHAPED: PatternKind[] = ['straight', 'spread', 'radial'];

/** The two that ask the player to be somewhere else, rather than to shoot. */
const COMMITTED: BossAttack[] = ['beam', 'ram'];

/** How many of the bag's slots each attack holds. The one line to tune: see #44. */
const WEIGHTS: Record<BossAttack, number> = {
  beam: 4,
  ram: 5,
  straight: 2,
  spread: 2,
  radial: 2,
};

/** The bag every slot is drawn from, one entry per unit of weight. */
const BAG: BossAttack[] = ALL_ATTACKS.flatMap(
  (attack) => Array.from({ length: WEIGHTS[attack] }, () => attack),
);

/** A 32-bit integer hash of the duel's seed and the attack's index. */
function mix(seed: number, index: number): number {
  const seeded = Math.imul(seed, 374761393) + Math.imul(index, 668265263);
  const stirred = Math.imul(seeded ^ (seeded >>> 13), 1274126177);

  return (stirred ^ (stirred >>> 16)) >>> 0;
}

/** The raw draw for a slot, before either constraint has had a say. */
function drawAt(seed: number, index: number): BossAttack {
  return BAG[mix(seed, index) % BAG.length];
}

/** What an earlier slot drew, or null when the fight has not reached back that far. */
function drawnBefore(seed: number, index: number, back: number): BossAttack | null {
  return index >= back ? drawAt(seed, index - back) : null;
}

function isCommitted(attack: BossAttack | null): boolean {
  return attack !== null && COMMITTED.includes(attack);
}

/** The longest run of committed attacks allowed. A shape is the slot to shoot on. */
const COMMITTED_RUN = 3;

/** Whether the run leading into this slot is already as long as one may get. */
function runIsFull(seed: number, index: number): boolean {
  return Array.from(
    { length: COMMITTED_RUN },
    (_unused, back) => drawnBefore(seed, index, back + 1),
  ).every(isCommitted);
}

/*
 * Drawn off an index the bag itself is not using here, so the fallback does not
 * inherit the residue that put this slot in the committed range to begin with.
 */
function shapeAt(seed: number, index: number): BossAttack {
  return SHAPED[mix(seed, index + BAG.length) % SHAPED.length];
}

/*
 * Which attack this slot is. Derived from the duel's seed, so a fight can be
 * replayed exactly, and rolled per duel, so it is not everyone's fight: see #44.
 *
 * Both repairs read the raw draws and never the repaired ones, which keeps this
 * a constant-time answer rather than a walk back to the first slot. The
 * guarantees survive that because a repair only ever falls back to a shape: a
 * committed answer is therefore always the slot's own draw.
 */
export function attackAt(seed: number, index: number): BossAttack {
  const drawn = drawAt(seed, index);

  if (!isCommitted(drawn)) {
    return drawn;
  }

  // Six seconds of the fight spent watching a wind-up, if two of these ran back to back.
  if (drawn === 'beam' && drawnBefore(seed, index, 1) === 'beam') {
    return shapeAt(seed, index);
  }

  // Two rams back to back is the point of this being a run and not a ban.
  if (runIsFull(seed, index)) {
    return shapeAt(seed, index);
  }

  return drawn;
}

/** A seed for a fresh duel. Randomness at the boundary, arithmetic inside. */
export function rollAttackSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}
