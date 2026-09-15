import { describe, expect, it } from 'vitest';

import {
  ROLL_COOLDOWN,
  ROLL_DURATION,
  canFire,
  canRoll,
  createCombat,
  isInvulnerable,
  isRolling,
  startRoll,
} from './combat';

describe('combat · a fresh run', () => {
  it('starts unprotected, not rolling, and able to fire', () => {
    const combat = createCombat();

    expect(isInvulnerable(combat, 0)).toBe(false);
    expect(isRolling(combat, 0)).toBe(false);
    expect(canRoll(combat, 0)).toBe(true);
    expect(canFire(combat, 0)).toBe(true);
  });
});

describe('combat · the roll', () => {
  it('runs for its duration and protects for the same window', () => {
    const rolling = startRoll(createCombat(), 10);

    expect(isRolling(rolling, 10 + ROLL_DURATION - 0.001)).toBe(true);
    expect(isInvulnerable(rolling, 10 + ROLL_DURATION - 0.001)).toBe(true);
  });

  it('is over on the frame it expires, not the one after', () => {
    const rolling = startRoll(createCombat(), 10);

    expect(isRolling(rolling, 10 + ROLL_DURATION)).toBe(false);
    expect(isInvulnerable(rolling, 10 + ROLL_DURATION)).toBe(false);
  });

  // The cost of rolling, and the reason there is no cooldown: rolling forever
  // is legal and means never killing anything.
  it('silences the guns for exactly its duration', () => {
    const rolling = startRoll(createCombat(), 10);

    expect(canFire(rolling, 10)).toBe(false);
    expect(canFire(rolling, 10 + ROLL_DURATION - 0.001)).toBe(false);
    expect(canFire(rolling, 10 + ROLL_DURATION)).toBe(true);
  });

  it('cannot be restarted while one is running', () => {
    const rolling = startRoll(createCombat(), 10);

    expect(canRoll(rolling, 10.5)).toBe(false);
    expect(startRoll(rolling, 10.5)).toBe(rolling);
  });

  it('is still recovering the moment it ends', () => {
    const rolling = startRoll(createCombat(), 10);

    expect(canRoll(rolling, 10 + ROLL_DURATION)).toBe(false);
    expect(isRolling(rolling, 10 + ROLL_DURATION)).toBe(false);
  });

  it('is available again once the recovery is over', () => {
    const rolling = startRoll(createCombat(), 10);
    const ready = 10 + ROLL_DURATION + ROLL_COOLDOWN;

    expect(canRoll(rolling, ready - 0.001)).toBe(false);
    expect(canRoll(rolling, ready)).toBe(true);
  });

  /*
   * It used to chain end to end, and that was argued as the intended equilibrium:
   * permanent invulnerability bought with permanent zero output.
   *
   * The argument had a hole. Every browser check of the boss fight in this session
   * re-pressed the roll key every 150ms and survived indefinitely — a player who is
   * not trying to win a particular exchange pays nothing, because "you make no
   * progress" is not a cost during the thirty seconds they need to not die.
   */
  it('cannot be chained, so protection has a gap in it', () => {
    const first = startRoll(createCombat(), 0);
    const second = startRoll(first, ROLL_DURATION);

    expect(second).toBe(first);
    expect(isInvulnerable(first, ROLL_DURATION + 0.001)).toBe(false);
  });

  it('leaves the guns free during the recovery', () => {
    const rolling = startRoll(createCombat(), 0);

    expect(canFire(rolling, ROLL_DURATION / 2)).toBe(false);
    expect(canFire(rolling, ROLL_DURATION + 0.001)).toBe(true);
  });

  // Half the time you may roll, half the time you may not — which is what makes
  // the rule easy to hold without a meter on screen.
  it('recovers for exactly as long as it ran', () => {
    expect(ROLL_COOLDOWN).toBe(ROLL_DURATION);
  });
});

describe('combat · two sources of invulnerability take the later, never the sum', () => {
  // Respawn (#6) writes the same field. If the two added, dying and rolling
  // immediately would grant the longest protection in the game, and players
  // would farm it.
  it('does not cut protection short when rolling while already protected', () => {
    const protectedLonger = { invulnerableUntil: 100, rollingUntil: 0, readyAt: 0 };
    const rolled = startRoll(protectedLonger, 0);

    expect(rolled.invulnerableUntil).toBe(100);
    expect(rolled.rollingUntil).toBe(ROLL_DURATION);
  });

  it('does not extend protection past the longer of the two', () => {
    const protectedBriefly = { invulnerableUntil: 0.5, rollingUntil: 0, readyAt: 0 };
    const rolled = startRoll(protectedBriefly, 0);

    expect(rolled.invulnerableUntil).toBe(ROLL_DURATION);
    expect(rolled.invulnerableUntil).toBeLessThan(0.5 + ROLL_DURATION);
  });

  // Protection outlasting the roll is the whole reason they are two fields:
  // the guns come back before the player is exposed again.
  it('lets the roll end while protection continues', () => {
    const rolled = startRoll({ invulnerableUntil: 100, rollingUntil: 0, readyAt: 0 }, 0);

    expect(isRolling(rolled, ROLL_DURATION)).toBe(false);
    expect(canFire(rolled, ROLL_DURATION)).toBe(true);
    expect(isInvulnerable(rolled, ROLL_DURATION)).toBe(true);
  });
});
