import { Body, Composite } from 'matter-js';
import type { Engine } from 'matter-js';

import {
  BEAM_LENGTH,
  BOSS_ALTITUDE,
  BOSS_ENTRY_SPEED,
  BOSS_STATS,
  bossMuzzleOffset,
  createBeam,
  createBoss,
  rollBossScale,
} from '../entities';
import { FIELD_HEIGHT, FIELD_WIDTH } from '../field';
import type { Point } from '../field';
import { durationOf, rollAttackSeed, windUpOf } from './attacks';
import { attackOf, newDuel, stepStance } from './stances';
import type { BossField, BossRecord, Duel } from './types';

/** Where it comes in from, just above the field. */
const ENTRY_Y = -BOSS_STATS.radius;

/** The patrol box, and the two rates that trace it. Bounded: it has no exit. */
const PATROL_REACH_X = 150;
const PATROL_REACH_Y = 90;
const PATROL_RATE_X = 0.09;
const PATROL_RATE_Y = 0.14;

/** What each round past the first adds to its hit points. */
const HP_PER_ROUND = 650;

/** How long the flight in takes, and so where the patrol's clock starts. */
const ARRIVAL_SECONDS = (BOSS_ALTITUDE - ENTRY_Y) / BOSS_ENTRY_SPEED;

/** How low the ram carries the boss's centre, and how far it recoils first. */
const RAM_FLOOR = FIELD_HEIGHT - 40;
const RAM_RECOIL = 70;

/** Hit points for a round, at a body size. Linear in both. */
export function bossHpFor(round: number, scale: number): number {
  return (BOSS_STATS.hp + Math.max(round - 1, 0) * HP_PER_ROUND) * scale;
}

/** True once it has flown far enough to be at its station. */
function hasArrived(duel: Duel): boolean {
  return ENTRY_Y + duel.travelled >= BOSS_ALTITUDE;
}

/** How far the ram has displaced the boss from its patrol, this frame. */
function ramOffset(duel: Duel, patrol: Point): Point {
  if (attackOf(duel) !== 'ram') {
    return { x: 0, y: 0 };
  }

  if (duel.stance === 'winding') {
    return { x: 0, y: -RAM_RECOIL * Math.min(duel.since / windUpOf('ram'), 1) };
  }

  if (duel.stance !== 'firing' || duel.aimedX === null) {
    return { x: 0, y: 0 };
  }

  const progress = Math.min(duel.since / durationOf('ram'), 1);
  const reach = Math.sin(progress * Math.PI);

  return {
    x: (duel.aimedX - patrol.x) * reach,
    // To the floor from wherever the patrol is, with the recoil bled off across it.
    y: (RAM_FLOOR - patrol.y) * reach - RAM_RECOIL * (1 - progress),
  };
}

/** Where the boss is: flying in is a distance, patrolling is a function of age. */
function positionOf(duel: Duel): Point {
  if (!hasArrived(duel)) {
    return { x: FIELD_WIDTH / 2, y: ENTRY_Y + duel.travelled };
  }

  const onStation = duel.age - ARRIVAL_SECONDS;

  // The size divides the rate — that is where "smaller is faster" lives.
  const rateX = PATROL_RATE_X / duel.scale;
  const rateY = PATROL_RATE_Y / duel.scale;

  const patrolX = FIELD_WIDTH / 2
    + Math.sin(onStation * rateX * Math.PI * 2) * PATROL_REACH_X;

  // `1 - cos` runs 0→2, so it can only ever dip below its altitude.
  const patrolY = BOSS_ALTITUDE
    + (1 - Math.cos(onStation * rateY * Math.PI * 2)) * (PATROL_REACH_Y / 2);

  const dive = ramOffset(duel, { x: patrolX, y: patrolY });

  return { x: patrolX + dive.x, y: patrolY + dive.y };
}

export function createBossField(engine: Engine): BossField {
  let body: Body | null = null;
  let beam: Body | null = null;
  let duel: Duel | null = null;

  /** The beam is opened and closed by the state machine, never by this module. */
  const control = {
    open(muzzle: Point) {
      beam = createBeam(muzzle.x, muzzle.y);
      Composite.add(engine.world, beam);
    },

    close() {
      if (!beam) {
        return;
      }

      Composite.remove(engine.world, beam);
      beam = null;
    },
  };

  const dismiss = (): void => {
    control.close();

    if (body) {
      Composite.remove(engine.world, body);
      body = null;
    }

    duel = null;
  };

  return {
    summon(round, scale = rollBossScale(), seed = rollAttackSeed()) {
      if (duel) {
        return;
      }

      body = createBoss(FIELD_WIDTH / 2, ENTRY_Y, scale);
      duel = newDuel(seed, bossHpFor(round, scale), scale);

      Composite.add(engine.world, body);
    },

    owns: (id) => body !== null && body.id === id,

    damage(amount) {
      if (!duel || !body) {
        return null;
      }

      // Shielded while it arrives, and the damage is discarded, not banked: see #8.
      if (duel.stance === 'entering') {
        return null;
      }

      duel.hp -= amount;

      if (duel.hp > 0) {
        return null;
      }

      const wreck = { x: body.position.x, y: body.position.y };

      dismiss();

      return wreck;
    },

    advance(elapsed, conditions) {
      if (!duel || !body) {
        return { changed: false, shots: [] };
      }

      duel.age += elapsed;
      duel.since += elapsed;
      duel.sinceVolley += elapsed;
      // An entrance is a cue rather than a phase of the fight, so it has its own speed.
      const pace = hasArrived(duel) ? BOSS_STATS.speed : BOSS_ENTRY_SPEED;

      duel.travelled += pace * elapsed;

      const at = positionOf(duel);

      Body.setPosition(body, at);

      // The beam hangs from the nose, re-placed every frame so it tracks the patrol.
      if (beam) {
        const hang = bossMuzzleOffset(duel.scale) + BEAM_LENGTH / 2;

        Body.setPosition(beam, { x: at.x, y: at.y + hang });
      }

      const step = {
        duel,
        at,
        power: conditions.power,
        playerX: conditions.playerX,
        beam: control,
      };

      return stepStance(step, hasArrived(duel));
    },

    bodies: () => [body, beam].filter((one): one is Body => one !== null),

    records() {
      const on: BossRecord[] = body ? [{ id: body.id, kind: 'boss' }] : [];

      return beam ? [...on, { id: beam.id, kind: 'beam' }] : on;
    },

    snapshot() {
      if (!duel || !body) {
        return null;
      }

      return {
        id: body.id,
        // Floored at zero: the killing shot takes it negative.
        hp: Math.max(duel.hp, 0),
        maxHp: duel.maxHp,
        stance: duel.stance,
        scale: duel.scale,
        // Absent while entering: there is nothing to telegraph yet.
        ...(duel.stance === 'entering' ? {} : { attack: attackOf(duel) }),
      };
    },

    present: () => duel !== null,

    clear: dismiss,
  };
}
