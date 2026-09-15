import type { Body } from 'matter-js';

import type { Point } from '../field';
import type { BulletSpawn, PatternKind } from '../patterns';

/** The boss's moves: the three shapes the trash mobs use, plus two of its own. */
export type BossAttack = PatternKind | 'beam' | 'ram';

/** What the boss is doing right now. Every attack is announced by `winding`. */
export type BossStance = 'entering' | 'winding' | 'firing' | 'recovering';

export interface AttackShape {
  /** Seconds of tell before anything leaves the boss. */
  windUp: number;
  /** Seconds the attack lasts once it starts. */
  duration: number;
  /** Seconds between volleys while it fires. The beam ignores this. */
  cadence: number;
}

/** What React is shown. The only hit points in the game that leave the engine. */
export interface BossSnapshot {
  /** The body's id, so whoever draws the bar can subscribe to its transform. */
  id: number;
  hp: number;
  maxHp: number;
  stance: BossStance;
  /** What it is winding up or firing. Absent while it is still entering. */
  attack?: BossAttack;
  /** The body size it was rolled at, so the drawing matches the hit circle. */
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

/** What the boss needs to know about this frame. */
export interface BossConditions {
  /** Multiplies bullet damage. From the round. */
  power: number;
  /** The player's column. Read by the ram, at one instant, and by nothing else. */
  playerX: number;
}

export interface BossField {
  /** Put the boss on the field for a round, at a rolled size and attack order. */
  summon: (round: number, scale?: number, seed?: number) => void;
  /** True if this body id is the boss's, so damage reaches the right owner. */
  owns: (id: number) => boolean;
  /** Subtract hit points. Returns where the wreck was if that killed it, else null. */
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

/** What the boss is made of while it is alive. */
export interface Duel {
  hp: number;
  maxHp: number;
  /** Seconds since it entered — what the patrol is a function of. */
  age: number;
  /** Distance flown on the way in, before it settles. */
  travelled: number;
  stance: BossStance;
  /** Seconds spent in the current stance. */
  since: number;
  /** Which attack of the fight this is. Feeds `attackAt`. */
  index: number;
  /** Seconds since the last volley of the current attack. */
  sinceVolley: number;
  /** Volleys thrown by the current attack, so the first is never delayed. */
  volleys: number;
  /** What its attack order is derived from, rolled per duel: see #44. */
  seed: number;
  /** The body size it was rolled at, 0.8–2.0. Divides the patrol rate and cadence. */
  scale: number;
  /** The column a ram is committed to, locked when its wind-up ends. Null otherwise. */
  aimedX: number | null;
}

/** The beam, as the two things the machine can do to it — never as a body. */
export interface BeamControl {
  /** Takes the muzzle position, not the boss's centre. */
  open: (muzzle: Point) => void;
  close: () => void;
}

/** Everything one step of the machine needs, as one argument. */
export interface StanceStep {
  duel: Duel;
  /** Where the boss is this frame, so a volley leaves the right place. */
  at: Point;
  /** The round's power multiplier, applied to bullet damage. */
  power: number;
  /** Where the player is, which only the ram reads, and only once. */
  playerX: number;
  beam: BeamControl;
}

export interface StanceResult {
  /** The stance changed, or the beam opened or closed. React needs telling. */
  changed: boolean;
  shots: BulletSpawn[];
}
