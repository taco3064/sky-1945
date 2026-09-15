import { useRef, useState, type PointerEvent } from 'react'
import { PointerGesture, type Vector } from './controls.ts'
import './TouchSteering.css'

type TouchSteeringProps = {
  onDirection: (direction: Vector) => void
  onRoll: () => void
}

/** The full-viewport touch surface and the touch stick it drives. Mouse, pen and touch all steer. */
export function TouchSteering({ onDirection, onRoll }: TouchSteeringProps) {
  const [gesture] = useState(() => new PointerGesture())
  const stickRef = useRef<HTMLDivElement>(null)

  const setKnob = (stick: HTMLElement, { x, y }: Vector) => {
    stick.style.setProperty('--knob-x', `${x}px`)
    stick.style.setProperty('--knob-y', `${y}px`)
  }

  const handleDown = (event: PointerEvent<HTMLDivElement>) => {
    if (gesture.down(event.pointerId, event.clientX, event.clientY, event.timeStamp) === 'roll') {
      onRoll()
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    const stick = stickRef.current as HTMLDivElement
    stick.style.setProperty('--stick-x', `${event.clientX}px`)
    stick.style.setProperty('--stick-y', `${event.clientY}px`)
    setKnob(stick, { x: 0, y: 0 })
    stick.toggleAttribute('data-active', true)
  }

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const steer = gesture.move(event.pointerId, event.clientX, event.clientY)
    if (!steer) return
    setKnob(stickRef.current as HTMLDivElement, steer.knob)
    onDirection(steer.direction)
  }

  const handleEnd = (event: PointerEvent<HTMLDivElement>) => {
    const ended = gesture.up(event.pointerId, event.timeStamp)
    if (!ended) return
    if (ended.roll) onRoll()
    onDirection({ x: 0, y: 0 })
    const stick = stickRef.current as HTMLDivElement
    setKnob(stick, { x: 0, y: 0 })
    stick.toggleAttribute('data-active', false)
  }

  return (
    <>
      <div
        className="touch-surface"
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleEnd}
        onPointerCancel={handleEnd}
      />
      <div className="touch-stick" ref={stickRef}>
        <div className="touch-stick-knob" />
      </div>
    </>
  )
}
