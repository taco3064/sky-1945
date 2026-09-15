import type { Boss, BossAttack, BossPose } from '../boss';
import type { BulletSide } from '../bullets';
import type { BurstSize, BurstTone } from '../bursts';
import type { EnemyKind } from '../enemies';
import { isProtected, isRolling, isSpent } from '../player';
import type { World } from './world';

export interface PlayerView {
  readonly id: number;
  readonly rolling: boolean;
  readonly protected: boolean;
  readonly spent: boolean;
}

export interface BossView {
  readonly id: number;
  readonly size: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly pose: BossPose;
  /** Absent while entering. */
  readonly move: BossAttack | null;
}

export interface BurstView {
  readonly id: number;
  readonly tone: BurstTone;
  readonly size: BurstSize;
}

/** What the screen shows; replaced only when something in it changed. */
export interface BattleView {
  readonly lives: number;
  readonly round: number;
  readonly gameOver: boolean;
  readonly player: PlayerView;
  readonly bullets: readonly { readonly id: number; readonly side: BulletSide }[];
  readonly enemies: readonly { readonly id: number; readonly kind: EnemyKind }[];
  readonly boss: BossView | null;
  readonly beam: { readonly id: number } | null;
  readonly bursts: readonly BurstView[];
  /** 0 until the first frame-meter window closes. */
  readonly fps: number;
  readonly worst: number;
}

export interface FrameReadings {
  fps: number;
  worst: number;
}

/** The view of `world`, reusing `previous` and every unchanged part of it. */
export function buildView(
  world: World,
  readings: FrameReadings,
  previous: BattleView | null,
): BattleView {
  const next: BattleView = {
    lives: world.lives,
    round: world.round,
    gameOver: world.gameOver,
    player: keep(previous?.player, playerView(world)),
    bullets: sameList(previous?.bullets, world.bullets),
    enemies: sameList(previous?.enemies, world.enemies),
    boss: keep(previous?.boss, bossView(world.boss)),
    beam: keep(previous?.beam, beamView(world.boss)),
    bursts: sameList(previous?.bursts, world.bursts),
    fps: readings.fps,
    worst: readings.worst,
  };

  return keep(previous ?? undefined, next);
}

function playerView({ player, time }: World): PlayerView {
  return {
    id: player.id,
    rolling: isRolling(player, time),
    protected: isProtected(player, time),
    spent: isSpent(player, time),
  };
}

function bossView(boss: Boss | null): BossView | null {
  return boss && {
    id: boss.id,
    size: boss.size,
    hp: boss.hp,
    maxHp: boss.maxHp,
    pose: boss.pose,
    move: boss.pose === 'entering' ? null : boss.attack,
  };
}

function beamView(boss: Boss | null): { id: number } | null {
  return boss?.beam ? { id: boss.beam.id } : null;
}

/** The previous value when it has the same fields, else the next one. */
function keep<T extends object | null>(previous: T | undefined, next: T): T {
  return previous !== undefined && sameFields(previous, next) ? previous : next;
}

/** The previous list when it holds the same entities in the same order, else a copy. */
function sameList<T extends { id: number }>(
  previous: readonly T[] | undefined,
  current: readonly T[],
): readonly T[] {
  const unchanged = previous?.length === current.length
    && previous.every((entity, index) => entity.id === current[index].id);

  return unchanged ? previous : current.slice();
}

function sameFields<T extends object>(previous: T | null, next: T | null): boolean {
  if (previous === null || next === null) {
    return previous === next;
  }

  return (Object.keys(next) as (keyof T)[]).every((key) => previous[key] === next[key]);
}
