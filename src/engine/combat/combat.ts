import type { Combat } from './types';

/** How long a barrel roll runs, and how long it protects. */
export const ROLL_DURATION = 1.2;

/** How long after a roll ends before another may start: see #10. */
export const ROLL_COOLDOWN = 1.2;

/** How many aircraft a run gets. Lives belong to the run, not to the aircraft. */
export const STARTING_LIVES = 3;

/** How long a fresh aircraft cannot be hit, entrance included. */
export const RESPAWN_INVULNERABILITY = 3;

/** Nothing running, nothing protecting, and free to roll. */
export function createCombat(): Combat {
  return { invulnerableUntil: 0, rollingUntil: 0, readyAt: 0 };
}

export function isInvulnerable(combat: Combat, now: number): boolean {
  return now < combat.invulnerableUntil;
}

export function isRolling(combat: Combat, now: number): boolean {
  return now < combat.rollingUntil;
}

/** True during the recovery after a roll, when another is refused. */
export function isReady(combat: Combat, now: number): boolean {
  return now >= combat.readyAt;
}

/** A roll may start once the last one has finished recovering. */
export function canRoll(combat: Combat, now: number): boolean {
  return isReady(combat, now);
}

/** Start a roll. Returns the state unchanged when it cannot, so callers need no check. */
export function startRoll(combat: Combat, now: number): Combat {
  if (!canRoll(combat, now)) {
    return combat;
  }

  const until = now + ROLL_DURATION;

  return {
    rollingUntil: until,
    readyAt: until + ROLL_COOLDOWN,
    // The later of the two: rolling while protected must not cut it short.
    invulnerableUntil: Math.max(combat.invulnerableUntil, until),
  };
}

/** Guns are silent for the duration of a roll. */
export function canFire(combat: Combat, now: number): boolean {
  return !isRolling(combat, now);
}

/** The second source of invulnerability: a respawn. It does not silence the guns. */
export function grantInvulnerability(
  combat: Combat,
  now: number,
  duration: number,
): Combat {
  return {
    rollingUntil: combat.rollingUntil,
    readyAt: combat.readyAt,
    invulnerableUntil: Math.max(combat.invulnerableUntil, now + duration),
  };
}
