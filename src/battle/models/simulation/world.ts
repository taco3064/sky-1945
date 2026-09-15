import type { Beam, Boss } from '../boss';
import { BOSS_ANGLE, BEAM_LENGTH, BEAM_WIDTH, bossHitRadius } from '../boss';
import { BULLET_HIT_RADIUS, type Bullet } from '../bullets';
import type { Burst } from '../bursts';
import {
  ENEMY_ANGLE,
  ENEMY_KINDS,
  type Enemy,
  type Squad,
  roundSchedule,
} from '../enemies';
import { PLAYER_HIT_RADIUS, PLAYER_LIVES, type Player, createPlayer } from '../player';
import {
  type Collisions,
  addCircle,
  addRectangle,
  createCollisions,
  removeBody,
} from './collisions';

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

  addCircle(collisions, {
    id: player.id,
    owner: { kind: 'player', player },
    x: player.x,
    y: player.y,
    radius: PLAYER_HIT_RADIUS,
  });

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

  addCircle(world.collisions, {
    id: bullet.id,
    owner: { kind: 'bullet', bullet },
    x: bullet.x,
    y: bullet.y,
    radius: BULLET_HIT_RADIUS,
  });
}

export function addEnemy(world: World, enemy: Enemy): void {
  world.enemies.push(enemy);

  addCircle(world.collisions, {
    id: enemy.id,
    owner: { kind: 'enemy', enemy },
    x: enemy.x,
    y: enemy.y,
    radius: ENEMY_KINDS[enemy.kind].radius,
    angle: ENEMY_ANGLE,
  });
}

export function addBoss(world: World, boss: Boss): void {
  world.boss = boss;

  addCircle(world.collisions, {
    id: boss.id,
    owner: { kind: 'boss', boss },
    x: boss.x,
    y: boss.y,
    radius: bossHitRadius(boss),
    angle: BOSS_ANGLE,
  });
}

export function addBeam(world: World, beam: Beam): void {
  addRectangle(world.collisions, {
    id: beam.id,
    owner: { kind: 'beam', beam },
    x: beam.x,
    y: beam.y,
    width: BEAM_WIDTH,
    height: BEAM_LENGTH,
  });
}

export function removeCollider(world: World, id: number): void {
  removeBody(world.collisions, id);
}

/** An entity's centre and the angle it is drawn at. */
export interface Placement {
  id: number;
  x: number;
  y: number;
  angle: number;
}

export type Place = (placement: Placement) => void;

/** Visits every entity: 180° for enemy aircraft and the boss, 0 otherwise. */
export function forEachPlacement(world: World, place: Place): void {
  const { player, boss } = world;

  const at = ({ id, x, y }: Omit<Placement, 'angle'>, angle = 0) => {
    place({ id, x, y, angle });
  };

  at(player);
  world.bullets.forEach((bullet) => at(bullet));
  world.enemies.forEach((enemy) => at(enemy, ENEMY_ANGLE));

  if (boss) {
    at(boss, BOSS_ANGLE);

    if (boss.beam) {
      at(boss.beam);
    }
  }

  world.bursts.forEach((burst) => at(burst));
}
