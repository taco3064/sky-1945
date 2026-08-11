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
import type { BulletSpawn } from '../patterns';
import type { BossAttack, BossStance } from './attacks';
import { durationOf, windUpOf } from './attacks';
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

/**
 * The patrol box, and the two rates that trace it.
 *
 * One sine per axis at rates that do not divide into each other, so the path is a
 * Lissajous figure rather than a line: it wanders the box and does not repeat on
 * any short cycle. A boss that only slid left and right could be parked under —
 * the player picks a column, holds it, and the fight becomes a stationary trade.
 *
 * Both reaches are bounded, which is what keeps the invariant that the boss never
 * leaves the field: it is the one craft in the game with no exit.
 */
const PATROL_REACH_X = 150;
const PATROL_REACH_Y = 90;
const PATROL_RATE_X = 0.09;
const PATROL_RATE_Y = 0.14;

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
const ARRIVAL_SECONDS = (BOSS_ALTITUDE - ENTRY_Y) / BOSS_ENTRY_SPEED;

/**
 * How low the ram carries the boss's centre, and how far it recoils first.
 *
 * A floor rather than a depth, and that is the fix: as a fixed displacement the
 * dive bottomed out around 55% of the field and left a band along the bottom edge
 * where standing still was safe. Reported as exactly that — space left for someone
 * to hide in. Measured from the boss's actual position each frame, it now reaches
 * the same row whatever its patrol was doing, and the only answers are sideways or
 * a roll.
 *
 * Short of the very bottom so the boss's *centre* stays on the field. The body
 * overhangs the edge, which is the point: a large one covers the player's whole
 * row.
 *
 * The recoil is the tell — the boss pulls *back* before it commits, the opposite
 * motion to the attack and therefore unmistakable.
 */
const RAM_FLOOR = FIELD_HEIGHT - 40;
const RAM_RECOIL = 70;

/** What React is shown. The only hit points in the game that leave the engine. */
export interface BossSnapshot {
  /** The body's id, so whoever draws the bar can subscribe to its transform. */
  id: number;
  hp: number;
  maxHp: number;
  stance: BossStance;
  /** What it is winding up or firing. Absent while it is still entering. */
  attack?: BossAttack;
  /**
   * The body size it was rolled at, so the drawing matches the hit circle.
   *
   * The one number here that exists for the picture rather than for the fight — and
   * it has to be published, because `components` cannot reach the engine to ask.
   */
  scale: number;
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

/**
 * What the boss needs to know about this frame.
 *
 * Not called `BossBoosts` any more, and the rename is the point: the ram has to
 * know where the player is, and a player's position is not a difficulty
 * multiplier. One is a property of the round, the other of the moment.
 */
export interface BossConditions {
  /** Multiplies bullet damage. From the round. */
  power: number;
  /** The player's column. Read by the ram, at one instant, and by nothing else. */
  playerX: number;
}

export interface BossField {
  /**
   * Put the boss on the field for a round, at a rolled body size.
   *
   * The size is a parameter with a default rather than an internal roll, so play
   * gets a different boss each time and every test states the one it means.
   * Summoning twice is a no-op.
   */
  summon: (round: number, scale?: number) => void;
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
  advance: (elapsed: number, conditions: BossConditions) => BossAdvance;
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

/**
 * Hit points for a round, at a body size. Linear in both, like every other
 * difficulty curve here.
 *
 * Scaling by size is a correction, not a flourish. The reasoning that left it out
 * was wrong twice over: the guess was that a larger body is an easier target, so
 * more of the player's fire connects — but the two cannons sit 26 units apart and
 * the *smallest* hit circle is 41 in radius, so both trails connect at every size.
 * Hit rate does not move with size at all.
 *
 * What does move is time on target. A large boss patrols slower (its rate is
 * divided by this), so the player can hold a column under it and keep firing, where
 * a small one has to be chased. Without this, the size that fires the most was also
 * the size that died the soonest — the trade ran the same way twice instead of
 * pulling against itself.
 */
export function bossHpFor(round: number, scale: number): number {
  return (BOSS_STATS.hp + Math.max(round - 1, 0) * HP_PER_ROUND) * scale;
}

/** True once it has flown far enough to be at its station. */
function hasArrived(duel: Duel): boolean {
  return ENTRY_Y + duel.travelled >= BOSS_ALTITUDE;
}

/**
 * How far the ram has displaced the boss from its patrol, this frame.
 *
 * An offset added on top of the patrol rather than a position of its own, so it
 * composes with the two-axis wander instead of replacing it — and so the boss is
 * back on its patrol the instant the attack ends, with no seam to reconcile.
 *
 * Out and back on half a sine: it accelerates in, reaches its depth at the middle
 * of the attack, and returns. A dive that snapped back would read as a teleport,
 * and this engine has already shipped one of those.
 */
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
    /*
     * Out and back on both axes, from the same half sine.
     *
     * The sideways slide used to be `× progress`, which put the boss exactly on
     * the player's column at the end of the dive and then snapped it back to its
     * patrol on the next frame — a 138-unit jump, caught by the continuity test
     * rather than by any assertion about the ram itself. Sharing `reach` means
     * the dive and the return are one motion, and the attack ends where the
     * patrol already is.
     */
    x: (duel.aimedX - patrol.x) * reach,
    // Measured to the floor from wherever the patrol has the boss, so the dive
    // always arrives at the same row. The recoil is bled off linearly across it, so
    // the position picks up exactly where the wind-up left it rather than stepping
    // back to zero.
    y: (RAM_FLOOR - patrol.y) * reach - RAM_RECOIL * (1 - progress),
  };
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

