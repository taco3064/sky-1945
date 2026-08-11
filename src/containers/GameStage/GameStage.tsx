import { useEffect, useState } from 'react';

import { boostsFromPoints } from '~app/engine/boosts';
import { createWorld } from '~app/engine/world';
import type { World } from '~app/engine/world';

import { Field } from './field';
import styles from './styles.module.css';
import type { GameStageProps } from './types';

/** Owns the simulation's lifetime. One world per mount, built inside the effect. */
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

  // One frame of empty field before the world exists.
  if (!world) {
    return <div className={styles.viewport} />;
  }

  // The streaks travel at the same number the pilot flies at.
  const { speed } = boostsFromPoints(speedPoints);

  return <Field world={world} pace={speed.multiplier} {...rest} />;
}
