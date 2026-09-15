import { memo, useCallback } from 'react'
import type { BattleView } from '~app/battle/models/simulation'
import type { BossAttack } from '~app/battle/models/boss'
import type { BossPose } from '~app/battle/models/boss'
import { Beam } from '../Beam'
import { BossCraft } from '../BossCraft'
import { Bullet } from '../Bullet'
import type { BulletSide } from '~app/battle/models/bullets'
import { Burst } from '../Burst'
import type { BurstSize, BurstTone } from '~app/battle/models/bursts'
import { EnemyCraft } from '../EnemyCraft'
import type { EnemyKind } from '~app/battle/models/enemies'
import type { PlacementRegistry } from '~app/stage/models/placement'
import { AllyCraft } from '../AllyCraft'

type Register = PlacementRegistry['register']

interface Placed {
  id: number
  register: Register
}

/** A stable ref that registers the entity's outer element for placement. */
function usePlacedRef(id: number, register: Register) {
  return useCallback((element: HTMLDivElement | null) => register(id, element), [id, register])
}

const PlacedAlly = memo(function PlacedAlly({ id, register, ...state }: Placed & { rolling: boolean; protected: boolean; spent: boolean }) {
  const ref = usePlacedRef(id, register)
  return <AllyCraft ref={ref} {...state} />
})

const PlacedBullet = memo(function PlacedBullet({ id, register, side }: Placed & { side: BulletSide }) {
  const ref = usePlacedRef(id, register)
  return <Bullet ref={ref} side={side} />
})

const PlacedEnemy = memo(function PlacedEnemy({ id, register, kind }: Placed & { kind: EnemyKind }) {
  const ref = usePlacedRef(id, register)
  return <EnemyCraft ref={ref} kind={kind} />
})

const PlacedBoss = memo(function PlacedBoss({ id, register, ...boss }: Placed & { size: number; pose: BossPose; move: BossAttack | null }) {
  const ref = usePlacedRef(id, register)
  return <BossCraft ref={ref} {...boss} />
})

const PlacedBeam = memo(function PlacedBeam({ id, register }: Placed) {
  const ref = usePlacedRef(id, register)
  return <Beam ref={ref} />
})

const PlacedBurst = memo(function PlacedBurst({ id, register, tone, size }: Placed & { tone: BurstTone; size: BurstSize }) {
  const ref = usePlacedRef(id, register)
  return <Burst ref={ref} tone={tone} size={size} />
})

interface FieldEntitiesProps {
  view: BattleView
  register: Register
}

/** Every entity in field paint order, each group in order of creation (game-spec 8.3). */
export function FieldEntities({ view, register }: FieldEntitiesProps) {
  const { player, boss, beam } = view
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
        <PlacedBoss key={boss.id} id={boss.id} register={register} size={boss.size} pose={boss.pose} move={boss.move} />
      )}
      {beam && <PlacedBeam key={beam.id} id={beam.id} register={register} />}
      {view.bursts.map(({ id, tone, size }) => (
        <PlacedBurst key={id} id={id} register={register} tone={tone} size={size} />
      ))}
    </>
  )
}
