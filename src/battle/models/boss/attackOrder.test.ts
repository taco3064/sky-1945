import { expect, it } from 'vitest';
import { attackAt, attackHash } from './attackOrder';

// game-spec 14.6: attack index 0 → 9, then 10 → 19
const SEQUENCES: [number, [string, string]][] = [
  [0, [
    'straight straight ram ram beam straight spread straight straight straight',
    'beam radial radial beam ram beam straight radial straight spread',
  ]],
  [1, [
    'ram straight ram straight radial radial ram straight spread ram',
    'ram radial ram spread beam ram beam spread straight ram',
  ]],
  [42, [
    'straight beam ram spread radial beam radial beam straight spread',
    'beam ram beam spread straight straight ram ram straight beam',
  ]],
  [123456789, [
    'ram beam radial spread ram ram ram radial radial beam',
    'ram radial ram ram straight ram ram ram spread ram',
  ]],
  [3735928559, [
    'ram ram radial ram ram radial beam ram straight ram',
    'ram spread beam ram beam radial spread straight beam spread',
  ]],
  [4294967294, [
    'beam straight beam spread straight ram beam ram spread radial',
    'beam radial ram beam straight radial ram beam straight straight',
  ]],
];

it.each(SEQUENCES)('seed %i produces the game-spec 14.6 sequence', (seed, halves) => {
  const attacks = Array.from({ length: 20 }, (_, index) => attackAt(seed, index));

  expect(attacks.join(' ')).toBe(halves.join(' '));
});

it('hashes to unsigned 32-bit integers', () => {
  for (const [seed] of SEQUENCES) {
    for (let n = 0; n < 40; n++) {
      const hash = attackHash(seed, n);

      expect(Number.isInteger(hash) && hash >= 0 && hash <= 0xffffffff).toBe(true);
    }
  }
});

it('never plays two beams in a row nor four positional attacks in a row', () => {
  for (let seed = 0; seed < 300; seed++) {
    const attacks = Array.from({ length: 60 }, (_, index) => attackAt(seed, index));
    const positional = attacks.map((attack) => attack === 'beam' || attack === 'ram');

    attacks.forEach((attack, index) => {
      if (index >= 1) {
        expect(attack === 'beam' && attacks[index - 1] === 'beam').toBe(false);
      }

      if (index >= 3) {
        expect(positional.slice(index - 3, index + 1).every(Boolean)).toBe(false);
      }
    });
  }
});
