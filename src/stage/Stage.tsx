import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { speedMultiplier } from '../game/loadout.ts'
import { Simulation } from '../game/simulation.ts'
import { FieldRenderer } from './fieldRenderer.ts'
import { FrameMeter, stepSeconds, type FrameReading } from './frameTiming.ts'
import { Hud } from './Hud.tsx'
import { readHud, sameHud } from './hudState.ts'
import { Overlay } from './Overlay.tsx'
import { SpeedLines } from './SpeedLines.tsx'
import { useAnimationFrame } from './useAnimationFrame.ts'
import { useStageScale } from './useStageScale.ts'
import './Stage.css'

type StageProps = {
  speedPoints: number
  /** QUIT or TITLE: back to the title screen. */
  onExit: () => void
}

type Phase = 'playing' | 'paused' | 'gameover'

function togglePhase(phase: Phase): Phase {
  if (phase === 'playing') return 'paused'
  if (phase === 'paused') return 'playing'
  return phase
}

/** A fresh run: the scaled field, HUD and overlays, driven by the simulation loop while playing. */
export function Stage({ speedPoints, onExit }: StageProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const entitiesRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<FieldRenderer | null>(null)
  const [sim] = useState(() => new Simulation(speedPoints))
  const [meter] = useState(() => new FrameMeter())
  const [phase, setPhase] = useState<Phase>('playing')
  const [hud, setHud] = useState(() => readHud(sim))
  const [frameReading, setFrameReading] = useState<FrameReading | null>(null)
  const hudRef = useRef(hud)

  const togglePause = () => setPhase(togglePhase)

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPhase(togglePhase)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useAnimationFrame(phase === 'playing', (rawMs) => {
    sim.step(stepSeconds(rawMs))
    rendererRef.current?.render(sim)

    const next = readHud(sim)
    if (!sameHud(next, hudRef.current)) {
      hudRef.current = next
      setHud(next)
    }
    const reading = meter.add(rawMs)
    if (reading) setFrameReading(reading)
    if (sim.lives <= 0) setPhase('gameover')
  })

  return (
    <div className="stage" ref={viewportRef}>
      <div className="stage-field">
        <SpeedLines pace={speedMultiplier(speedPoints)} />
        <div className="stage-entities" ref={entitiesRef} />
      </div>
      {phase === 'paused' && <Overlay kind="paused" onResume={togglePause} onQuit={onExit} />}
      {phase === 'gameover' && <Overlay kind="gameover" round={hud.round} onTitle={onExit} />}
      <Hud hud={hud} frameReading={frameReading} phase={phase} onTogglePause={togglePause} />
    </div>
  )
}
