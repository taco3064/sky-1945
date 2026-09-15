import { BULLET_HIT_RADIUS, type Bullet } from '../bullets';
import type { Point } from '../field';
import { PLAYER_HIT_RADIUS, type Player, isProtected, protectUntil } from '../player';

/** PULSE energy never exceeds this; activation spends all of it (PULSE DRIVE 1, 3). */
export const PULSE_MAX = 100;

const GRAZE_ENERGY = 8;
/** Player centre to bullet centre (PULSE DRIVE 2). */
const GRAZE_REACH = 28;
/** At or inside this distance an enemy bullet hits the player instead: 3 + 4 u. */
const HIT_DISTANCE = PLAYER_HIT_RADIUS + BULLET_HIT_RADIUS;

/** Simulated seconds one activation lasts, protected throughout (PULSE DRIVE 4, 5). */
export const PULSE_DURATION = 0.6;
/** The radius reached at the end of the lifetime (PULSE DRIVE 6). */
const PULSE_REACH = 180;

/** Fixed, whatever the POWER, round or size (PULSE DRIVE 8, 9). */
export const PULSE_ENEMY_DAMAGE = 50;
export const PULSE_BOSS_DAMAGE = 120;

/** One activation. */
export interface Pulse {
  readonly id: number;
  /** Simulated time it started. */
  readonly startedAt: number;
  /** Enemy aircraft and bosses it has reached; each takes its damage at most once. */
  readonly reached: Set<number>;
}

export interface PulseDrive {
  /** 0–100. Survives death and round changes; every run starts at 0. */
  energy: number;
  active: Pulse | null;
  /** Enemy bullets that have granted a graze; each grants once in its lifetime. */
  readonly grazed: WeakSet<Bullet>;
}

/** The filled gameplay area of a Pulse, centred on the player. */
export interface PulseArea extends Point {
  radius: number;
}

export function createPulseDrive(): PulseDrive {
  return { energy: 0, active: null, grazed: new WeakSet() };
}

export function isPulseReady(energy: number): boolean {
  return energy >= PULSE_MAX;
}

/** What an activation needs from the run. */
export interface PulseLaunch {
  now: number;
  nextId: () => number;
}

/**
 * Starts a Pulse once energy is full, the player has flown in and none is active:
 * all energy is spent and protection lasts at least the whole Pulse.
 */
export function activatePulse(
  drive: PulseDrive,
  player: Player,
  { now, nextId }: PulseLaunch,
): boolean {
  if (drive.active || player.flyingIn || !isPulseReady(drive.energy)) {
    return false;
  }

  drive.energy = 0;
  drive.active = { id: nextId(), startedAt: now, reached: new Set() };
  protectUntil(player, now + PULSE_DURATION);

  return true;
}

export function endPulse(drive: PulseDrive): void {
  drive.active = null;
}

/** `180 × clamp(elapsed / 0.6, 0, 1)` u. */
export function pulseRadius(pulse: Pulse, now: number): number {
  const progress = (now - pulse.startedAt) / PULSE_DURATION;

  return PULSE_REACH * Math.min(1, Math.max(0, progress));
}

/**
 * The pass that reaches 0.6 s of Pulse time is its last. Compared exactly like its
 * protection, so that pass is also the first one unprotected by the Pulse.
 */
export function hasPulseEnded(pulse: Pulse, now: number): boolean {
  return now >= pulse.startedAt + PULSE_DURATION;
}

/** The area at `now`, following the player's current position. */
export function pulseArea(pulse: Pulse, { x, y }: Point, now: number): PulseArea {
  return { x, y, radius: pulseRadius(pulse, now) };
}

/** A centre within the radius, grown by the body's hit radius (0 for a bullet centre). */
export function isInPulseArea(area: PulseArea, body: Point, hitRadius = 0): boolean {
  return distance(area, body) <= area.radius + hitRadius;
}

/** True only the first time this Pulse reaches entity `id`. */
export function reachOnce(pulse: Pulse, id: number): boolean {
  if (pulse.reached.has(id)) {
    return false;
  }

  pulse.reached.add(id);

  return true;
}

/** Only a player who has flown in and is vulnerable earns graze energy. */
export function canGraze(player: Player, now: number): boolean {
  return !player.flyingIn && !isProtected(player, now);
}

/**
 * An enemy bullet within 28 u of the player's centre but outside the hit distance
 * grants +8, capped at 100 — once in its lifetime. The caller checks `canGraze`.
 */
export function grazeBullet(drive: PulseDrive, player: Point, bullet: Bullet): boolean {
  const gap = distance(player, bullet);

  if (
    bullet.side !== 'enemy'
    || drive.grazed.has(bullet)
    || gap > GRAZE_REACH
    || gap <= HIT_DISTANCE
  ) {
    return false;
  }

  drive.grazed.add(bullet);
  drive.energy = Math.min(PULSE_MAX, drive.energy + GRAZE_ENERGY);

  return true;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}
