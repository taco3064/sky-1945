import { Bodies } from 'matter-js';
import type { Body } from 'matter-js';

import type { BulletSpawn, PatternKind } from '../patterns';

/**
 * The bodies the simulation moves around. Physics only — nothing here knows
 * how an aircraft is drawn, and nothing that draws one can reach this module
 * (the engine layer does not admit `components` as an importer).
 */

/* ---------------------------------------------------------------- player */

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

/** Where the player flies to and holds station, measured up from the bottom. */
export const PLAYER_START_INSET = 160;

/**
 * Where the aircraft comes in from, below the bottom edge.
 *
 * Far enough out to be fully off screen: the entrance should look like a craft
 * arriving from somewhere, not like one fading in at the edge of the field.
 */
export const PLAYER_ENTRY_INSET = -60;

/** How fast it flies in. Brisker than the player's own speed — it is a cue, not
 *  a stretch of gameplay, and the run is on hold until it lands. */
export const PLAYER_ENTRY_SPEED = 620;

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

/* --------------------------------------------------------------- bullets */

/**
 * Bullets are small, and generous to hit with — the player's aim is not
 * where the difficulty is meant to live.
 */
export const BULLET_HIT_RADIUS = 4;

/** World units per second. Fast enough to feel instant across a 960-unit field. */
export const BULLET_SPEED = 780;

/**
 * The floor on enemy fire — slower than the player's, so it can be read.
 *
 * A floor rather than the speed itself, because it is not enough on its own at
 * high rounds: a round-11 small enemy travels at 165 x 3 = 495 and would
 * overtake its own bullets. See ENEMY_BULLET_LEAD.
 */
export const ENEMY_BULLET_SPEED = 260;

/**
 * How much faster than its shooter a bullet must travel.
 *
 * Without this, difficulty scaling eventually lets an enemy outrun its own
 * fire — the craft arriving ahead of the shot it took is not a hard enemy, it
 * is a broken one.
 */
export const ENEMY_BULLET_LEAD = 1.5;

/**
 * Damage before the loadout's power multiplier.
 *
 * Cut to 75% of what it was when the aircraft grew a second cannon, and the
 * interesting part is that this does *not* simply scale output by 1.5. What it
 * lands on depends on how wide the target is:
 *
 * - The boss is wide enough for both trails to connect, so it takes about 1.5x.
 * - A small craft is narrower than the gap between the cannons, so most of the
 *   time only one trail reaches it — and it takes 0.75x.
 *
 * Which is the right way round for two wing guns, and it happened by arithmetic
 * rather than by a table of per-enemy modifiers.
 */
export const BULLET_BASE_DAMAGE = 7.5;

/**
 * Seconds between the player's shots.
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
 * How far either side of centre the two cannons sit.
 *
 * There are two of them, one per wing, and they fire parallel rather than
 * converging — a spread would make the aircraft's own width the thing that
 * decides whether a shot lands, which is not a decision the player can make.
 *
 * Sized to the Fighter's wing, so the trails leave the drawing where a gun is
 * drawn. It is one of the few numbers in here that answers to the art rather
 * than to the simulation.
 */
export const PLAYER_WING_SPAN = 13;

/** What a bullet carries beyond its position. */
interface BulletPayload {
  damage: number;
  vx: number;
  vy: number;
}

/**
 * A bullet.
 *
 * Damage and velocity ride on the body rather than being looked up at impact:
 * damage is `base × powerBoost` baked in at spawn, and velocity comes from the
 * pattern that fired it. Neither is recomputed inside the frame loop.
 */
export function createBullet(spawn: BulletSpawn): Body {
  const bullet = Bodies.circle(spawn.x, spawn.y, BULLET_HIT_RADIUS, {
    label: spawn.side === 'player' ? 'player-bullet' : 'enemy-bullet',
    isSensor: true,
    frictionAir: 0,
  });

  // Matter carries arbitrary data on `plugin`, which is where values that
  // belong to the game rather than to the physics go.
  const payload: BulletPayload = {
    damage: spawn.damage,
    vx: spawn.vx,
    vy: spawn.vy,
  };

  bullet.plugin = payload;

  return bullet;
}

/** Reads back what {@link createBullet} baked in. */
export function damageOf(body: Body): number {
  return (body.plugin as Partial<BulletPayload>).damage ?? 0;
}

