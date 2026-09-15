import { useCallback, useRef, useState } from 'react'
import { useBattle, useBattleLoop } from '~app/battle/hooks/useBattle'
import { TouchStick } from '~app/controls/components/TouchStick'
import { useKeyboardControls } from '~app/controls/hooks/useKeyboardControls'
import { usePointerSteering } from '~app/controls/hooks/usePointerSteering'
import { createPlacementRegistry } from '~app/field/lib/placementRegistry'
import { speedMultiplier } from '~app/loadout/lib/allocation'
import { useStageScale } from '~app/stage/hooks/useStageScale'
import { FieldEntities } from '../FieldEntities'
import { Hud, type StagePhase } from '../Hud'
import { Overlay } from '../Overlay'
import { SpeedLines } from '../SpeedLines'
import './Stage.css'

interface StageProps {
  speedPoints: number
  /** QUIT and TITLE both return to the title screen. */
  onQuit: () => void
}

/** The stage shown while playing, paused and after game over (game-spec 8). Mounting starts a fresh run. */
export function Stage({ speedPoints, onQuit }: StageProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [registry] = useState(createPlacementRegistry)
  const [paused, setPaused] = useState(false)
  const { store, view } = useBattle(speedPoints, registry.place)
  const { gameOver } = view
  const phase: StagePhase = gameOver ? 'gameover' : paused ? 'paused' : 'playing'

  const togglePause = useCallback(() => {
    if (!gameOver) {
      setPaused((current) => !current)
    }
  }, [gameOver])

  useStageScale(viewportRef)
  useBattleLoop(store, phase === 'playing', registry.place)
  useKeyboardControls({ onSteer: store.steer, onRoll: store.roll, onPause: togglePause })
  const { stickRef, ...touchSurface } = usePointerSteering({ onSteer: store.steer, onRoll: store.roll })

  return (
    <div className="stage" ref={viewportRef}>
      <div className="stage__field">
        <SpeedLines pace={speedMultiplier(speedPoints)} />
        <FieldEntities view={view} register={registry.register} />
      </div>
      <div className="stage__touch" {...touchSurface} />
      <TouchStick ref={stickRef} />
      {phase === 'paused' && (
        <Overlay
          title="PAUSED"
          actions={[
            { label: 'RESUME', onClick: () => setPaused(false) },
            { label: 'QUIT', onClick: onQuit },
          ]}
        />
      )}
      {phase === 'gameover' && <Overlay title="GAME OVER" reached={view.round} actions={[{ label: 'TITLE', onClick: onQuit }]} />}
      <Hud
        lives={view.lives}
        round={view.round}
        boss={view.boss}
        fps={view.fps}
        worst={view.worst}
        phase={phase}
        onPause={togglePause}
      />
    </div>
  )
}
