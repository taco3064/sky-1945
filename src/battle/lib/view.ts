import type { BossAttack } from './attackOrder'
import type { BossPose } from './boss'
import type { BulletSide } from './bullet'
import type { BurstSize, BurstTone } from './burst'
import type { EnemyKind } from './kinds'
import { isProtected, isRolling, isSpent } from './player'
import type { World } from './world'

export interface PlayerView {
  readonly id: number
  readonly rolling: boolean
  readonly protected: boolean
  readonly spent: boolean
}

export interface BossView {
  readonly id: number
  readonly size: number
  readonly hp: number
  readonly maxHp: number
  readonly pose: BossPose
  /** Absent while entering. */
  readonly move: BossAttack | null
}

/** What the screen shows; replaced only when something in it changed. */
export interface BattleView {
  readonly lives: number
  readonly round: number
  readonly gameOver: boolean
  readonly player: PlayerView
  readonly bullets: readonly { readonly id: number; readonly side: BulletSide }[]
  readonly enemies: readonly { readonly id: number; readonly kind: EnemyKind }[]
  readonly boss: BossView | null
  readonly beam: { readonly id: number } | null
  readonly bursts: readonly { readonly id: number; readonly tone: BurstTone; readonly size: BurstSize }[]
  /** 0 until the first frame-meter window closes. */
  readonly fps: number
  readonly worst: number
}

export interface FrameReadings {
  fps: number
  worst: number
}

/** The view of `world`, reusing `previous` and every unchanged part of it. */
export function buildView(world: World, readings: FrameReadings, previous: BattleView | null): BattleView {
  const { player, boss } = world
  const playerView: PlayerView = {
    id: player.id,
    rolling: isRolling(player, world.time),
    protected: isProtected(player, world.time),
    spent: isSpent(player, world.time),
  }
  const bossView: BossView | null = boss && {
    id: boss.id,
    size: boss.size,
    hp: boss.hp,
    maxHp: boss.maxHp,
    pose: boss.pose,
    move: boss.pose === 'entering' ? null : boss.attack,
  }
  const beamView = boss?.beam ? { id: boss.beam.id } : null

  const next: BattleView = {
    lives: world.lives,
    round: world.round,
    gameOver: world.gameOver,
    player: previous && sameFields(previous.player, playerView) ? previous.player : playerView,
    bullets: sameList(previous?.bullets, world.bullets),
    enemies: sameList(previous?.enemies, world.enemies),
    boss: previous && sameFields(previous.boss, bossView) ? previous.boss : bossView,
    beam: previous && sameFields(previous.beam, beamView) ? previous.beam : beamView,
    bursts: sameList(previous?.bursts, world.bursts),
    fps: readings.fps,
    worst: readings.worst,
  }
  return previous && sameFields(previous, next) ? previous : next
}

/** The previous list when it holds the same entities in the same order, else a copy. */
function sameList<T extends { id: number }>(previous: readonly T[] | undefined, current: readonly T[]): readonly T[] {
  if (previous && previous.length === current.length && previous.every((entity, index) => entity.id === current[index].id)) {
    return previous
  }
  return current.slice()
}

function sameFields<T extends object>(previous: T | null, next: T | null): boolean {
  if (previous === null || next === null) {
    return previous === next
  }
  return (Object.keys(next) as (keyof T)[]).every((key) => previous[key] === next[key])
}
