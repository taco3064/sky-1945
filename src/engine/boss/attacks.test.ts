import { describe, expect, it } from 'vitest';

import {
  ALL_ATTACKS,
  RECOVER_SECONDS,
  attackAt,
  cadenceOf,
  cycleOf,
  durationOf,
  rollAttackSeed,
  windUpOf,
} from './attacks';
import type { BossAttack } from './types';

/** The three the trash mobs also fire. Restated, so dropping one turns red. */
const SHAPED: BossAttack[] = ['straight', 'spread', 'radial'];

/** The boss's own two: neither fires a bullet. */
const COMMITTED: BossAttack[] = ['beam', 'ram'];

describe('attacks · every attack is fully specified', () => {
  // One contract per member: an attack with a missing timing would divide the
  // fight by zero or fire forever, and only its own case would catch it.
  it.each(ALL_ATTACKS)('%s has a wind-up, a duration and a cycle', (attack) => {
    expect(windUpOf(attack)).toBeGreaterThan(0);
    expect(durationOf(attack)).toBeGreaterThan(0);
    expect(cycleOf(attack)).toBe(windUpOf(attack) + durationOf(attack) + RECOVER_SECONDS);
  });

  it('lists exactly the three shapes plus its own two', () => {
    expect(ALL_ATTACKS).toEqual([...SHAPED, ...COMMITTED]);
  });

  // The number that makes the fight fair rather than the one that makes it
  // easy: long enough to see, recognise, and answer with a roll.
  it('gives the beam the longest tell of them all', () => {
    const others = SHAPED.map(windUpOf);

    expect(windUpOf('beam')).toBeGreaterThan(Math.max(...others));
    expect(windUpOf('beam')).toBeGreaterThan(windUpOf('ram'));
  });

  /*
   * The ram's tell is longer than any shaped attack's, because the answer is
   * different in kind: a spread asks the player to shift, and a ram asks them to
   * *not be in a column*. Moving that far takes longer than flinching.
   */
  it('gives the ram a longer tell than any of the shapes', () => {
    expect(windUpOf('ram')).toBeGreaterThan(Math.max(...SHAPED.map(windUpOf)));
  });

  it('gives the beam a tell longer than a roll lasts, so one can cover it', () => {
    // ROLL_DURATION is 1.2s. A tell shorter than the roll would mean rolling
    // early and being uncovered when the beam actually lands.
    expect(windUpOf('beam')).toBeGreaterThanOrEqual(1.2);
  });

  it.each(SHAPED)('%s fires repeatedly while it lasts', (attack) => {
    expect(cadenceOf(attack)).toBeGreaterThan(0);
    expect(cadenceOf(attack)).toBeLessThan(durationOf(attack));
  });

  // Neither of these throws bullets — the beam is its own hazard and the ram
  // makes a projectile of the boss — so a cadence would mean nothing.
  it.each(COMMITTED)('gives %s no cadence', (attack) => {
    expect(cadenceOf(attack)).toBe(0);
  });
});

/** One fight's worth of slots, as the derivation names them. */
function sequence(seed: number, slots = 60): BossAttack[] {
  return Array.from({ length: slots }, (_unused, index) => attackAt(seed, index));
}

/**
 * Enough seeds, spread far enough apart, that a rule broken one fight in a
 * hundred still turns this red. The old assertions named the attack at slot
 * three; there is no slot three to name any more, so what is left to hold is
 * what every fight has in common: see #44.
 */
const SEEDS = Array.from({ length: 400 }, (_unused, index) => index * 7919 + 1);

function committedIn(attacks: BossAttack[]): BossAttack[] {
  return attacks.filter((attack) => COMMITTED.includes(attack));
}

/** The slots where this attack follows itself. Slot zero has nothing behind it. */
function backToBack(attacks: BossAttack[], attack: BossAttack): number[] {
  return attacks
    .map((_unused, index) => index)
    .filter((index) => attacks[index] === attack && attacks[index - 1] === attack);
}

/** The longest run of committed attacks anywhere in a fight. */
function longestRun(attacks: BossAttack[]): number {
  let longest = 0;
  let running = 0;

  for (const attack of attacks) {
    running = COMMITTED.includes(attack) ? running + 1 : 0;
    longest = Math.max(longest, running);
  }

  return longest;
}

