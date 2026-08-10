/**
 * What can and cannot hurt the player right now.
 *
 * Pure state and pure transitions — no bodies, no React, no clock of its own.
 * Every function takes `now` so the caller owns time, which is what makes the
 * whole module testable without waiting for any of it.
 */

/** How long a barrel roll runs, and how long it protects. */
export const ROLL_DURATION = 1.2;

/**
 * How many aircraft a run gets.
 *
 * Lives are not HP. HP belongs to an entity and dies with it; lives belong to
 * the run and outlive the aircraft — the player dies, the count drops, and a
 * fresh craft appears. Folding them into one number produces something that
 * means durability sometimes and retry count other times.
 */
export const STARTING_LIVES = 3;

/**
 * How long a fresh aircraft cannot be hit.
 *
 * Not optional. Without it, respawning into live fire burns all three lives in
 * about three seconds and the run ends before the player touches a key.
 */
export const RESPAWN_INVULNERABILITY = 1.5;

/** What the aircraft is doing, as opposed to where it is. */
export interface CombatSnapshot {
  rolling: boolean;
  invulnerable: boolean;
}

export interface Combat {
  /**
   * Time until which the player cannot be hit.
   *
   * **Invulnerability is a state**, with more than one source: the roll below
   * writes it, and respawn (#6) will write the same field. Writers take the
   * later of the two, never the sum — 1.5s of respawn protection plus 1.2s of
   * roll must not become 2.7s, or dying becomes the best way to get the
   * longest invulnerability in the game.
   */
  invulnerableUntil: number;
  /**
   * Time until which the roll itself is running.
   *
   * **The roll is an action**, and this is what makes it one: it suppresses
   * fire and blocks a second roll. Respawn never touches it. That separation
   * is why the roll is not simply a second invulnerability flag.
   */
  rollingUntil: number;
}

/** Nothing running, nothing protecting. */
export function createCombat(): Combat {
  return { invulnerableUntil: 0, rollingUntil: 0 };
}

export function isInvulnerable(combat: Combat, now: number): boolean {
  return now < combat.invulnerableUntil;
}

export function isRolling(combat: Combat, now: number): boolean {
  return now < combat.rollingUntil;
}

/**
 * A roll may start whenever one is not already running.
 *
 * There is no cooldown, and that is the design rather than an omission: the
 * cost of rolling is that the guns are silent for its duration. Rolling
 * forever is legal and means never killing anything — waves never clear, the
 * boss never falls. The limit is inside the mechanic instead of bolted beside
 * it, so there is no charge meter for the player to track or the HUD to draw.
 */
export function canRoll(combat: Combat, now: number): boolean {
  return !isRolling(combat, now);
}

/**
 * Start a roll, if one is not already running.
 *
 * Returns the state unchanged when it cannot start, so a caller can send the
 * trigger on every keypress without checking first.
 */
export function startRoll(combat: Combat, now: number): Combat {
  if (!canRoll(combat, now)) {
    return combat;
  }

  const until = now + ROLL_DURATION;

  return {
    rollingUntil: until,
    // The later of the two. Rolling while already protected must not cut the
    // protection short.
    invulnerableUntil: Math.max(combat.invulnerableUntil, until),
  };
}

/** Guns are silent for the duration of a roll. */
export function canFire(combat: Combat, now: number): boolean {
  return !isRolling(combat, now);
}

/**
 * The second source of invulnerability: a respawn.
 *
 * Takes the **later** of the two expiry times, never the sum. 1.5s of respawn
 * protection on top of a 1.2s roll must not become 2.7s, or dying becomes the
 * cheapest way to buy the longest invulnerability in the game and players farm
 * it. The roll's own window (`rollingUntil`) is untouched — respawning does
 * not silence the guns.
 */
export function grantInvulnerability(
  combat: Combat,
  now: number,
  duration: number,
): Combat {
  return {
    rollingUntil: combat.rollingUntil,
    invulnerableUntil: Math.max(combat.invulnerableUntil, now + duration),
  };
}
