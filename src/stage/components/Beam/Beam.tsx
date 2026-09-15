import type { Ref } from 'react'
import './Beam.css'

interface BeamProps {
  ref?: Ref<HTMLDivElement>
}

/** The boss beam, 88 × 1000 u (game-spec 10.3). `ref` is the placed mount. */
export function Beam({ ref }: BeamProps) {
  return (
    <div ref={ref} className="beam">
      <div className="beam__core" />
    </div>
  )
}
