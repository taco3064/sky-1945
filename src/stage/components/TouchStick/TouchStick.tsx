import type { Ref } from 'react'
import './TouchStick.css'

interface TouchStickProps {
  ref?: Ref<HTMLDivElement>
}

/** The touch stick ring and knob, in screen px (game-spec 8.8). */
export function TouchStick({ ref }: TouchStickProps) {
  return (
    <div ref={ref} className="touch-stick">
      <div className="touch-stick__knob" />
    </div>
  )
}
