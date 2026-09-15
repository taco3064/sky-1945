import { memo, useCallback } from 'react';
import type {
  BattleView,
  BossView,
  BurstView,
  PlayerView,
} from '~app/battle/models/simulation';
import { Beam } from '../Beam';
import { BossCraft } from '../BossCraft';
import { Bullet } from '../Bullet';
import type { BulletSide } from '~app/battle/models/bullets';
import { Burst } from '../Burst';
import { EnemyCraft } from '../EnemyCraft';
import type { EnemyKind } from '~app/battle/models/enemies';
import type { PlacementRegistry } from '~app/stage/models/placement';
import { AllyCraft } from '../AllyCraft';
import { Pulse } from '../Pulse';

type Register = PlacementRegistry['register'];

interface Placed {
  id: number;
  register: Register;
}

type AllyProps = Placed & Omit<PlayerView, 'id'>;
type BulletProps = Placed & { side: BulletSide };
type EnemyProps = Placed & { kind: EnemyKind };
type BossProps = Placed & Pick<BossView, 'size' | 'pose' | 'move'>;
type BurstProps = Placed & Omit<BurstView, 'id'>;

/** A stable ref that registers the entity's outer element for placement. */
function usePlacedRef(id: number, register: Register) {
  return useCallback(
    (element: HTMLDivElement | null) => register(id, element),
    [id, register],
  );
}

const PlacedAlly = memo(function PlacedAlly({ id, register, ...state }: AllyProps) {
  const ref = usePlacedRef(id, register);

  return <AllyCraft ref={ref} {...state} />;
});

const PlacedBullet = memo(function PlacedBullet({ id, register, side }: BulletProps) {
  const ref = usePlacedRef(id, register);

  return <Bullet ref={ref} side={side} />;
});

const PlacedEnemy = memo(function PlacedEnemy({ id, register, kind }: EnemyProps) {
  const ref = usePlacedRef(id, register);

  return <EnemyCraft ref={ref} kind={kind} />;
});

const PlacedBoss = memo(function PlacedBoss({ id, register, ...boss }: BossProps) {
  const ref = usePlacedRef(id, register);

  return <BossCraft ref={ref} {...boss} />;
});

const PlacedBeam = memo(function PlacedBeam({ id, register }: Placed) {
  const ref = usePlacedRef(id, register);

  return <Beam ref={ref} />;
});

const PlacedPulse = memo(function PlacedPulse({ id, register }: Placed) {
  const ref = usePlacedRef(id, register);

  return <Pulse ref={ref} />;
});

const PlacedBurst = memo(function PlacedBurst({ id, register, tone, size }: BurstProps) {
  const ref = usePlacedRef(id, register);

  return <Burst ref={ref} tone={tone} size={size} />;
});

interface FieldEntitiesProps {
  view: BattleView;
  register: Register;
}

/**
 * Every entity in field paint order, each group in order of creation (game-spec 8.3).
 * The Pulse covers the aircraft, bullets and beam; bursts still cover everything
 * (PULSE DRIVE 10).
 */
export function FieldEntities({ view, register }: FieldEntitiesProps) {
  const { player, boss, beam, pulse } = view;

  return (
    <>
      <PlacedAlly
        id={player.id}
        register={register}
        rolling={player.rolling}
        protected={player.protected}
        spent={player.spent}
      />
      {view.bullets.map(({ id, side }) => (
        <PlacedBullet key={id} id={id} register={register} side={side} />
      ))}
      {view.enemies.map(({ id, kind }) => (
        <PlacedEnemy key={id} id={id} register={register} kind={kind} />
      ))}
      {boss && (
        <PlacedBoss
          key={boss.id}
          id={boss.id}
          register={register}
          size={boss.size}
          pose={boss.pose}
          move={boss.move}
        />
      )}
      {beam && <PlacedBeam key={beam.id} id={beam.id} register={register} />}
      {pulse && <PlacedPulse key={pulse.id} id={pulse.id} register={register} />}
      {view.bursts.map(({ id, tone, size }) => (
        <PlacedBurst key={id} id={id} register={register} tone={tone} size={size} />
      ))}
    </>
  );
}
