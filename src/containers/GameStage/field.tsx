import { useEffect } from 'react';

import { Bullet } from '~app/components/Bullet';
import { Burst } from '~app/components/Burst';
import { Enemy } from '~app/components/Enemy';
import type { EnemyVariant } from '~app/components/Enemy';
import { Fighter } from '~app/components/Fighter';
import { LifeIcon } from '~app/components/LifeIcon';
import { TouchStick } from '~app/components/TouchStick';
import { GameProvider } from '~app/contexts/GameContext';
import type { CombatSnapshot } from '~app/engine/combat';
import type { EntityKind, EntityRecord, World } from '~app/engine/world';
import { useEntityRoster } from '~app/hooks/useEntityRoster';
import { useGameRound } from '~app/hooks/useGameRound';
import { useLives } from '~app/hooks/useLives';
import { usePlayerCombat } from '~app/hooks/usePlayerCombat';
import { usePlayerInput } from '~app/hooks/usePlayerInput';
import { useStageScale } from '~app/hooks/useStageScale';

import styles from './styles.module.css';

/** Which silhouette an enemy kind draws with. */
const VARIANTS: Record<string, EnemyVariant> = {
  'enemy-small': 'small',
  'enemy-medium': 'medium',
  'enemy-large': 'large',
};

function variantFor(kind: EntityKind): EnemyVariant {
  return VARIANTS[kind];
}

/** Which component draws a roster entry. */
function draw(entity: EntityRecord, combat: CombatSnapshot) {
  if (entity.kind === 'player') {
    return (
      <Fighter
        key={entity.id}
        id={entity.id}
        rolling={combat.rolling}
        invulnerable={combat.invulnerable}
      />
    );
  }

  if (entity.kind === 'player-bullet' || entity.kind === 'enemy-bullet') {
    return (
      <Bullet key={entity.id} id={entity.id} hostile={entity.kind === 'enemy-bullet'} />
    );
  }

  if (entity.kind === 'burst' && entity.burst) {
    return (
      <Burst
        key={entity.id}
        id={entity.id}
        size={entity.burst.size}
        tone={entity.burst.tone}
      />
    );
  }

  return <Enemy key={entity.id} id={entity.id} variant={variantFor(entity.kind)} />;
}

/** Where the run is, as one value rather than a pile of booleans. */
export type StagePhase = 'playing' | 'paused' | 'gameover';

export interface FieldProps {
  /** A world that is already built and is this component's for its lifetime. */
  world: World;
  phase: StagePhase;
  onPause: () => void;
  onQuit: () => void;
  onGameOver: () => void;
}

/**
 * Everything that watches a running world.
 *
 * Split from the stage so that every hook in here can take a `World` rather
 * than a `World | null` — the stage cannot create one during render (see the
 * note there), so something has to exist that only mounts once there is one.
 */
export function Field({ world, phase, onPause, onQuit, onGameOver }: FieldProps) {
  const viewport = useStageScale();
  const { surface, stick } = usePlayerInput(world, onPause);
  const entities = useEntityRoster(world);
  const combat = usePlayerCombat(world);
  const round = useGameRound(world);
  const lives = useLives(world, onGameOver);

  useEffect(() => {
    if (phase === 'playing') {
      world.start();
    } else {
      world.pause();
    }
  }, [world, phase]);

  return (
    <GameProvider world={world}>
      <div ref={viewport} className={styles.viewport}>
        <div className={styles.field}>
          {entities.map((entity) => draw(entity, combat))}
        </div>

        <div className={styles.lives}>
          {Array.from({ length: lives }, (_unused, index) => <LifeIcon key={index} />)}
        </div>

        <p className={styles.round}>{`ROUND ${round}`}</p>

        {/* Above the field so it catches every touch, including the margins
            a wide screen leaves either side of the play area. */}
        <div ref={surface} className={styles.surface} />

        <TouchStick ref={stick} />

        {phase !== 'gameover' && (
          <button
            type="button"
            className={styles.pause}
            aria-label={phase === 'paused' ? 'Resume' : 'Pause'}
            onClick={onPause}
          >
            {phase === 'paused' ? '▶' : '❚❚'}
          </button>
        )}

        {phase === 'paused' && (
          <div className={styles.overlay}>
            <p className={styles.overlayTitle}>PAUSED</p>
            <div className={styles.overlayActions}>
              <button type="button" className={styles.action} onClick={onPause}>
                RESUME
              </button>
              <button type="button" className={styles.action} onClick={onQuit}>
                QUIT
              </button>
            </div>
          </div>
        )}

        {phase === 'gameover' && (
          <div className={styles.overlay}>
            <p className={styles.overlayTitle}>GAME OVER</p>
            <p className={styles.reached}>{`REACHED ROUND ${round}`}</p>
            <div className={styles.overlayActions}>
              <button type="button" className={styles.action} onClick={onQuit}>
                TITLE
              </button>
            </div>
          </div>
        )}
      </div>
    </GameProvider>
  );
}