/** The velocity a pattern gave this bullet, in world units per second. */
export function velocityOf(body: Body): { vx: number; vy: number } {
  const payload = body.plugin as Partial<BulletPayload>;

  return { vx: payload.vx ?? 0, vy: payload.vy ?? 0 };
}

/* --------------------------------------------------------------- enemies */

export type EnemyKind = 'small' | 'medium' | 'large';

export interface EnemyStats {
  /** Collision radius, in world units. */
  radius: number;
  /**
   * How much damage it takes to kill.
   *
   * Never leaves the engine. A trash mob has no health bar — the player reads
   * "it is still there" and knows it is not dead — so this number is spent
   * entirely inside the simulation and React is only told the entity died.
   * The boss is the exception, and that is #8's problem.
   */
  hp: number;
  /** Downward speed at 100%, world units per second. */
  speed: number;
  /** Bullet damage at 100%. */
  damage: number;
  /**
   * Seconds between volleys at 100%.
   *
   * Divided by the round's speed boost in flight, so a faster craft fires
   * proportionally more often. Otherwise scaling speed *reduces* the pressure
   * it applies: it crosses the field sooner and gets fewer volleys off.
   */
  fireInterval: number;
  /** Which trajectory its fire takes. */
  pattern: PatternKind;
}

/**
 * The three silhouettes, and what each one is for.
 *
 * Stats and trajectory are orthogonal: a kind decides how much it takes to
 * kill, how fast it goes, what it fires and how hard. *Where* it flies is a
 * path (`../paths`), assigned per wave — so any kind can arrive on any path.
 * `sway` and `swayRate` used to live here, which was one path wearing an
 * entity's clothes.
 *
 * Unlike the player, an enemy's hit circle nearly matches its drawing —
 * roughly a third of the sprite's width. The asymmetry is deliberate and is
 * the whole balance of the game: the player is a dot that dies on contact,
 * and enemies are generous targets. One rule applied to both sides would make
 * this unplayable in one direction and trivial in the other.
 *
 * The DOM node counts behind these (3 / 5 / 6) are what set the concurrency
 * ceilings — a small enemy is cheap enough to send ten of.
 */
export const ENEMY_STATS: Record<EnemyKind, EnemyStats> = {
  small: {
    hp: 20,
    radius: 13,
    speed: 165,
    damage: 8,
    fireInterval: 1.1,
    pattern: 'straight',
  },
  medium: {
    hp: 60,
    radius: 20,
    speed: 115,
    damage: 10,
    fireInterval: 1.6,
    pattern: 'spread',
  },
  large: {
    hp: 160,
    radius: 32,
    speed: 72,
    damage: 12,
    fireInterval: 2.2,
    pattern: 'radial',
  },
};

/** Where a volley leaves an enemy — its nose, which points down the screen. */
export function enemyMuzzleOffset(kind: EnemyKind): number {
  return ENEMY_STATS[kind].radius + 6;
}

/**
 * An enemy body.
 *
 * A sensor like everything else: Matter reports the contact and the game
 * decides what it means. Nothing in this game is pushed by anything.
 */
export function createEnemy(kind: EnemyKind, x: number, y: number): Body {
  return Bodies.circle(x, y, ENEMY_STATS[kind].radius, {
    label: `enemy-${kind}`,
    isSensor: true,
    frictionAir: 0,
    // Nose down, towards the player.
    //
    // Carried on the body rather than added as a CSS wrapper, because the
    // transform the engine already publishes has an angle in it. A wrapper
    // would cost one DOM node per enemy — and the reason it would be needed
    // at all is that the *inner* element is where attitude animations go
    // (#6's explosion), so the rotation cannot live there either.
    angle: Math.PI,
  });
}

/* ------------------------------------------------------------------- boss */

/**
 * The boss's numbers, and why they are not a fourth `ENEMY_STATS` entry.
 *
 * Every field in `EnemyStats` would mean something different here. Its `hp` is
 * published to React — the bar across the top — where a trash mob's never
 * leaves the engine. It has no single `pattern`, because it draws on all three.
 * It has no `fireInterval`, because its fire is a sequence of wind-up and
 * release rather than a metronome. And it never leaves the field: a trash mob's
 * life ends when it flies off, the boss's ends only when it dies.
 *
 * Four fields carrying four different meanings is not one table with a special
 * case in it. `../boss` owns the behaviour; this is only what it is made of.
 */
