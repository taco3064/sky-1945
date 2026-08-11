import { BOSS_STATS, bossMuzzleOffset } from '../entities';
import { shotsFor } from '../patterns';
import type { BulletSpawn } from '../patterns';
import type { BossAttack, BossStance, Duel, StanceResult, StanceStep } from './types';
import {
  RECOVER_SECONDS,
  attackAt,
  cadenceOf,
  durationOf,
  windUpOf,
} from './attacks';

/** Down the screen, in the degrees `../patterns` speaks. */
const DOWNWARD = 90;

/** Bullet speed. Fixed, unlike a mob's — a boss cannot outrun its own fire. */
const BOSS_BULLET_SPEED = 320;

/** Nothing to report. */
const HELD: StanceResult = { changed: false, shots: [] };

/** A fresh fight, at the top of the screen with nothing charged. */
export function newDuel(round: number, hp: number, scale: number): Duel {
  return {
    hp,
    maxHp: hp,
    scale,
    age: 0,
    travelled: 0,
    stance: 'entering',
    since: 0,
    index: 0,
    sinceVolley: 0,
    volleys: 0,
    round,
    aimedX: null,
  };
}

/** The attack it is on. */
export function attackOf(duel: Duel): BossAttack {
  return attackAt(duel.round, duel.index);
}

/** Move to a stance, resetting everything measured within one. */
function enter(duel: Duel, stance: BossStance): void {
  duel.stance = stance;
  duel.since = 0;
  duel.sinceVolley = 0;
  duel.volleys = 0;
}

/** Whether the current attack owes a volley right now. */
function volleyDue(duel: Duel): boolean {
  // The first one is never held back, or the tell would look like a lie.
  return duel.volleys === 0
    || duel.sinceVolley >= cadenceOf(attackOf(duel)) / duel.scale;
}

/** One volley of whichever shape is firing. A radial burst leaves the centre. */
function volley(step: StanceStep): BulletSpawn[] {
  const attack = attackOf(step.duel);

  if (attack !== 'straight' && attack !== 'spread' && attack !== 'radial') {
    return [];
  }

  const reach = attack === 'radial' ? 0 : bossMuzzleOffset(step.duel.scale);

  return shotsFor({
    kind: attack,
    x: step.at.x,
    y: step.at.y + reach,
    speed: BOSS_BULLET_SPEED,
    damage: BOSS_STATS.damage * step.power,
    side: 'enemy',
    heading: DOWNWARD,
  });
}

/** Flying in. Ends the moment it reaches its altitude, which the caller knows. */
function stepEntering(duel: Duel, arrived: boolean): StanceResult {
  if (!arrived) {
    return HELD;
  }

  enter(duel, 'winding');

  return { changed: true, shots: [] };
}

/** The tell. Nothing leaves the boss until it is over. */
function stepWinding(step: StanceStep): StanceResult {
  if (step.duel.since < windUpOf(attackOf(step.duel))) {
    return HELD;
  }

  const opening = attackOf(step.duel);

  enter(step.duel, 'firing');

  if (opening === 'beam') {
    step.beam.open({
      x: step.at.x,
      y: step.at.y + bossMuzzleOffset(step.duel.scale),
    });
  }

  // The ram commits to a column here and nowhere else: the last moment to move.
  step.duel.aimedX = opening === 'ram' ? step.playerX : null;

  return { changed: true, shots: [] };
}

/** Firing: the beam is held throughout, the shapes throw a volley per cadence. */
function stepFiring(step: StanceStep): StanceResult {
  if (step.duel.since >= durationOf(attackOf(step.duel))) {
    step.beam.close();
    step.duel.aimedX = null;
    enter(step.duel, 'recovering');

    return { changed: true, shots: [] };
  }

  if (!volleyDue(step.duel)) {
    return HELD;
  }

  step.duel.sinceVolley = 0;
  step.duel.volleys += 1;

  return { changed: false, shots: volley(step) };
}

/** Resting. Ends by picking up the next attack. */
function stepRecovering(duel: Duel): StanceResult {
  if (duel.since < RECOVER_SECONDS) {
    return HELD;
  }

  duel.index += 1;
  enter(duel, 'winding');

  return { changed: true, shots: [] };
}

/** Advance the fight by one slice. `arrived` is the caller's answer, not ours. */
export function stepStance(step: StanceStep, arrived: boolean): StanceResult {
  if (step.duel.stance === 'entering') {
    return stepEntering(step.duel, arrived);
  }

  if (step.duel.stance === 'winding') {
    return stepWinding(step);
  }

  if (step.duel.stance === 'firing') {
    return stepFiring(step);
  }

  return stepRecovering(step.duel);
}
