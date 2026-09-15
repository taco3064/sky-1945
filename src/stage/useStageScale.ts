import { useLayoutEffect, type RefObject } from 'react'
import { fieldScale } from './placement.ts'

/** Keeps `--stage-scale` on the viewport fitted to its content box as it resizes. */
export function useStageScale(viewportRef: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      viewport.style.setProperty('--stage-scale', String(fieldScale(width, height)))
    })
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [viewportRef])
}
