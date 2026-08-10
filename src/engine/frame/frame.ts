import { Engine } from 'matter-js';

import { boostsForRound } from '../boosts';
import type { BossField } from '../boss';
import type { BulletField } from '../bullets';
import type { CollisionWatch, Hit } from '../collisions';
import type { Director } from '../director';
import type { EffectField } from '../effects';
import type { EnemyField } from '../enemies';
import type { Pilot } from '../pilot';

/**
 * One frame of simulation: everyone moves, everyone who is due fires, contacts
 * are resolved, and the round advances if it is over.
 *
 * Split out of `world` when collision handling arrived and pushed that module
 * past its line budget for the third time. The division that fell out is a
 * real one: `world` owns the *lifetime* — creating the parts, running the
 * loop, and the channels the outside listens on — and this owns *what happens
 * in a frame*. Neither needs to know much about the other.
 */

export interface FrameParts {
  engine: Engine;
  pilot: Pilot;
  bullets: BulletField;
  enemies: EnemyField;
  effects: EffectField;
  collisions: CollisionWatch;
  director: Director;
  boss: BossField;
}

export interface FrameResult {
  /** Something appeared or disappeared — React needs to hear about it. */
  rosterChanged: boolean;
  /** The player was killed this frame. Lives are counted outside the engine. */
  playerDied: boolean;
  /** The round was cleared and the next one has begun. */
  roundAdvanced: boolean;
  /**
   * The boss's bar needs redrawing: it took damage, changed stance, arrived or
   * died.
   *
   * A separate flag from `rosterChanged` because it answers a different
   * question. The roster changes when something is born or dies, and the boss's
   * hit points change while nothing is born or dies at all.
   */
  bossChanged: boolean;
}

/**
 * How many collision passes one frame is split into.
 *
 * Matter reports an overlap, not a crossing — so anything that travels further
 * in a frame than the sum of two hit radii can pass clean through. The worst
 * case here is the player at full speed (900/s) meeting late-round enemy fire
 * (up to ~740/s): 27 world units in a 60Hz frame, against a player-plus-bullet
 * overlap of just 3 + 4 = 7 units. Four passes brings each one under that.
 *
 * This is what a player reports as "I turned the speed up and now nothing hits
 * anything" — and the shrinking hit circle that makes the game playable is
 * exactly what makes it vulnerable.
 *
 * The cost is four Engine.update calls per frame instead of one; #11 measures
 * what that means with a full field.
 */
const COLLISION_PASSES = 4;

/** How big a wreck each side leaves. */
const ENEMY_WRECK = { size: 'small', tone: 'enemy' } as const;
const BOSS_WRECK = { size: 'large', tone: 'enemy' } as const;
const PLAYER_WRECK = { size: 'large', tone: 'ally' } as const;

interface Resolution {
  rosterChanged: boolean;
  playerDied: boolean;
  bossChanged: boolean;
}

/**
 * Damage, delivered to whichever field owns the target.
 *
 * Asked in this order, and asked *before* the damage lands: the boss's own
 * `owns` goes false the instant it dies, so a single call afterwards could not
 * tell "the boss died" from "that id was never the boss".
 */
function applyDamage(parts: FrameParts, hit: Extract<Hit, { kind: 'enemy-damaged' }>) {
  const isBoss = parts.boss.owns(hit.enemyId);

  const wreck = isBoss
    ? parts.boss.damage(hit.damage)
    : parts.enemies.damage(hit.enemyId, hit.damage);

  if (wreck) {
    parts.effects.burst(wreck, isBoss ? BOSS_WRECK : ENEMY_WRECK);
  }

  return { isBoss };
}

/**
 * Turn this frame's contacts into consequences.
 *
 * The player's death is checked against invulnerability here rather than in
 * the collision watch: whether a contact happened and whether it matters are
 * two questions, and only the second one changes with the roll (#10) and with
 * respawn protection.
 */
