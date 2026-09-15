import { type Bullet, type FirePattern, fireVolley } from '../bullets';
import type { Point } from '../field';
import { type BossAttack, attackAt } from './attackOrder';

export type BossPose = 'entering' | 'winding' | 'firing' | 'recovering';

/** Drawn nose-up and turned over by this angle, like every enemy (game-spec 8.4). */
export const BOSS_ANGLE = 180;

const ENTRY_X = 270;
const ENTRY_Y = -52;
const ENTRY_SPEED = 420;
const ARRIVAL_Y = 150;
/** `(150 + 52) / 420` s from appearing to arrival. */
export const ENTRY_DURATION = (ARRIVAL_Y - ENTRY_Y) / ENTRY_SPEED;

const PATROL_REACH = 150;
const PATROL_DEPTH = 45;
const PATROL_FREQUENCY_X = 0.09;
const PATROL_FREQUENCY_Y = 0.14;

const BASE_HP = 900;
const HP_PER_ROUND = 650;
const HIT_RADIUS = 52;
const MUZZLE_OFFSET = 66;

const MIN_SIZE = 0.8;
const SIZE_RANGE = 1.2;
const SEED_RANGE = 0xffffffff;

const RECOVERY = 0.4;
const BULLET_SPEED = 320;
const BULLET_DAMAGE = 14;
const FIRE_HEADING = 90;

const RAM_RECOIL = 70;
const RAM_DEPTH = 920;

/** The beam's hit rectangle is exactly its drawn footprint (game-spec 10.3). */
export const BEAM_WIDTH = 88;
export const BEAM_LENGTH = 1000;

interface AttackTiming {
  windUp: number;
  duration: number;
  /** Seconds between volleys at size 1; beam and ram fire no volleys. */
  cadence?: number;
}

/** game-spec 12.9.6 */
const ATTACK_TIMINGS: Record<BossAttack, AttackTiming> = {
  straight: { windUp: 0.45, duration: 1.5, cadence: 0.08 },
  spread: { windUp: 0.6, duration: 1.4, cadence: 0.25 },
  radial: { windUp: 0.7, duration: 1.2, cadence: 0.28 },
  beam: { windUp: 1.4, duration: 1.1 },
  ram: { windUp: 1.0, duration: 1.3 },
};

export interface Beam {
  readonly id: number;
  /** Centre of the 88 × 1000 u rectangle. */
  x: number;
  y: number;
}

export interface Boss {
  readonly id: number;
  /** The rolled size multiplier `s`, 0.8–2.0. */
  readonly size: number;
  readonly seed: number;
  readonly maxHp: number;
  hp: number;
  x: number;
  y: number;
  /** Seconds since it appeared. */
  age: number;
  pose: BossPose;
  attackIndex: number;
  /** The current attack; the finished one while recovering. */
  attack: BossAttack;
  stanceTime: number;
  volleyTime: number;
  volleyCount: number;
  /** The ram's locked column, from the end of its wind-up until its dive ends. */
  aimedX: number | null;
  beam: Beam | null;
}

export interface BossRoll {
  size: number;
  seed: number;
}

export interface BossPass {
  bullets: Bullet[];
  beamOpened: Beam | null;
  beamClosed: Beam | null;
}

export type BossHit = 'shielded' | 'hit' | 'destroyed';

/** Draws the size first, then the attack seed (game-spec 12.9.1). */
export function rollBoss(random: () => number): BossRoll {
  const size = MIN_SIZE + random() * SIZE_RANGE;
  const seed = Math.floor(random() * SEED_RANGE);

  return { size, seed };
}

/** `(900 + max(round − 1, 0) × 650) × s`. */
export function bossMaxHp(round: number, size: number): number {
  return (BASE_HP + Math.max(round - 1, 0) * HP_PER_ROUND) * size;
}

export function bossHitRadius(boss: Boss): number {
  return HIT_RADIUS * boss.size;
}

/** Below the centre: where straight and spread volleys and the beam top leave. */
export function bossMuzzleOffset(boss: Boss): number {
  return MUZZLE_OFFSET * boss.size;
}

export function createBoss(id: number, round: number, { size, seed }: BossRoll): Boss {
  const maxHp = bossMaxHp(round, size);

  return {
    id,
    size,
    seed,
    maxHp,
    hp: maxHp,
    x: ENTRY_X,
    y: ENTRY_Y,
    age: 0,
    pose: 'entering',
    attackIndex: 0,
    attack: attackAt(seed, 0),
    stanceTime: 0,
    volleyTime: 0,
    volleyCount: 0,
    aimedX: null,
    beam: null,
  };
}

