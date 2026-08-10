import { useEffect, useState } from 'react';

import { boostsFromPoints } from '~app/engine/boosts';
import type { LoadoutPoints } from '~app/engine/boosts';
import { createWorld } from '~app/engine/world';
import type { World } from '~app/engine/world';

import { Field } from './field';
import type { StagePhase } from './field';
import styles from './styles.module.css';

export interface GameStageProps {
  /** The run's allocation. Both boosts are derived here. */
  speedPoints: LoadoutPoints;
  /** Playing, paused, or finished. Anything but `playing` stops the world. */
  phase: StagePhase;
  /** Pause, or resume from paused. */
  onPause: () => void;
  /** Leave the run for the title screen. */
  onQuit: () => void;
  /** The last life is gone. */
  onGameOver: () => void;
}

/**
 * Owns the simulation's lifetime, and nothing else.
 *
 * The world is created **inside an effect** rather than in a `useMemo`, and
 * that distinction was a real bug rather than a preference. A `useMemo` builds
 * one world and hands the same one to every mount, while StrictMode
 * deliberately mounts twice: the first cleanup called `dispose()`, whose
 * `Engine.clear()` empties Matter's collision detector, and the second mount
 * restarted that same world. The detector is only rebuilt when bodies are added
 * or removed, so it stayed empty — positions kept updating, because the engine
 * writes those itself, and **nothing ever collided again**. It reproduced on
 * every page load, which is precisely the class of bug StrictMode exists to
 * surface.
 *
 * So each mount builds its own world and disposes its own world, and `dispose`
 * gets to mean what it says.
 */
export function GameStage({ speedPoints, ...rest }: GameStageProps) {
  const [world, setWorld] = useState<World | null>(null);

  useEffect(() => {
    const { speed, power } = boostsFromPoints(speedPoints);

    const created = createWorld({
      speedMultiplier: speed.multiplier,
      powerMultiplier: power.multiplier,
    });

    setWorld(created);

    return () => {
      created.dispose();
      setWorld(null);
    };
  }, [speedPoints]);

  // One frame of empty field before the world exists. The alternative — a world
  // built during render — is the bug described above.
  if (!world) {
    return <div className={styles.viewport} />;
  }

  return <Field world={world} {...rest} />;
}