function resolveHits(parts: FrameParts): Resolution {
  let rosterChanged = false;
  let playerDied = false;
  let bossChanged = false;

  for (const hit of parts.collisions.drain()) {
    if (hit.kind === 'player-hit') {
      if (!playerDied && parts.pilot.isVulnerable()) {
        parts.effects.burst(parts.pilot.kill(), PLAYER_WRECK);
        playerDied = true;
        rosterChanged = true;
      }

      continue;
    }

    parts.bullets.remove(hit.bulletId);

    bossChanged = applyDamage(parts, hit).isBoss || bossChanged;
    rosterChanged = true;
  }

  return { rosterChanged, playerDied, bossChanged };
}

/**
 * The end of a round, which is now two events rather than one.
 *
 * "Last wave sent and the field clear" used to mean the round was over. It now
 * means the *waves* are over and the boss is due, and only the boss's death
 * ends the round. Both are read from the director's phase rather than inferred
 * from the field being empty, because the field is also empty on the frame
 * between the last mob dying and the boss arriving.
 */
function advancePhase(parts: FrameParts) {
  if (parts.director.phase() === 'boss') {
    if (parts.boss.present()) {
      return { roundAdvanced: false, bossChanged: false };
    }

    parts.director.nextRound();

    return { roundAdvanced: true, bossChanged: true };
  }

  if (!parts.director.isDrained() || parts.enemies.count() > 0) {
    return { roundAdvanced: false, bossChanged: false };
  }

  parts.director.beginBoss();
  parts.boss.summon(parts.director.round());

  return { roundAdvanced: false, bossChanged: true };
}

/** Everyone who is due to arrive, arrives. */
function spawnDue(parts: FrameParts, elapsed: number): void {
  for (const spawn of parts.director.advance(elapsed)) {
    parts.enemies.spawn(spawn);
  }
}

function onePass(parts: FrameParts, elapsed: number): FrameResult {
  const boosts = boostsForRound(parts.director.round());

  spawnDue(parts, elapsed);

  const fromEnemies = parts.enemies.advance(elapsed, {
    speed: boosts.speed.multiplier,
    power: boosts.power.multiplier,
  });

  const fromBoss = parts.boss.advance(elapsed, { power: boosts.power.multiplier });

  const fired = parts.bullets.add([
    ...parts.pilot.advance(elapsed),
    ...fromEnemies.shots,
    ...fromBoss.shots,
  ]);

  const flew = parts.bullets.advance(elapsed);
  const faded = parts.effects.advance(elapsed);

  // Contacts are reported during the update, so they can only be drained after
  // it — which is why resolveHits comes below rather than above.
  Engine.update(parts.engine, elapsed * 1000);

  const resolved = resolveHits(parts);
  const phase = advancePhase(parts);

  return {
    rosterChanged: fired
      || flew
      || faded
      || fromEnemies.changed
      || resolved.rosterChanged
      // The beam appearing and disappearing is a roster change: it is drawn
      // from the roster like everything else on the field.
      || fromBoss.changed
      || phase.bossChanged
      || resolved.bossChanged,
    playerDied: resolved.playerDied,
    roundAdvanced: phase.roundAdvanced,
    bossChanged: fromBoss.changed || resolved.bossChanged || phase.bossChanged,
  };
}

/**
 * A frame, resolved in several passes.
 *
 * Everything downstream sees one result — the flags are ORed across passes, so
 * a death or a spawn anywhere in the frame is reported once. Splitting the time
 * rather than the work keeps every rate intact: the cadences, the schedule and
 * the difficulty all advance by the same total elapsed either way.
 */
export function stepFrame(parts: FrameParts, elapsed: number): FrameResult {
  const slice = elapsed / COLLISION_PASSES;

  const total: FrameResult = {
    rosterChanged: false,
    playerDied: false,
    roundAdvanced: false,
    bossChanged: false,
  };

  for (let pass = 0; pass < COLLISION_PASSES; pass += 1) {
    const result = onePass(parts, slice);

    total.rosterChanged = total.rosterChanged || result.rosterChanged;
    total.playerDied = total.playerDied || result.playerDied;
    total.roundAdvanced = total.roundAdvanced || result.roundAdvanced;
    total.bossChanged = total.bossChanged || result.bossChanged;
  }

  return total;
}