export const BOSS_STATS = {
  /** Collision radius. Large, and honestly so — there is no dodging past it. */
  radius: 52,
  /** Hit points in round 1. `../boss` scales this with the round. */
  hp: 900,
  /**
   * World units per second while patrolling.
   *
   * The flight in uses `BOSS_ENTRY_SPEED` instead, which is faster: the entrance
   * is a cue, not a phase of the fight.
   */
  speed: 90,
  /** Damage per bullet at 100%. */
  damage: 14,
};

/**
 * How large a boss can be rolled, as a multiple of `BOSS_STATS`.
 *
 * The one die in the engine, and the exception is narrow enough to state exactly.
 * Attack order is derived and never drawn, because a player has to *read* it —
 * predictability there is what makes the tells mean anything. A body size is
 * different in kind: it is fully visible from the moment the boss appears, so
 * nothing has to be remembered to answer it, and rolling it is what stops every
 * fight in a run being the same fight.
 */
export const BOSS_SCALE_MIN = 0.8;
export const BOSS_SCALE_MAX = 2;

/**
 * A size for a fresh boss.
 *
 * Separate from `summon` so it can be handed in instead: the caller in play rolls,
 * and every test states the size it means. Randomness at the boundary, arithmetic
 * everywhere inside.
 */
export function rollBossScale(): number {
  return BOSS_SCALE_MIN + Math.random() * (BOSS_SCALE_MAX - BOSS_SCALE_MIN);
}

/** The altitude it settles at: high enough to leave the player room to work. */
export const BOSS_ALTITUDE = 150;

/**
 * How fast the boss flies in.
 *
 * Deliberately quick. It used to arrive at its patrol speed, which took over two
 * seconds during which it could not move, could not fire, and *could* be shot —
 * at full loadout power that was half its health gone before the fight began.
 * Reported from play as being handed a free target.
 *
 * The arrival is also invulnerable now (`../boss` refuses damage while entering),
 * and those two changes answer the same complaint from both ends: less time, and
 * nothing gained by spending it shooting.
 */
export const BOSS_ENTRY_SPEED = 420;

/**
 * The beam's footprint.
 *
 * Long enough to reach past the bottom edge from the boss's altitude, so the
 * only honest answers are sideways or a roll — never "wait underneath it".
 *
 * The width is not scaled by the boss's size. A bigger boss is already harder in
 * two ways it was given deliberately; a wider lethal column on top of that would
 * take the sideways answer away, and then the beam has only one answer instead of
 * two.
 */
export const BEAM_WIDTH = 88;
export const BEAM_LENGTH = 1000;

/** The boss's body, at the size it was rolled. A sensor and nose-down. */
export function createBoss(x: number, y: number, scale: number): Body {
  return Bodies.circle(x, y, BOSS_STATS.radius * scale, {
    label: 'enemy-boss',
    isSensor: true,
    frictionAir: 0,
    angle: Math.PI,
  });
}

/**
 * How far ahead of the boss's centre its aimed fire appears, at scale 1.
 *
 * Sized from the *drawing* rather than from the hit circle, and that distinction
 * started mattering the moment the body could be rolled larger. The sprite is 124
 * tall against a hit radius of 52, so its nose is about 64 from the centre — and
 * `radius + 8` was near enough to look right at scale 1 and 20 units short at scale
 * 2, which reads as fire coming out of the middle of the aircraft.
 *
 * One of the handful of engine numbers that answers to the art. The drawing's own
 * dimensions live in the Boss component's CSS and cannot be imported here, so the
 * check is visual: at any size the trails should leave the aperture.
 */
const BOSS_MUZZLE_REACH = 66;

export function bossMuzzleOffset(scale: number): number {
  return BOSS_MUZZLE_REACH * scale;
}

/**
 * The beam's body: a rectangle hanging from the boss's nose.
 *
 * Deliberately not a wall of bullets. Bullets would be dozens of bodies holding
 * a shape that never changes, they would be deleted one by one as the player's
 * own fire met them, and the beam's edge would flicker as each one spawned. One
 * rectangle is the honest description of "this column is lethal right now".
 *
 * Labelled `enemy-beam` because `../collisions` treats everything on the enemy
 * side as fatal on contact but keeps a separate list of the ones that are
 * hazards rather than aircraft. A beam cannot be shot down.
 */
export function createBeam(x: number, y: number): Body {
  return Bodies.rectangle(x, y + BEAM_LENGTH / 2, BEAM_WIDTH, BEAM_LENGTH, {
    label: 'enemy-beam',
    isSensor: true,
    frictionAir: 0,
  });
}
