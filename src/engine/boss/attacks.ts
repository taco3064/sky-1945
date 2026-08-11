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

/** Every attack the boss cycles through freely. The two big ones are scheduled. */
const SHAPED: PatternKind[] = ['straight', 'spread', 'radial'];

/** Coprime with `RAM_EVERY` on purpose: see #8. */
const BEAM_EVERY = 4;
const RAM_EVERY = 3;

/** A 32-bit integer hash of the round and the attack's index. */
function mix(round: number, index: number): number {
  const seeded = Math.imul(round, 374761393) + Math.imul(index, 668265263);
  const stirred = Math.imul(seeded ^ (seeded >>> 13), 1274126177);

  return (stirred ^ (stirred >>> 16)) >>> 0;
}

/** Which attack comes next — derived, not drawn, so a run can be reproduced. */
export function attackAt(round: number, index: number): BossAttack {
  if ((index + 1) % BEAM_EVERY === 0) {
    return 'beam';
  }

  if ((index + 1) % RAM_EVERY === 0) {
    return 'ram';
  }

  return SHAPED[mix(round, index) % SHAPED.length];
}