  /*
   * The body size divides the patrol's rate, and *that* is where "smaller is
   * faster" lives.
   *
   * It was first written as a division on `BOSS_STATS.speed`, which does nothing:
   * the patrol is a function of age, not of distance travelled, so that constant
   * stops mattering the moment the boss arrives. The size test caught it — two
   * bosses at opposite ends of the range swept exactly the same span.
   *
   * Dividing the rate rather than the reach is deliberate. A small boss covers its
   * box quicker; it does not cover a *larger* box, so the field's bounds hold
   * without a second thought.
   */
  const rateX = PATROL_RATE_X / duel.scale;
  const rateY = PATROL_RATE_Y / duel.scale;

  const patrolX = FIELD_WIDTH / 2
    + Math.sin(onStation * rateX * Math.PI * 2) * PATROL_REACH_X;

  // Starts at its altitude and only ever dips below it: `1 - cos` runs 0→2, so
  // the boss cannot back out through the top of the field on the vertical axis.
  const patrolY = BOSS_ALTITUDE
    + (1 - Math.cos(onStation * rateY * Math.PI * 2)) * (PATROL_REACH_Y / 2);

  // The ram is an offset on top of the patrol, never a position of its own, so
  // the boss is back on its wander the instant the attack ends.
  const dive = ramOffset(duel, { x: patrolX, y: patrolY });

  return { x: patrolX + dive.x, y: patrolY + dive.y };
}

export function createBossField(engine: Engine): BossField {
  let body: Body | null = null;
  let beam: Body | null = null;
  let duel: Duel | null = null;

  /**
   * The beam is opened and closed by the state machine, never by it directly.
   *
   * `open` takes the muzzle position already worked out, rather than the boss's
   * centre plus a size to offset it by. That kept an unreachable `?? 1` out of here:
   * the machine only ever opens a beam mid-fight, so there is no case where the size
   * is unknown — and a branch that cannot run is a branch no test can justify.
   */
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
    summon(round, scale = rollBossScale()) {
      if (duel) {
        return;
      }

      body = createBoss(FIELD_WIDTH / 2, ENTRY_Y, scale);
      duel = newDuel(round, bossHpFor(round, scale), scale);

      Composite.add(engine.world, body);
    },

    owns: (id) => body !== null && body.id === id,

    damage(amount) {
      if (!duel || !body) {
        return null;
      }

      /*
       * Shielded while it arrives.
       *
       * It used to descend at its patrol speed, unable to move or fire, and be
       * shot the whole way down — at full loadout power that was half its health
       * before the fight started. Reported from play as being handed a free
       * target.
       *
       * Discarded rather than banked: damage dealt to something that cannot fight
       * back should not arrive later either. The bar has to say so, or a health
       * bar that does not move reads as a broken game rather than as a rule —
       * which is why `snapshot` publishes the stance alongside it.
       */
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
      // The flight in has its own speed: quicker than the patrol, because an
      // entrance is a cue rather than a phase of the fight. Where the body size
      // enters is the patrol's *rate* — see `positionOf`.
      const pace = hasArrived(duel) ? BOSS_STATS.speed : BOSS_ENTRY_SPEED;

      duel.travelled += pace * elapsed;

      const at = positionOf(duel);

      Body.setPosition(body, at);

      // The beam hangs from the nose, so its centre is half a beam below it —
      // re-placed every frame, which is what makes it track the patrol.
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
        // Floored at zero: the killing shot takes it negative, and the bar is
        // published from the same frame that reports the death.
        hp: Math.max(duel.hp, 0),
        maxHp: duel.maxHp,
        stance: duel.stance,
        scale: duel.scale,
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
