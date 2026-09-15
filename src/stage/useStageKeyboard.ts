import { useEffect, useEffectEvent } from 'react'
import { arrowsDirection, isArrowKey, type Vector } from './controls.ts'

type StageKeyboard = {
  onDirection: (direction: Vector) => void
  onRoll: () => void
  onTogglePause: () => void
}

/** Stage keys while the stage is shown: arrows steer, Space rolls, Escape toggles pause. */
export function useStageKeyboard({ onDirection, onRoll, onTogglePause }: StageKeyboard): void {
  const handleKeyDown = useEffectEvent((event: KeyboardEvent, held: Set<string>) => {
    if (isArrowKey(event.key)) {
      event.preventDefault()
      held.add(event.key)
      onDirection(arrowsDirection(held))
    } else if (event.key === ' ') {
      event.preventDefault()
      onRoll()
    } else if (event.key === 'Escape') {
      onTogglePause()
    }
  })

  const handleKeyUp = useEffectEvent((event: KeyboardEvent, held: Set<string>) => {
    if (!isArrowKey(event.key)) return
    event.preventDefault()
    held.delete(event.key)
    onDirection(arrowsDirection(held))
  })

  const handleBlur = useEffectEvent((held: Set<string>) => {
    held.clear()
    onDirection({ x: 0, y: 0 })
  })

  useEffect(() => {
    const held = new Set<string>()
    const keyDown = (event: KeyboardEvent) => handleKeyDown(event, held)
    const keyUp = (event: KeyboardEvent) => handleKeyUp(event, held)
    const blur = () => handleBlur(held)

    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', blur)
    }
  }, [])
}
