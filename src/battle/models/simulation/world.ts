import type { Beam, Boss } from '../boss';
import { BOSS_ANGLE, BEAM_LENGTH, BEAM_WIDTH, bossHitRadius } from '../boss';
import { BULLET_HIT_RADIUS, type Bullet } from '../bullets';
import type { Burst } from '../bursts';
import { ENEMY_ANGLE, type Enemy, type Squad, roundSchedule } from '../enemies';
import { ENEMY_KINDS } from '../enemies';
import { PLAYER_HIT_RADIUS, PLAYER_LIVES, type Player, createPlayer } from '../player';
import { type Collisions, addCircle, addRectangle, createCollisions, removeBody } from './collisions';

/** What a physics body stands for. */
export type Collider
  = | { kind: 'player'; player: Player }
    | { kind: 'bullet'; bullet: Bullet }
    | { kind: 'enemy'; enemy: Enemy }
    | { kind: 'boss'; boss: Boss }
    | { kind: 'beam'; beam: Beam };

/** A round is in its wave phase until the boss is summoned. */
export type RoundPhase = 'waves' | 'boss';

export interface World {
  /** Simulated seconds since the run started. */
  time: number;
  round: number;
  phase: RoundPhase;
  /** Runs only in the wave phase. */
  roundClock: number;
  schedule: Squad[];
  /** Index of the next squad to arrive. */
  nextSquad: number;
  lives: number;
  gameOver: boolean;
  readonly player: Player;
  /** Every group is kept in order of creation. */
  bullets: Bullet[];
  enemies: Enemy[];
  boss: Boss | null;
  bursts: Burst[];
  lastId: number;
  readonly collisions: Collisions<Collider>;
  readonly random: () => number;
}

/** A fresh run: round 1, 3 lives, no enemies, the aircraft launching. */
export function createWorld(speedPoints: number, random: () => number): World {
  const collisions = createCollisions<Collider>();
  const player = createPlayer(1, speedPoints, 0);

  addCircle(collisions, player.id, { kind: 'player', player }, player.x, player.y, PLAYER_HIT_RADIUS);

  return {
    time: 0,
    round: 1,
    phase: 'waves',
    roundClock: 0,
    schedule: roundSchedule(1),
    nextSquad: 0,
    lives: PLAYER_LIVES,
    gameOver: false,
    player,
    bullets: [],
    enemies: [],
    boss: null,
    bursts: [],
    lastId: player.id,
    collisions,
    random,
  };
}

export function nextId(world: World): number {
  world.lastId += 1;

  return world.lastId;
}

export function addBullet(world: World, bullet: Bullet): void {
  world.bullets.push(bullet);
  addCircle(world.collisions, bullet.id, { kind: 'bullet', bullet }, bullet.x, bullet.y, BULLET_HIT_RADIUS);
}

export function addEnemy(world: World, enemy: Enemy): void {
  world.enemies.push(enemy);
  const radius = ENEMY_KINDS[enemy.kind].radius;

  addCircle(world.collisions, enemy.id, { kind: 'enemy', enemy }, enemy.x, enemy.y, radius, ENEMY_ANGLE);
}

export function addBoss(world: World, boss: Boss): void {
  world.boss = boss;
  addCircle(world.collisions, boss.id, { kind: 'boss', boss }, boss.x, boss.y, bossHitRadius(boss), BOSS_ANGLE);
}

export function addBeam(world: World, beam: Beam): void {
  addRectangle(world.collisions, beam.id, { kind: 'beam', beam }, beam.x, beam.y, BEAM_WIDTH, BEAM_LENGTH);
}

export function removeCollider(world: World, id: number): void {
  removeBody(world.collisions, id);
}

export type Place = (id: number, x: number, y: number, angle: number) => void;

/** Visits every entity's centre and angle: 180° for enemy aircraft and the boss, 0 otherwise. */
export function forEachPlacement(world: World, place: Place): void {
  const { player, boss } = world;

  place(player.id, player.x, player.y, 0);
  world.bullets.forEach((bullet) => place(bullet.id, bullet.x, bullet.y, 0));
  world.enemies.forEach((enemy) => place(enemy.id, enemy.x, enemy.y, ENEMY_ANGLE));

  if (boss) {
    place(boss.id, boss.x, boss.y, BOSS_ANGLE);

    if (boss.beam) {
      place(boss.beam.id, boss.beam.x, boss.beam.y, 0);
    }
  }

  world.bursts.forEach((burst) => place(burst.id, burst.x, burst.y, 0));
}
