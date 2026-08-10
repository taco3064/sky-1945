import { Bodies } from 'matter-js';
import type { Body } from 'matter-js';

/**
 * The bodies the simulation moves around. Physics only — nothing here knows
 * how an aircraft is drawn, and nothing that draws one can reach this module
 * (the engine layer does not admit `components` as an importer).
 */

/**
 * The player's collision circle, in world units.
 *
 * Three units against a sprite roughly forty wide, and the mismatch is the
 * point: contact is fatal (#6), so a hitbox matching the drawing makes the
 * game unplayable. Every bullet-hell shooter shrinks the player's judgement
 * point to a dot near the centre.
 *
 * The sprite's size lives in the Fighter component's CSS and these two
 * numbers must never be reconciled. They cannot be, either: `components`
 * cannot import `engine`, so nobody can accidentally sync them.
 */
export const PLAYER_HIT_RADIUS = 3;

/** World units per second at 100% speed — before the loadout's multiplier. */
export const PLAYER_BASE_SPEED = 300;

/**
 * How close to the field edge the player may get.
 *
 * Roughly half a sprite, so the aircraft stays whole instead of having a wing
 * clipped off by the field's overflow. A rule about where the player may go,
 * which is why it is here and not in the CSS — but it is sized from the
 * drawing, so the two move together when the sprite does.
 */
export const PLAYER_BOUNDS_INSET = 24;

/** Where the player starts, measured up from the bottom edge. */
export const PLAYER_START_INSET = 160;

/**
 * The player's body.
 *
 * A sensor with no air friction: it reports contact and integrates nothing.
 * The player's position is driven straight from input rather than through
 * forces, because inertia on a dodge is indistinguishable from input lag.
 */
export function createPlayer(x: number, y: number): Body {
  return Bodies.circle(x, y, PLAYER_HIT_RADIUS, {
    label: 'player',
    isSensor: true,
    frictionAir: 0,
  });
}

/**
 * Bullets are small, and generous to hit with — the player's aim is not
 * where the difficulty is meant to live.
 */
export const BULLET_HIT_RADIUS = 4;

/** World units per second. Fast enough to feel instant across a 960-unit field. */
export const BULLET_SPEED = 780;

/** Damage before the loadout's power multiplier. */
export const BULLET_BASE_DAMAGE = 10;

/**
 * Seconds between shots.
 *
 * The guns never stop (#5 removed the fire button), so this is the whole
 * firing model: ten a second, steady. A steady rate is also what makes the
 * worst case computable — peak bullet count is rate × time-on-screen, not
 * whatever a player's mashing produces.
 */
export const PLAYER_FIRE_INTERVAL = 0.1;

/** How far ahead of the player's centre a shot appears. */
export const PLAYER_MUZZLE_OFFSET = 26;

/**
 * A bullet.
 *
 * Damage rides on the body rather than being looked up at impact: it is
 * `base × powerBoost`, baked in at spawn, so no boost arithmetic ever runs
 * inside the frame loop.
 */
export function createBullet(x: number, y: number, damage: number): Body {
  const bullet = Bodies.circle(x, y, BULLET_HIT_RADIUS, {
    label: 'player-bullet',
    isSensor: true,
    frictionAir: 0,
  });

  // Matter carries arbitrary data on `plugin`, which is where a value that
  // belongs to the game rather than to the physics goes.
  bullet.plugin = { damage };

  return bullet;
}

/** Reads back what {@link createBullet} baked in. */
export function damageOf(body: Body): number {
  const plugin = body.plugin as { damage?: number };

  return plugin.damage ?? 0;
}
