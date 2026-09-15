import { type Bullet, createBullet } from '../bullets';
import type { Point } from '../field';
import { powerMultiplier, speedMultiplier } from '~app/loadout/models/allocation';

/** Lives per run (game-spec 12.3). */
export const PLAYER_LIVES = 3;

/** Deliberately tiny against the drawing (game-spec 9.1). */
export const PLAYER_HIT_RADIUS = 3;

/** The launch point, 60 u below the bottom edge. */
export const LAUNCH_X = 270;
export const LAUNCH_Y = 1020;

const FLY_IN_SPEED = 620;
const FLY_IN_END_Y = 800;
const LAUNCH_PROTECTION = 3;

const BASE_SPEED = 300;
const MIN_X = 24;
const MAX_X = 516;
const MIN_Y = 24;
const MAX_Y = 936;

/** 7.5 volleys per second. */
export const FIRE_INTERVAL = 1 / 7.5;
const BULLET_SPEED = 780;
const BULLET_HEADING = -90;
const BASE_DAMAGE = 7.5;
const MUZZLE_SIDE = 13;
const MUZZLE_AHEAD = 26;

export const ROLL_DURATION = 1.2;
/** The next roll is allowed this long after a roll ends. */
const ROLL_COOLDOWN = 1.2;

export interface Player {
  readonly id: number;
  /** u/s: 300 × speed multiplier. */
  readonly speed: number;
  /** Per bullet: 7.5 × power multiplier. */
  readonly damage: number;
  x: number;
  y: number;
  flyingIn: boolean;
  /** The latest input direction, not yet normalised. */
  direction: Point;
  protectedUntil: number;
  rollEndsAt: number;
  rollReadyAt: number;
  /** Not reset by death. */
  fireTimer: number;
}

export function createPlayer(id: number, speedPoints: number, now: number): Player {
  const player: Player = {
    id,
    speed: BASE_SPEED * speedMultiplier(speedPoints),
    damage: BASE_DAMAGE * powerMultiplier(speedPoints),
    x: LAUNCH_X,
    y: LAUNCH_Y,
    flyingIn: true,
    direction: { x: 0, y: 0 },
    protectedUntil: now,
    rollEndsAt: now,
    rollReadyAt: now,
    fireTimer: 0,
  };

  launchPlayer(player, now);

  return player;
}

/** (Re)launches from below: fly-in restarts, input and roll reset, 3 s protected. */
export function launchPlayer(player: Player, now: number): void {
  player.x = LAUNCH_X;
  player.y = LAUNCH_Y;
  player.flyingIn = true;
  player.direction = { x: 0, y: 0 };
  player.rollEndsAt = now;
  player.rollReadyAt = now;
  player.protectedUntil = now + LAUNCH_PROTECTION;
}

export function isProtected(player: Player, now: number): boolean {
  return now < player.protectedUntil;
}

/** Invulnerable until the later of the current expiry and `until`; never shortened. */
export function protectUntil(player: Player, until: number): void {
  player.protectedUntil = Math.max(player.protectedUntil, until);
}

export function isRolling(player: Player, now: number): boolean {
  return now < player.rollEndsAt;
}

/** From a roll's start until the next roll is allowed. */
export function isSpent(player: Player, now: number): boolean {
  return now < player.rollReadyAt;
}

/** Starts a barrel roll when allowed; a roll never shortens protection. */
export function tryRoll(player: Player, now: number): boolean {
  if (now < player.rollReadyAt) {
    return false;
  }

  player.rollEndsAt = now + ROLL_DURATION;
  player.rollReadyAt = player.rollEndsAt + ROLL_COOLDOWN;
  protectUntil(player, player.rollEndsAt);

  return true;
}

/** What one pass hands the player. */
export interface PlayerTick {
  dt: number;
  /** Simulated time at the end of the pass. */
  now: number;
  nextId: () => number;
}

/** One pass: fly in or steer, then fire every volley that is due. */
export function updatePlayer(player: Player, tick: PlayerTick): Bullet[] {
  if (player.flyingIn) {
    flyIn(player, tick.dt);
  } else {
    steer(player, tick.dt);
  }

  return fire(player, tick);
}

function flyIn(player: Player, dt: number): void {
  player.y -= FLY_IN_SPEED * dt;

  if (player.y <= FLY_IN_END_Y) {
    player.y = FLY_IN_END_Y;
    player.flyingIn = false;
  }
}

function steer(player: Player, dt: number): void {
  const { x, y } = player.direction;
  const length = Math.hypot(x, y);

  if (length === 0) {
    return;
  }

  const travel = player.speed * dt;

  player.x = Math.min(MAX_X, Math.max(MIN_X, player.x + (x / length) * travel));
  player.y = Math.min(MAX_Y, Math.max(MIN_Y, player.y + (y / length) * travel));
}

function fire(player: Player, { dt, now, nextId }: PlayerTick): Bullet[] {
  if (isRolling(player, now)) {
    player.fireTimer = Math.min(player.fireTimer + dt, FIRE_INTERVAL);

    return [];
  }

  player.fireTimer += dt;
  const bullets: Bullet[] = [];

  while (player.fireTimer >= FIRE_INTERVAL) {
    player.fireTimer -= FIRE_INTERVAL;

    for (const side of [-MUZZLE_SIDE, MUZZLE_SIDE]) {
      bullets.push(
        createBullet(nextId(), {
          side: 'player',
          x: player.x + side,
          y: player.y - MUZZLE_AHEAD,
          heading: BULLET_HEADING,
          speed: BULLET_SPEED,
          damage: player.damage,
        }),
      );
    }
  }

  return bullets;
}
