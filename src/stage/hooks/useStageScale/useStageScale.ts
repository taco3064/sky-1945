import { type RefObject, useEffect } from 'react'
import { FIELD_HEIGHT, FIELD_WIDTH } from '~app/battle/models/field'

/**
 * Writes `--stage-scale = min(width / 540, height / 960)` of the viewport's content box
 * on the viewport, whenever its size changes (game-spec 8.1).
 */
export function useStageScale(viewportRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) {
      return
    }
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      viewport.style.setProperty('--stage-scale', String(Math.min(width / FIELD_WIDTH, height / FIELD_HEIGHT)))
    })
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [viewportRef])
}
