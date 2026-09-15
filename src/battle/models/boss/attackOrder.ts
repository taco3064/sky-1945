export type BossAttack = 'straight' | 'spread' | 'radial' | 'beam' | 'ram';

/** 15 weighted entries, in exactly this order (game-spec 12.9.7). */
const WEIGHTED: readonly BossAttack[] = [
  'straight',
  'straight',
  'spread',
  'spread',
  'radial',
  'radial',
  'beam',
  'beam',
  'beam',
  'beam',
  'ram',
  'ram',
  'ram',
  'ram',
  'ram',
];

const PATTERNS: readonly BossAttack[] = ['straight', 'spread', 'radial'];

/** Unsigned 32-bit hash; `×` and `+` wrap modulo 2³², `>>` is logical. */
export function attackHash(seed: number, n: number): number {
  const a = (Math.imul(seed, 374761393) + Math.imul(n, 668265263)) >>> 0;
  const b = Math.imul(a ^ (a >>> 13), 1274126177) >>> 0;

  return (b ^ (b >>> 16)) >>> 0;
}

/** Beam and ram ask the player to move rather than to shoot. */
function isPositional(attack: BossAttack): boolean {
  return attack === 'beam' || attack === 'ram';
}

function raw(seed: number, index: number): BossAttack {
  return WEIGHTED[attackHash(seed, index) % WEIGHTED.length];
}

function fallback(seed: number, index: number): BossAttack {
  return PATTERNS[attackHash(seed, index + WEIGHTED.length) % PATTERNS.length];
}

/**
 * The attack at `index` for `seed`: never two beams in a row, at most three positional
 * attacks in a row. Both checks read the raw draws of earlier indices.
 */
export function attackAt(seed: number, index: number): BossAttack {
  const attack = raw(seed, index);

  if (!isPositional(attack)) {
    return attack;
  }

  if (attack === 'beam' && index >= 1 && raw(seed, index - 1) === 'beam') {
    return fallback(seed, index);
  }

  if (index >= 3 && [1, 2, 3].every((back) => isPositional(raw(seed, index - back)))) {
    return fallback(seed, index);
  }

  return attack;
}
