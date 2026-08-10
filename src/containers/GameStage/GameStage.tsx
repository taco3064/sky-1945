import { useEffect, useMemo } from 'react';

import { Fighter } from '~app/components/Fighter';
import { boostsFromPoints } from '~app/engine/boosts';
import type { LoadoutPoints } from '~app/engine/boosts';
import { createWorld } from '~app/engine/world';
import { GameProvider } from '~app/contexts/GameContext';
import { usePlayerInput } from '~app/hooks/usePlayerInput';
import { useStageScale } from '~app/hooks/useStageScale';

import styles from './styles.module.css';

export interface GameStageProps {
  /** The run's allocation. The speed boost is derived here. */
  speedPoints: LoadoutPoints;
}

/**
 * The field, and the only place the simulation is created and torn down.
 *
 * It mounts the provider itself — containers may, and pages may not, so a
 * screen that needs the world wraps its own subtree rather than reaching up
 * for one.
 *
 * The boost is derived here rather than handed in: this is the unit that
 * needs it, so this is the unit that computes it.
 */
export function GameStage({ speedPoints }: GameStageProps) {
  const world = useMemo(() => {
    const { speed } = boostsFromPoints(speedPoints);

    return createWorld({ speedMultiplier: speed.multiplier });
  }, [speedPoints]);

  const viewport = useStageScale();

  usePlayerInput(world);

  useEffect(() => {
    world.start();

    return () => world.dispose();
  }, [world]);

  return (
    <GameProvider world={world}>
      <div ref={viewport} className={styles.viewport}>
        <div className={styles.field}>
          <Fighter id={world.playerId} />
        </div>
      </div>
    </GameProvider>
  );
}
