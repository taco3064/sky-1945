import { useLayoutEffect, useRef, useState } from 'react'
import { speedMultiplier } from '../game/loadout.ts'
import { Simulation } from '../game/simulation.ts'
import { FieldRenderer } from './fieldRenderer.ts'
import { stepSeconds } from './frameTiming.ts'
import { SpeedLines } from './SpeedLines.tsx'
import { useAnimationFrame } from './useAnimationFrame.ts'
import { useStageScale } from './useStageScale.ts'
import './Stage.css'

type StageProps = {
  speedPoints: number
}

/** A fresh run: the scaled field with its entities, driven by the simulation loop. */
export function Stage({ speedPoints }: StageProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const entitiesRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<FieldRenderer | null>(null)
  const [sim] = useState(() => new Simulation(speedPoints))

  useStageScale(viewportRef)

  useLayoutEffect(() => {
    const renderer = new FieldRenderer(entitiesRef.current as HTMLDivElement)
    renderer.render(sim)
    rendererRef.current = renderer
    return () => {
      renderer.destroy()
      rendererRef.current = null
    }
  }, [sim])

  useAnimationFrame(true, (rawMs) => {
    sim.step(stepSeconds(rawMs))
    rendererRef.current?.render(sim)
  })

  return (
    <div className="stage" ref={viewportRef}>
      <div className="stage-field">
        <SpeedLines pace={speedMultiplier(speedPoints)} />
        <div className="stage-entities" ref={entitiesRef} />
      </div>
    </div>
  )
}
