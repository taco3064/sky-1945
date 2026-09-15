import { useCallback, useRef, useState } from 'react';
import { useBattle, useBattleLoop } from '~app/battle/hooks/useBattle';
import { TouchStick } from '~app/stage/components/TouchStick';
import { useKeyboardControls } from '~app/stage/hooks/useKeyboardControls';
import { usePointerSteering } from '~app/stage/hooks/usePointerSteering';
import { createPlacementRegistry } from '~app/stage/models/placement';
import { speedMultiplier } from '~app/loadout/models/allocation';
import { useStageScale } from '~app/stage/hooks/useStageScale';
import { FieldEntities } from '~app/stage/components/FieldEntities';
import { Hud, type StagePhase } from '~app/stage/components/Hud';
import { Overlay } from '~app/stage/components/Overlay';
import { SpeedLines } from '~app/stage/components/SpeedLines';
import './Stage.css';

interface StageProps {
  speedPoints: number;
  /** QUIT and TITLE both return to the title screen. */
  onQuit: () => void;
}

/**
 * The stage shown while playing, paused and after game over (game-spec 8). Mounting
 * starts a fresh run.
 */
export function Stage({ speedPoints, onQuit }: StageProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [registry] = useState(createPlacementRegistry);
  const [paused, setPaused] = useState(false);
  const { store, view } = useBattle(speedPoints, registry.place);
  const { steer: onSteer, roll: onRoll } = store;
  const { gameOver } = view;
  const phase: StagePhase = gameOver ? 'gameover' : paused ? 'paused' : 'playing';

  const togglePause = useCallback(() => {
    if (!gameOver) {
      setPaused((current) => !current);
    }
  }, [gameOver]);

  // X and the PULSE button do nothing while paused or after game over (PULSE DRIVE 3).
  const attemptPulse = useCallback(() => {
    if (phase === 'playing') {
      store.pulse();
    }
  }, [phase, store]);

  useStageScale(viewportRef);
  useBattleLoop(store, phase === 'playing', registry.place);
  useKeyboardControls({ onSteer, onRoll, onPause: togglePause, onPulse: attemptPulse });
  const { stickRef, ...touchSurface } = usePointerSteering({ onSteer, onRoll });

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
      {phase === 'gameover' && (
        <Overlay
          title="GAME OVER"
          reached={view.round}
          actions={[{ label: 'TITLE', onClick: onQuit }]}
        />
      )}
      <Hud
        lives={view.lives}
        round={view.round}
        boss={view.boss}
        fps={view.fps}
        worst={view.worst}
        energy={view.energy}
        phase={phase}
        onPause={togglePause}
        onPulse={attemptPulse}
      />
    </div>
  );
}
