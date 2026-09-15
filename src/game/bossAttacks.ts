export type BossAttack = 'straight' | 'spread' | 'radial' | 'beam' | 'ram'

/** Weighted draw list, in exactly this order. */
const WEIGHTED: BossAttack[] = [
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
]

/** Fallback draw list for a rejected raw draw. */
const PATTERNS: BossAttack[] = ['straight', 'spread', 'radial']

/** Attacks that ask the player to move rather than to shoot. */
function isPositional(attack: BossAttack): boolean {
  return attack === 'beam' || attack === 'ram'
}

/** Unsigned 32-bit hash of a boss seed and a draw number. */
export function attackHash(seed: number, n: number): number {
  const a = (Math.imul(seed, 374761393) + Math.imul(n, 668265263)) >>> 0
  const b = Math.imul((a ^ (a >>> 13)) >>> 0, 1274126177) >>> 0
  return (b ^ (b >>> 16)) >>> 0
}

function rawAttack(seed: number, index: number): BossAttack {
  return WEIGHTED[attackHash(seed, index) % WEIGHTED.length]
}

/** The boss's attack at `index` — a pure function of its seed. */
export function bossAttack(seed: number, index: number): BossAttack {
  const raw = rawAttack(seed, index)
  if (!isPositional(raw)) return raw

  const fallback = PATTERNS[attackHash(seed, index + 15) % PATTERNS.length]
  if (raw === 'beam' && index >= 1 && rawAttack(seed, index - 1) === 'beam') return fallback
  if (
    index >= 3 &&
    isPositional(rawAttack(seed, index - 1)) &&
    isPositional(rawAttack(seed, index - 2)) &&
    isPositional(rawAttack(seed, index - 3))
  ) {
    return fallback
  }
  return raw
}
