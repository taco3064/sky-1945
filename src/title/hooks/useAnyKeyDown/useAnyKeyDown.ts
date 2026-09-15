import { useEffect } from 'react'

/** Calls `onKeyDown` for every keydown anywhere, auto-repeat and modifiers included. */
export function useAnyKeyDown(onKeyDown: () => void): void {
  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onKeyDown])
}
