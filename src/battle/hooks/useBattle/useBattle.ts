import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { type BattleStore, createBattleStore } from '~app/battle/models/simulation'
import type { BattleView } from '~app/battle/models/simulation'
import type { Place } from '~app/battle/models/simulation'

export interface Battle {
  store: BattleStore
  view: BattleView
}

/** A fresh run for the lifetime of the calling component, placed once on mount. */
export function useBattle(speedPoints: number, place: Place): Battle {
  const [store] = useState(() => createBattleStore(speedPoints))
  const view = useSyncExternalStore(store.subscribe, store.getSnapshot)

  useLayoutEffect(() => {
    store.forEachPlacement(place)
  }, [store, place])

  return { store, view }
}

/**
 * One simulation step per animation frame while `running` (game-spec 13.1). Each frame
 * commits the new view before placing, so entities created this frame are placed too.
 */
export function useBattleLoop(store: BattleStore, running: boolean, place: Place): void {
  useEffect(() => {
    if (!running) {
      return
    }
    let active = true
    let frame = 0

    const tick = (timestamp: number) => {
      flushSync(() => store.frame(timestamp))
      store.forEachPlacement(place)
      // Committing the view can stop the loop mid-frame (game over).
      if (active) {
        frame = requestAnimationFrame(tick)
      }
    }

    store.resume(performance.now())
    frame = requestAnimationFrame(tick)
    return () => {
      active = false
      cancelAnimationFrame(frame)
    }
  }, [store, running, place])
}
