import type { Point } from '../field'
import { tryRoll } from '../player'
import { createFrameMeter, recordFrame } from './frameMeter'
import { stepDuration, stepWorld } from './step'
import { type BattleView, buildView } from './view'
import { type Place, createWorld, forEachPlacement } from './world'

export interface BattleStore {
  subscribe(listener: () => void): () => void
  getSnapshot(): BattleView
  /** Starting or resuming: the next frame measures from `now`. */
  resume(now: number): void
  /** One animation frame: one simulation step, then the frame meter. */
  frame(timestamp: number): void
  /** The latest input direction, keyboard or pointer. */
  steer(direction: Point): void
  /** Attempts a barrel roll; it shows at once when it starts. */
  roll(): void
  /** Visits every entity's centre and angle. */
  forEachPlacement(place: Place): void
}

/** A fresh run with `speedPoints` on SPEED. */
export function createBattleStore(speedPoints: number, random: () => number = Math.random): BattleStore {
  const world = createWorld(speedPoints, random)
  const meter = createFrameMeter()
  const listeners = new Set<() => void>()
  let view = buildView(world, meter, null)
  let previousTimestamp = 0

  const publish = () => {
    const next = buildView(world, meter, view)
    if (next !== view) {
      view = next
      listeners.forEach((listener) => listener())
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot: () => view,
    resume(now) {
      previousTimestamp = now
    },
    frame(timestamp) {
      const frameMs = timestamp - previousTimestamp
      previousTimestamp = timestamp
      stepWorld(world, stepDuration(frameMs))
      recordFrame(meter, Math.max(0, frameMs))
      publish()
    },
    steer(direction) {
      world.player.direction = direction
    },
    roll() {
      if (tryRoll(world.player, world.time)) {
        publish()
      }
    },
    forEachPlacement(place) {
      forEachPlacement(world, place)
    },
  }
}