describe('attackAt · a seed is a fight, and the same seed is the same fight', () => {
  it('gives the same answer for the same slot, every time', () => {
    for (const seed of SEEDS.slice(0, 8)) {
      expect(sequence(seed)).toEqual(sequence(seed));
    }
  });

  it('only ever names a real attack', () => {
    for (const seed of SEEDS) {
      for (const attack of sequence(seed)) {
        expect(ALL_ATTACKS).toContain(attack);
      }
    }
  });

  // The hash runs past 2^53 before it is folded; `Math.imul` is what keeps it
  // inside 32 bits. Without it the products round and this stops holding.
  it('stays deterministic at the far end of both arguments', () => {
    expect(attackAt(0xfffffff, 9998)).toBe(attackAt(0xfffffff, 9998));
    expect(ALL_ATTACKS).toContain(attackAt(0xfffffff, 9998));
  });
});

describe('attackAt · one fight is not the last one', () => {
  /*
   * The whole point of #44. The order used to come from the round, so every
   * player's round four was one fight, replayed identically however many times
   * they died to it — and the four slots they saw most were the four that never
   * moved.
   */
  it('differs between seeds', () => {
    const distinct = new Set(SEEDS.map((seed) => sequence(seed, 16).join()));

    expect(distinct.size).toBe(SEEDS.length);
  });

  /*
   * A boss whose shapes cycled would let the player start dodging before it
   * moved, which turns every wind-up animation into decoration. Checked as "not
   * a period-3 repeat" because a rotation is what the obvious implementation —
   * index % 3 — would produce.
   */
  it('does not simply rotate through the shapes', () => {
    for (const seed of SEEDS.slice(0, 40)) {
      const attacks = sequence(seed, 30);

      const repeats = attacks
        .filter((attack, index) => index >= 3 && attack === attacks[index - 3]);

      expect(repeats.length).toBeLessThan(attacks.length - 3);
    }
  });

  it('reaches all three shapes within a fight', () => {
    for (const seed of SEEDS) {
      const shapes = sequence(seed).filter((attack) => SHAPED.includes(attack));

      expect(new Set(shapes).size).toBe(SHAPED.length);
    }
  });
});

describe('attackAt · what every seed guarantees', () => {
  /*
   * The beam carries the longest tell in the game at 1.4s. Two of them back to
   * back is most of six seconds spent watching a wind-up, which is the one
   * sequence the draw is not allowed to produce.
   */
  it('never runs two beams back to back', () => {
    for (const seed of SEEDS) {
      expect(backToBack(sequence(seed), 'beam')).toEqual([]);
    }
  });

  /*
   * A shape is the slot the player answers by shooting rather than by moving, so
   * one is never more than four beats away. This is a cap on the run, not a ban
   * on the pair — see the next case, which is the reason it is a cap.
   */
  it('never runs more than three committed attacks together', () => {
    for (const seed of SEEDS) {
      expect(longestRun(sequence(seed))).toBeLessThanOrEqual(3);
    }
  });

  it('does run two rams together, often enough to be a thing that happens', () => {
    const doubled = SEEDS.flatMap((seed) => backToBack(sequence(seed), 'ram'));

    // Roughly one adjacent pair in fourteen slots, across every seed swept.
    expect(doubled.length / (SEEDS.length * 60)).toBeGreaterThan(0.03);
  });

  /*
   * Kept from #26: the fight alternates between "dodge this" and "shoot back"
   * rather than being mostly the second. The run cap is what holds the share
   * down — the bag draws committed attacks more often than this, and the repair
   * gives the difference back.
   */
  it('leaves committed attacks holding between 40% and 60% of the slots', () => {
    const attacks = SEEDS.flatMap((seed) => sequence(seed));
    const share = committedIn(attacks).length / attacks.length;

    expect(share).toBeGreaterThan(0.4);
    expect(share).toBeLessThan(0.6);
  });
});

describe('rollAttackSeed · randomness at the boundary', () => {
  it('rolls a whole number the derivation can take', () => {
    for (let roll = 0; roll < 200; roll += 1) {
      const seed = rollAttackSeed();

      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(ALL_ATTACKS).toContain(attackAt(seed, 0));
    }
  });

  it('does not hand out the same fight twice in a row', () => {
    const rolled = new Set(Array.from({ length: 200 }, () => rollAttackSeed()));

    expect(rolled.size).toBeGreaterThan(190);
  });
});
