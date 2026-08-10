import { useEffect, useMemo } from 'react';

import { Bullet } from '~app/components/Bullet';
import { Fighter } from '~app/components/Fighter';
import { TouchStick } from '~app/components/TouchStick';
import { GameProvider } from '~app/contexts/GameContext';
import { boostsFromPoints } from '~app/engine/boosts';
import type { LoadoutPoints } from '~app/engine/boosts';
import { createWorld } from '~app/engine/world';
import { useEntityRoster } from '~app/hooks/useEntityRoster';
import { usePlayerCombat } from '~app/hooks/usePlayerCombat';
import { usePlayerInput } from '~app/hooks/usePlayerInput';
import { useStageScale } from '~app/hooks/useStageScale';

import styles from './styles.module.css';

export interface GameStageProps {
  /** The run's allocation. Both boosts are derived here. */
  speedPoints: LoadoutPoints;
  /** Whether the run is paused. The world stops stepping, keeping every body. */
  paused: boolean;
  /** Pause, or resume from paused — Escape and the on-screen button both send it. */
  onPause: () => void;
  /** Abandon the run and go back to the title. Only reachable while paused. */
  onQuit: () => void;
}

/**
 * The field, and the only place the simulation is created and torn down.
 *
 * It mounts the provider itself — containers may, and pages may not, so a
 * screen that needs the world wraps its own subtree rather than reaching up
 * for one.
 *
 * Both boosts are derived here rather than handed in: this is the unit that
 * needs them, so this is the unit that computes them.
 */
export function GameStage({ speedPoints, paused, onPause, onQuit }: GameStageProps) {
  const world = useMemo(() => {
    const { speed, power } = boostsFromPoints(speedPoints);

    return createWorld({
      speedMultiplier: speed.multiplier,
      powerMultiplier: power.multiplier,
    });
  }, [speedPoints]);

  const viewport = useStageScale();
  const { surface, stick } = usePlayerInput(world, onPause);
  const entities = useEntityRoster(world);
  const { rolling } = usePlayerCombat(world);

  useEffect(() => {
    if (paused) {
      world.pause();
    } else {
      world.start();
    }
  }, [world, paused]);

  // Separate from the pause effect on purpose: disposal belongs to the
  // world's lifetime, not to whether it happens to be paused right now.
  useEffect(() => () => world.dispose(), [world]);

  return (
    <GameProvider world={world}>
      <div ref={viewport} className={styles.viewport}>
        <div className={styles.field}>
          {entities.map((entity) => (entity.kind === 'player'
            ? <Fighter key={entity.id} id={entity.id} rolling={rolling} />
            : <Bullet key={entity.id} id={entity.id} />))}
        </div>

        {/* Above the field so it catches every touch, including the margins
            a wide screen leaves either side of the play area. */}
        <div ref={surface} className={styles.surface} />

        <TouchStick ref={stick} />

        <button
          type="button"
          className={styles.pause}
          aria-label={paused ? 'Resume' : 'Pause'}
          onClick={onPause}
        >
          {paused ? '▶' : '❚❚'}
        </button>

        {paused && (
          <div className={styles.paused}>
            <p className={styles.pausedTitle}>PAUSED</p>
            <div className={styles.pausedActions}>
              <button type="button" className={styles.action} onClick={onPause}>
                RESUME
              </button>
              {/* The run's only exit before lives run out (#6). Without it a
                  paused player is not paused, they are stuck. */}
              <button type="button" className={styles.action} onClick={onQuit}>
                QUIT
              </button>
            </div>
          </div>
        )}
      </div>
    </GameProvider>
  );
}
