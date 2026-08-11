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
 * How long after a roll ends before another may start.
 *
 * There was none, and the comment where `canRoll` lives used to argue that the
 * absence was the design: the cost of rolling was that the guns fall silent, so
 * rolling forever meant killing nothing and clearing no rounds.
 *
 * That argument had a hole, and I walked through it — every browser check of the
 * boss fight in this session used a script that re-pressed the roll key every
 * 150ms, and it survived indefinitely. A player who is not trying to *win* a
 * particular exchange pays nothing for permanent invulnerability, and "you will
 * make no progress" is not a cost during the thirty seconds they need to not die.
 *
 * So the limit moves from inside the mechanic to beside it. Equal to the roll's own
 * length, which makes the rule easy to hold: half the time you may roll, half the
 * time you may not.
 */
export const ROLL_COOLDOWN = 1.2;

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
 * How long a fresh aircraft cannot be hit, entrance included.
 *
 * Not optional. Without it, respawning into live fire burns all three lives in
 * about three seconds and the run ends before the player touches a key.
 *
 * It covers the flight in from below *and* a moment at station afterwards, which
 * is why it is three seconds rather than the 1.5 it started at: the entrance
 * spends part of the window, and a player who lands with no protection left has
 * been given an animation instead of a chance.
 */
export const RESPAWN_INVULNERABILITY = 3;

/** What the aircraft is doing, as opposed to where it is. */
export interface CombatSnapshot {
  rolling: boolean;
  invulnerable: boolean;
  /** False during the recovery after a roll, when another is refused. */
  ready: boolean;
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
  /**
   * Time until which a new roll is refused.
   *
   * Always `rollingUntil + ROLL_COOLDOWN`, which is why `canRoll` needs no second
   * check: a time that has not reached this has not reached the end of the roll
   * either.
   */
  readyAt: number;
}

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

/**
 * A roll may start once the last one has finished recovering.
 *
 * One comparison rather than two: `readyAt` is always past `rollingUntil`, so a
 * time that has not reached it has not reached the end of the roll either.
 */
export function canRoll(combat: Combat, now: number): boolean {
  return isReady(combat, now);
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
    readyAt: until + ROLL_COOLDOWN,
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
    readyAt: combat.readyAt,
    invulnerableUntil: Math.max(combat.invulnerableUntil, now + duration),
  };
}
