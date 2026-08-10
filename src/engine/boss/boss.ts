import { Body, Composite } from 'matter-js';
import type { Engine } from 'matter-js';

import {
  BEAM_LENGTH,
  BOSS_ALTITUDE,
  BOSS_STATS,
  bossMuzzleOffset,
  createBeam,
  createBoss,
} from '../entities';
import { FIELD_WIDTH } from '../field';
import type { Point } from '../field';
import type { BulletSpawn } from '../patterns';
import type { BossAttack, BossStance } from './attacks';
import { attackOf, newDuel, stepStance } from './stances';
import type { Duel } from './stances';

/**
 * The boss: one aircraft, its own module.
 *
 * It is not a fourth entry in the enemy field, and the reason is not size. A
 * trash mob is a body on a path whose life ends when it flies off the screen;
 * the boss enters, stays, works through a sequence of announced attacks, and
 * ends only when it dies. Its hit points are the one number in the simulation
 * that React is told (#8) — every other point of damage stays down here.
 *
 * Folding that into `../enemies` would have meant `advanceOne` opening with a
 * test for which kind it was holding, and a path table with one entry that must
 * never leave the field. Two modules that each say one true thing beat one
 * module with an exception in it.
 *
 * This half owns the bodies and the hit points; `./stances` owns what happens
 * next and touches no body at all.
 */

/** Where it comes in from, just above the field. */
const ENTRY_Y = -BOSS_STATS.radius;

/** How far it patrols either side of centre, and how slowly. */
const PATROL_REACH = 150;
const PATROL_RATE = 0.09;

/** What each round past the first adds to its hit points. */
const HP_PER_ROUND = 650;

/**
 * How long the flight in takes — and therefore where the patrol's clock starts.
 *
 * Derived rather than stored, because it is already implied by the distance and
 * the speed, and a stored copy could disagree with them.
 *
 * Subtracting it is what makes the two regimes meet. Without it the patrol reads
 * `sin` of an age that has already been running for the whole descent, which at
 * these numbers is `sin(1.27) ≈ 0.95` — so the boss finished its entrance in the
 * centre and then teleported 143 units to the right on its first patrolling
 * frame. Reported from play, and the tell is that it only ever jumped once.
 */
const ARRIVAL_SECONDS = (BOSS_ALTITUDE - ENTRY_Y) / BOSS_STATS.speed;

/** What React is shown. The only hit points in the game that leave the engine. */
export interface BossSnapshot {
  /** The body's id, so whoever draws the bar can subscribe to its transform. */
  id: number;
  hp: number;
  maxHp: number;
  stance: BossStance;
  /** What it is winding up or firing. Absent while it is still entering. */
  attack?: BossAttack;
}

export interface BossAdvance {
  /** Its stance or the beam's existence changed — React needs telling. */
  changed: boolean;
  /** Volleys fired this frame, for the bullet field to carry. */
  shots: BulletSpawn[];
}

/** One thing the boss put on the field. */
export interface BossRecord {
  id: number;
  /** The beam is a roster entry of its own: React draws it, so React is told. */
  kind: 'boss' | 'beam';
}

export interface BossBoosts {
  /** Multiplies bullet damage. From the round. */
  power: number;
}

export interface BossField {
  /** Put the boss on the field for a round. Summoning twice is a no-op. */
  summon: (round: number) => void;
  /** True if this body id is the boss's, so damage reaches the right owner. */
  owns: (id: number) => boolean;
  /**
   * Subtract hit points.
   *
   * Returns where the wreck was if that killed it, and null otherwise — the same
   * contract `../enemies` uses, so the frame's damage handling reads the same
   * whichever field owns the target.
   */
  damage: (amount: number) => Point | null;
  /** Move, wind up, and fire what is due. */
  advance: (elapsed: number, boosts: BossBoosts) => BossAdvance;
  /** Live bodies — the boss and, while it is firing one, its beam. */
  bodies: () => Body[];
  /** What is on the field and what each thing is, for the roster. */
  records: () => BossRecord[];
  /** What React is shown, or null when there is no boss. */
  snapshot: () => BossSnapshot | null;
  /** True between summon and death. */
  present: () => boolean;
  /** Remove everything. */
  clear: () => void;
}

/** Hit points for a round. Linear, like every other difficulty curve here. */
export function bossHpFor(round: number): number {
  return BOSS_STATS.hp + Math.max(round - 1, 0) * HP_PER_ROUND;
}

/** True once it has flown far enough to be at its station. */
function hasArrived(duel: Duel): boolean {
  return ENTRY_Y + duel.travelled >= BOSS_ALTITUDE;
}

/**
 * Where the boss is.
 *
 * Two regimes rather than a path from `../paths`, because every path in that
 * module must eventually leave the field and this one must never do so. Flying
 * in is a distance; patrolling is a function of age, so it keeps the same rhythm
 * however long the fight runs.
 *
 * Its speed is deliberately *not* multiplied by the round's boost. A harder
 * round gives the boss more hit points and harder-hitting bullets; patrolling
 * faster as well would eventually make the fight unreadable rather than longer.
 *
 * The two regimes have to *meet*: the patrol's phase is measured from the moment
 * it arrives, so its first patrolling frame is `sin(0)` — dead centre, which is
 * exactly where the descent left it.
 */
function positionOf(duel: Duel): Point {
  if (!hasArrived(duel)) {
    return { x: FIELD_WIDTH / 2, y: ENTRY_Y + duel.travelled };
  }

  const onStation = duel.age - ARRIVAL_SECONDS;

  return {
    x: FIELD_WIDTH / 2 + Math.sin(onStation * PATROL_RATE * Math.PI * 2) * PATROL_REACH,
    y: BOSS_ALTITUDE,
  };
}

export function createBossField(engine: Engine): BossField {
  let body: Body | null = null;
  let beam: Body | null = null;
  let duel: Duel | null = null;

  /** The beam is opened and closed by the state machine, never by it directly. */
  const control = {
    open(at: Point) {
      beam = createBeam(at.x, at.y + bossMuzzleOffset());
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
    summon(round) {
      if (duel) {
        return;
      }

      body = createBoss(FIELD_WIDTH / 2, ENTRY_Y);
      duel = newDuel(round, bossHpFor(round));

      Composite.add(engine.world, body);
    },

    owns: (id) => body !== null && body.id === id,

    damage(amount) {
      if (!duel || !body) {
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

    advance(elapsed, boosts) {
      if (!duel || !body) {
        return { changed: false, shots: [] };
      }

      duel.age += elapsed;
      duel.since += elapsed;
      duel.sinceVolley += elapsed;
      duel.travelled += BOSS_STATS.speed * elapsed;

      const at = positionOf(duel);

      Body.setPosition(body, at);

      // The beam hangs from the nose, so its centre is half a beam below it —
      // re-placed every frame, which is what makes it track the patrol.
      if (beam) {
        const hang = bossMuzzleOffset() + BEAM_LENGTH / 2;

        Body.setPosition(beam, { x: at.x, y: at.y + hang });
      }

      const step = { duel, at, power: boosts.power, beam: control };

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
        // Floored at zero: the killing shot takes it negative, and the bar is
        // published from the same frame that reports the death.
        hp: Math.max(duel.hp, 0),
        maxHp: duel.maxHp,
        stance: duel.stance,
        // Absent while entering. There is nothing to telegraph yet, and naming
        // an attack before the boss is on screen is a tell for something the
        // player has no way to answer.
        ...(duel.stance === 'entering' ? {} : { attack: attackOf(duel) }),
      };
    },

    present: () => duel !== null,

    clear: dismiss,
  };
}
