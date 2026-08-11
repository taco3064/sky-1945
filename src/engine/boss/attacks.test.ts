import { describe, expect, it } from 'vitest';

import {
  ALL_ATTACKS,
  RECOVER_SECONDS,
  attackAt,
  cadenceOf,
  cycleOf,
  durationOf,
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

describe('attackAt · the committed attacks are scheduled', () => {
  it('comes every fourth attack', () => {
    const beams = Array.from({ length: 24 }, (_unused, index) => index)
      .filter((index) => attackAt(1, index) === 'beam');

    expect(beams).toEqual([3, 7, 11, 15, 19, 23]);
  });

  // Predictability is the gift here, not the flaw: the beam demands a specific
  // answer at a specific moment, so knowing roughly when it is due is what lets
  // a player hold the roll for it.
  it('keeps the same schedule in every round', () => {
    for (const round of [1, 4, 9]) {
      expect(attackAt(round, 3)).toBe('beam');
      expect(attackAt(round, 7)).toBe('beam');
    }
  });
});

describe('attackAt · the shapes are derived, not drawn', () => {
  it('gives the same answer for the same attack, every time', () => {
    for (const round of [1, 2, 5, 11]) {
      for (let index = 0; index < 12; index += 1) {
        expect(attackAt(round, index)).toBe(attackAt(round, index));
      }
    }
  });

  it('only ever names a real attack', () => {
    for (let round = 1; round <= 12; round += 1) {
      for (let index = 0; index < 20; index += 1) {
        expect(ALL_ATTACKS).toContain(attackAt(round, index));
      }
    }
  });

  it('uses all three shapes within a single fight', () => {
    const shapes = Array.from({ length: 24 }, (_unused, index) => attackAt(1, index))
      .filter((attack) => !COMMITTED.includes(attack));

    expect(new Set(shapes).size).toBe(SHAPED.length);
  });

  /*
   * The two scheduled attacks run on different periods so they cannot arrive
   * together, and where their cycles do meet the beam wins — a player already
   * dodging a column has somewhere to be, where a ram at the same moment would
   * leave nowhere.
   */
  it('never lets the beam and the ram fall on the same attack', () => {
    const rams: number[] = [];
    const beams: number[] = [];

    for (let index = 0; index < 60; index += 1) {
      const attack = attackAt(1, index);

      if (attack === 'ram') {
        rams.push(index);
      }

      if (attack === 'beam') {
        beams.push(index);
      }
    }

    expect(rams.length).toBeGreaterThan(0);
    expect(beams.length).toBeGreaterThan(0);
    expect(rams.filter((index) => beams.includes(index))).toEqual([]);
  });

  /*
   * Every third attack, minus the one in twelve where the beam takes the slot.
   * Four and three are coprime on purpose: at four and six they would share every
   * twelfth attack, and since the beam wins the tie, half the rams would never
   * happen at all.
   */
  it('brings the ram round on its own period', () => {
    const rams = Array.from({ length: 40 }, (_unused, index) => index)
      .filter((index) => attackAt(1, index) === 'ram');

    expect(rams).toEqual([2, 5, 8, 14, 17, 20, 26, 29, 32, 38]);
  });

  /*
   * Half the slots are a committed attack now, which is the point of raising the
   * ram's frequency: the fight alternates between "dodge this" and "shoot back"
   * rather than being mostly the second.
   */
  it('puts a committed attack in about half the slots', () => {
    const committed = Array.from({ length: 48 }, (_unused, index) => attackAt(1, index))
      .filter((attack) => COMMITTED.includes(attack));

    expect(committed.length / 48).toBeGreaterThan(0.4);
    expect(committed.length / 48).toBeLessThan(0.6);
  });

  /*
   * The point of the hash. A boss whose shapes cycled would let the player
   * start dodging before it moved, which turns every wind-up animation into
   * decoration.
   *
   * Checked as "not a period-3 repeat" because a plain rotation is what the
   * obvious implementation — index % 3 — would produce.
   */
  it('does not simply rotate through the shapes', () => {
    const shapes = Array.from({ length: 30 }, (_unused, index) => attackAt(4, index));

    const repeats = shapes
      .filter((attack, index) => index >= 3 && attack === shapes[index - 3]);

    expect(repeats.length).toBeLessThan(shapes.length - 3);
  });

  it('differs between rounds, so a fight is not the previous one again', () => {
    const first = Array.from({ length: 16 }, (_unused, index) => attackAt(1, index));
    const later = Array.from({ length: 16 }, (_unused, index) => attackAt(7, index));

    expect(later).not.toEqual(first);
  });

  // The hash runs past 2^53 before it is folded; `Math.imul` is what keeps it
  // inside 32 bits. Without it the products round and this stops holding.
  it('stays deterministic at high round and attack numbers', () => {
    expect(attackAt(9999, 9998)).toBe(attackAt(9999, 9998));
    expect(ALL_ATTACKS).toContain(attackAt(9999, 9998));
  });
});
