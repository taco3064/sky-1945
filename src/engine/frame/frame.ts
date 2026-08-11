import { Engine } from 'matter-js';

import { boostsForRound } from '../boosts';
import type { BossField } from '../boss';
import type { BulletField } from '../bullets';
import type { CollisionWatch, Hit } from '../collisions';
import type { Director } from '../director';
import type { EffectField } from '../effects';
import type { EnemyField } from '../enemies';
import type { Pilot } from '../pilot';

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
  /** The boss's bar needs redrawing: damage, stance, arrival or death. */
  bossChanged: boolean;
}

/** How many collision passes one frame is split into, so nothing tunnels through. */
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

/** Damage, delivered to whichever field owns the target. Ownership is asked first. */
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

/** Turn this frame's contacts into consequences. */
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

/** The end of a round, which is two events rather than one: see #8. */
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

  // The ram aims at the player, so the moment travels with the round's difficulty.
  const fromBoss = parts.boss.advance(elapsed, {
    power: boosts.power.multiplier,
    playerX: parts.pilot.body.position.x,
  });

  const fired = parts.bullets.add([
    ...parts.pilot.advance(elapsed),
    ...fromEnemies.shots,
    ...fromBoss.shots,
  ]);

  const flew = parts.bullets.advance(elapsed);
  const faded = parts.effects.advance(elapsed);

  // Contacts are reported during the update, so they can only be drained after it.
  Engine.update(parts.engine, elapsed * 1000);

  const resolved = resolveHits(parts);
  const phase = advancePhase(parts);

  return {
    rosterChanged: fired
      || flew
      || faded
      || fromEnemies.changed
      || resolved.rosterChanged
      // The beam is drawn from the roster, so it appearing is a roster change.
      || fromBoss.changed
      || phase.bossChanged
      || resolved.bossChanged,
    playerDied: resolved.playerDied,
    roundAdvanced: phase.roundAdvanced,
    bossChanged: fromBoss.changed || resolved.bossChanged || phase.bossChanged,
  };
}

/** A frame, resolved in several passes. The flags are ORed across them. */
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