/** One pass: advance timers, move, move the beam, advance the stance machine. */
export function updateBoss(boss: Boss, dt: number, m: number, playerX: number, nextId: () => number): BossPass {
  boss.age += dt;
  boss.stanceTime += dt;
  boss.volleyTime += dt;
  moveBoss(boss);

  if (boss.beam) {
    boss.beam.x = boss.x;
    boss.beam.y = beamCentreY(boss);
  }

  return advanceStance(boss, m, playerX, nextId);
}

/** Player bullets are used up either way; damage only counts once the boss has arrived. */
export function damageBoss(boss: Boss, damage: number): BossHit {
  if (boss.pose === 'entering') {
    return 'shielded';
  }

  boss.hp -= damage;

  return boss.hp <= 0 ? 'destroyed' : 'hit';
}

function beamCentreY(boss: Boss): number {
  return boss.y + bossMuzzleOffset(boss) + BEAM_LENGTH / 2;
}

function moveBoss(boss: Boss): void {
  if (boss.pose === 'entering') {
    boss.x = ENTRY_X;
    boss.y = Math.min(ARRIVAL_Y, ENTRY_Y + ENTRY_SPEED * boss.age);

    return;
  }

  const t = boss.age - ENTRY_DURATION;
  const patrolX = ENTRY_X + Math.sin((2 * Math.PI * t * PATROL_FREQUENCY_X) / boss.size) * PATROL_REACH;
  const patrolY = ARRIVAL_Y + (1 - Math.cos((2 * Math.PI * t * PATROL_FREQUENCY_Y) / boss.size)) * PATROL_DEPTH;
  const offset = ramOffset(boss, patrolX, patrolY);

  boss.x = patrolX + offset.x;
  boss.y = patrolY + offset.y;
}

function ramOffset(boss: Boss, patrolX: number, patrolY: number): Point {
  if (boss.attack !== 'ram') {
    return { x: 0, y: 0 };
  }

  const { windUp, duration } = ATTACK_TIMINGS.ram;

  if (boss.pose === 'winding') {
    return { x: 0, y: -RAM_RECOIL * Math.min(boss.stanceTime / windUp, 1) };
  }

  if (boss.pose !== 'firing' || boss.aimedX === null) {
    return { x: 0, y: 0 };
  }

  const p = Math.min(boss.stanceTime / duration, 1);
  const r = Math.sin(p * Math.PI);

  return {
    x: (boss.aimedX - patrolX) * r,
    y: (RAM_DEPTH - patrolY) * r - RAM_RECOIL * (1 - p),
  };
}

function advanceStance(boss: Boss, m: number, playerX: number, nextId: () => number): BossPass {
  const pass: BossPass = { bullets: [], beamOpened: null, beamClosed: null };
  const timing = ATTACK_TIMINGS[boss.attack];

  switch (boss.pose) {
    case 'entering':
      if (boss.y >= ARRIVAL_Y) {
        changeStance(boss, 'winding');
      }

      break;
    case 'winding':
      if (boss.stanceTime >= timing.windUp) {
        changeStance(boss, 'firing');
        openAttack(boss, playerX, nextId, pass);
      }

      break;
    case 'firing':
      if (boss.stanceTime >= timing.duration) {
        changeStance(boss, 'recovering');
        boss.aimedX = null;
        pass.beamClosed = boss.beam;
        boss.beam = null;
      } else if (timing.cadence !== undefined && (boss.volleyCount === 0 || boss.volleyTime >= timing.cadence / boss.size)) {
        pass.bullets = fireBossVolley(boss, boss.attack as FirePattern, m, nextId);
        boss.volleyTime = 0;
        boss.volleyCount += 1;
      }

      break;
    case 'recovering':
      if (boss.stanceTime >= RECOVERY) {
        boss.attackIndex += 1;
        boss.attack = attackAt(boss.seed, boss.attackIndex);
        changeStance(boss, 'winding');
      }

      break;
  }

  return pass;
}

/** On the pass the wind-up ends: the ram locks the player's column, the beam appears. */
function openAttack(boss: Boss, playerX: number, nextId: () => number, pass: BossPass): void {
  if (boss.attack === 'ram') {
    boss.aimedX = playerX;
  } else if (boss.attack === 'beam') {
    boss.beam = { id: nextId(), x: boss.x, y: beamCentreY(boss) };
    pass.beamOpened = boss.beam;
  }
}

/** Every stance change resets the stance timer and the volley timer and count. */
function changeStance(boss: Boss, pose: BossPose): void {
  boss.pose = pose;
  boss.stanceTime = 0;
  boss.volleyTime = 0;
  boss.volleyCount = 0;
}

function fireBossVolley(boss: Boss, pattern: FirePattern, m: number, nextId: () => number): Bullet[] {
  return fireVolley(
    {
      pattern,
      x: boss.x,
      y: pattern === 'radial' ? boss.y : boss.y + bossMuzzleOffset(boss),
      heading: FIRE_HEADING,
      speed: BULLET_SPEED,
      damage: BULLET_DAMAGE * m,
    },
    nextId,
  );
}
