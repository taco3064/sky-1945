import { useEffect, useEffectEvent } from 'react'

/**
 * Calls `onFrame` once per animation frame while `active`, with the raw milliseconds since the
 * previous frame. Starting (or resuming) measures from `performance.now()`, so a pause never causes a jump.
 */
export function useAnimationFrame(active: boolean, onFrame: (rawMs: number) => void): void {
  const frame = useEffectEvent(onFrame)

  useEffect(() => {
    if (!active) return

    let previous = performance.now()
    let handle = requestAnimationFrame(function tick(timestamp) {
      const rawMs = timestamp - previous
      previous = timestamp
      frame(rawMs)
      handle = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(handle)
  }, [active])
}
